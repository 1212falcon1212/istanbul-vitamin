package models

import "time"

// OrderCancellation müşteri-tetiklenen iptal/iade taleplerini temsil eder.
// orders.status enum'u kirletilmeden talep state machine'i ayrı tutulur.
//
// type=cancel  → pending iken otomatik onay; shipped iken admin onayı + Aras CancelDispatch
// type=return  → delivered sonrası iade talebi; admin onayı + iade kargo etiketi + PayTR refund
type OrderCancellation struct {
	ID                 uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID            uint64     `gorm:"not null;index:idx_order_cancel_status,priority:1" json:"order_id"`
	Type               string     `gorm:"type:enum('cancel','return');not null" json:"type"`
	Status             string     `gorm:"type:enum('requested','approved','rejected','completed');default:'requested';index:idx_order_cancel_status,priority:2" json:"status"`
	Reason             string     `gorm:"type:varchar(80);not null" json:"reason"`
	Note               string     `gorm:"type:text" json:"note,omitempty"`
	RefundAmount       *float64   `gorm:"type:decimal(10,2)" json:"refund_amount,omitempty"`
	RefundStatus       string     `gorm:"type:enum('pending','processing','completed','failed')" json:"refund_status,omitempty"`
	PayTRRefundID      string     `gorm:"column:paytr_refund_id;type:varchar(64)" json:"paytr_refund_id,omitempty"`
	ArasReturnTracking string     `gorm:"type:varchar(100)" json:"aras_return_tracking,omitempty"`
	RequestedByUserID  *uint64    `gorm:"index:idx_user_cancel,priority:1" json:"requested_by_user_id,omitempty"`
	DecidedByAdminID   *uint64    `json:"decided_by_admin_id,omitempty"`
	DecidedAt          *time.Time `json:"decided_at,omitempty"`
	CreatedAt          time.Time  `gorm:"index:idx_user_cancel,priority:2" json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`

	// Relations
	Order *Order `gorm:"foreignKey:OrderID" json:"order,omitempty"`
}

func (OrderCancellation) TableName() string {
	return "order_cancellations"
}
