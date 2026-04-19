package models

import "time"

type Page struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Slug            string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"slug"`
	Title           string    `gorm:"type:varchar(255);not null" json:"title"`
	Content         string    `gorm:"type:longtext" json:"content,omitempty"`
	IsActive        bool      `gorm:"default:true" json:"is_active"`
	MetaTitle       string    `gorm:"type:varchar(255)" json:"meta_title,omitempty"`
	MetaDescription string    `gorm:"type:text" json:"meta_description,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (Page) TableName() string {
	return "pages"
}
