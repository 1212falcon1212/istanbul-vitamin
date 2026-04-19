package models

import "time"

type Cart struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    *uint64   `json:"user_id"`
	SessionID string    `gorm:"type:varchar(100);index" json:"session_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	Items []CartItem `gorm:"foreignKey:CartID" json:"items,omitempty"`
}

func (Cart) TableName() string {
	return "carts"
}

type CartItem struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	CartID    uint64    `gorm:"not null;index" json:"cart_id"`
	ProductID uint64    `gorm:"not null" json:"product_id"`
	VariantID *uint64   `json:"variant_id,omitempty"`
	Quantity  int       `gorm:"not null;default:1" json:"quantity"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	Product *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Variant *ProductVariant `gorm:"foreignKey:VariantID" json:"variant,omitempty"`
}

func (CartItem) TableName() string {
	return "cart_items"
}
