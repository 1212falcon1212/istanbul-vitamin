package models

import "time"

type SyncLog struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Marketplace  string     `gorm:"type:enum('trendyol','hepsiburada');not null;index:idx_marketplace_type" json:"marketplace"`
	SyncType     string     `gorm:"type:enum('product_push','stock_update','price_update','order_fetch');not null;index:idx_marketplace_type" json:"sync_type"`
	Status       string     `gorm:"type:enum('success','failed','partial');not null" json:"status"`
	TotalItems   int        `gorm:"default:0" json:"total_items"`
	SuccessCount int        `gorm:"default:0" json:"success_count"`
	ErrorCount   int        `gorm:"default:0" json:"error_count"`
	ErrorDetails string     `gorm:"type:json" json:"error_details,omitempty"`
	StartedAt    time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	CreatedAt    time.Time  `gorm:"index" json:"created_at"`
}

func (SyncLog) TableName() string {
	return "sync_logs"
}
