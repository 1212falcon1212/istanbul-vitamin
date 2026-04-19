package models

import "time"

type Brand struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name            string    `gorm:"type:varchar(200);not null" json:"name"`
	Slug            string    `gorm:"type:varchar(250);uniqueIndex;not null" json:"slug"`
	LogoURL         string    `gorm:"type:varchar(500)" json:"logo_url,omitempty"`
	Description     string    `gorm:"type:text" json:"description,omitempty"`
	IsActive        bool      `gorm:"default:true" json:"is_active"`
	SortOrder       int       `gorm:"default:0" json:"sort_order"`
	MetaTitle       string    `gorm:"type:varchar(255)" json:"meta_title,omitempty"`
	MetaDescription string    `gorm:"type:text" json:"meta_description,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	// Relations
	Products []Product `gorm:"foreignKey:BrandID" json:"products,omitempty"`
}

func (Brand) TableName() string {
	return "brands"
}
