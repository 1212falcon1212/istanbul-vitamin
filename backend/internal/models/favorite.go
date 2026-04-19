package models

import "time"

type Favorite struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"not null;uniqueIndex:uk_user_product" json:"user_id"`
	ProductID uint64    `gorm:"not null;uniqueIndex:uk_user_product" json:"product_id"`
	CreatedAt time.Time `json:"created_at"`

	// Relations
	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (Favorite) TableName() string {
	return "favorites"
}
