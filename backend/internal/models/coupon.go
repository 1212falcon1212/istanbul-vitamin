package models

import "time"

type Coupon struct {
	ID               uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Code             string     `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	Description      string     `gorm:"type:varchar(255)" json:"description,omitempty"`
	DiscountType     string     `gorm:"type:enum('percentage','fixed');not null" json:"discount_type"`
	DiscountValue    float64    `gorm:"type:decimal(10,2);not null" json:"discount_value"`
	MinOrderAmount   float64    `gorm:"type:decimal(10,2);default:0" json:"min_order_amount"`
	MaxDiscountAmount *float64  `gorm:"type:decimal(10,2)" json:"max_discount_amount,omitempty"`
	UsageLimit       *int       `json:"usage_limit,omitempty"`
	UsageCount       int        `gorm:"default:0" json:"usage_count"`
	PerUserLimit     int        `gorm:"default:1" json:"per_user_limit"`
	StartsAt         *time.Time `json:"starts_at,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	IsActive         bool       `gorm:"default:true" json:"is_active"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (Coupon) TableName() string {
	return "coupons"
}
