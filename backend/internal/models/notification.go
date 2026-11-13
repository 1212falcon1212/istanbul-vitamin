package models

import (
	"fmt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

// NotificationEvent is written in the same transaction as the business change.
type NotificationEvent struct {
	ID          uint64    `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"size:190;uniqueIndex" json:"key"`
	Kind        string    `gorm:"size:60" json:"kind"`
	OrderID     uint64    `json:"order_id"`
	ReferenceID uint64    `json:"reference_id"`
	Expanded    bool      `gorm:"index" json:"expanded"`
	CreatedAt   time.Time `json:"created_at"`
}
type NotificationDelivery struct {
	ExpiresAt   *time.Time `json:"-"`
	ID          uint64     `gorm:"primaryKey" json:"id"`
	Key         string     `gorm:"size:190;uniqueIndex" json:"-"`
	EventID     uint64     `gorm:"index" json:"event_id"`
	Channel     string     `gorm:"size:10" json:"channel"`
	Recipient   string     `gorm:"size:255" json:"-"`
	UserID      *uint64    `json:"-"`
	Marketing   bool       `json:"marketing"`
	Title       string     `gorm:"size:200" json:"title"`
	Body        string     `gorm:"type:text" json:"-"`
	Path        string     `gorm:"size:500" json:"-"`
	Status      string     `gorm:"size:20;index" json:"status"`
	Attempts    int        `json:"attempts"`
	AvailableAt time.Time  `gorm:"index" json:"available_at"`
	LastError   string     `gorm:"size:100" json:"last_error"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func QueueNotification(tx *gorm.DB, key, kind string, orderID, ref uint64) error {
	return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&NotificationEvent{Key: key, Kind: kind, OrderID: orderID, ReferenceID: ref}).Error
}
func (h *OrderStatusHistory) AfterCreate(tx *gorm.DB) error {
	kind := ""
	if h.OldStatus == "" {
		kind = "order_received"
	} else if h.OldStatus != h.NewStatus {
		switch h.NewStatus {
		case "shipped", "delivered", "cancelled", "refunded":
			kind = h.NewStatus
		}
	}
	if kind == "" {
		return nil
	}
	return QueueNotification(tx, fmt.Sprintf("order:%d:%s", h.OrderID, kind), kind, h.OrderID, 0)
}
func (c *OrderCancellation) AfterCreate(tx *gorm.DB) error { return c.queueChanges(tx) }
func (c *OrderCancellation) AfterUpdate(tx *gorm.DB) error { return c.queueChanges(tx) }
func (c *OrderCancellation) queueChanges(tx *gorm.DB) error {
	if c.ID == 0 {
		return nil
	}
	var current OrderCancellation
	if err := tx.Session(&gorm.Session{NewDB: true}).First(&current, c.ID).Error; err != nil {
		return err
	}
	kind := current.Type + "_" + current.Status
	if err := QueueNotification(tx, fmt.Sprintf("request:%d:%s", c.ID, kind), kind, current.OrderID, c.ID); err != nil {
		return err
	}
	if current.RefundStatus == "completed" && current.PayTRRefundID != "" {
		return QueueNotification(tx, fmt.Sprintf("refund:%d", c.ID), "refund_completed", current.OrderID, c.ID)
	}
	return nil
}
