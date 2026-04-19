package models

import "time"

type SavedCard struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"not null;index" json:"user_id"`
	CardLabel string    `gorm:"type:varchar(100)" json:"card_label"`
	LastFour  string    `gorm:"type:varchar(4);not null" json:"last_four"`
	CardToken string    `gorm:"type:varchar(255);not null" json:"-"`
	CardBrand string    `gorm:"type:varchar(50)" json:"card_brand"`
	IsDefault bool      `gorm:"default:false" json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
}

func (SavedCard) TableName() string {
	return "saved_cards"
}
