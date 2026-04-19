package models

import "time"

type Address struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       uint64    `gorm:"not null;index" json:"user_id"`
	Title        string    `gorm:"type:varchar(100);not null" json:"title"`
	FirstName    string    `gorm:"type:varchar(100);not null" json:"first_name"`
	LastName     string    `gorm:"type:varchar(100);not null" json:"last_name"`
	Phone        string    `gorm:"type:varchar(20);not null" json:"phone"`
	City         string    `gorm:"type:varchar(100);not null" json:"city"`
	District     string    `gorm:"type:varchar(100);not null" json:"district"`
	Neighborhood string    `gorm:"type:varchar(150)" json:"neighborhood"`
	AddressLine  string    `gorm:"type:text;not null" json:"address_line"`
	PostalCode   string    `gorm:"type:varchar(10)" json:"postal_code"`
	IsDefault    bool      `gorm:"default:false" json:"is_default"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (Address) TableName() string {
	return "addresses"
}
