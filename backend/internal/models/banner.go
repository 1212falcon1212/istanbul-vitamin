package models

import "time"

type Banner struct {
	ID             uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Position       string     `gorm:"type:varchar(50);not null;index:idx_position_active" json:"position"`
	Title          string     `gorm:"type:varchar(255)" json:"title,omitempty"`
	ImageURL       string     `gorm:"type:varchar(500);not null" json:"image_url"`
	ImageURLMobile string     `gorm:"type:varchar(500)" json:"image_url_mobile,omitempty"`
	LinkURL        string     `gorm:"type:varchar(500)" json:"link_url,omitempty"`
	SortOrder      int        `gorm:"default:0" json:"sort_order"`
	IsActive       bool       `gorm:"default:true;index:idx_position_active" json:"is_active"`
	StartsAt       *time.Time `json:"starts_at,omitempty"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (Banner) TableName() string {
	return "banners"
}
