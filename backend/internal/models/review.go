package models

import "time"

type Review struct {
	ID         uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint64    `gorm:"not null;uniqueIndex:uk_reviews_user_product;index:idx_reviews_user" json:"user_id"`
	ProductID  uint64    `gorm:"not null;uniqueIndex:uk_reviews_user_product;index:idx_reviews_product,priority:1" json:"product_id"`
	Rating     uint8     `gorm:"type:tinyint unsigned;not null" json:"rating"` // 1-5
	Title      string    `gorm:"type:varchar(200)" json:"title,omitempty"`
	Body       string    `gorm:"type:text;not null" json:"body"`
	IsApproved bool      `gorm:"type:tinyint(1);not null;default:0;index:idx_reviews_product,priority:2" json:"is_approved"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	// Relations
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (Review) TableName() string {
	return "reviews"
}
