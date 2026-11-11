package models

import "time"

type Banner struct {
	ID                  uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Position            string     `gorm:"type:varchar(50);not null;index:idx_position_active" json:"position"`
	Title               string     `gorm:"type:varchar(255)" json:"title,omitempty"`
	ImageURL            string     `gorm:"type:varchar(500);not null" json:"image_url"`
	ImageURLMobile      string     `gorm:"type:varchar(500)" json:"image_url_mobile,omitempty"`
	LinkURL             string     `gorm:"type:varchar(500)" json:"link_url,omitempty"`
	Subtitle            string     `gorm:"type:varchar(500)" json:"subtitle,omitempty"`
	ButtonText          string     `gorm:"type:varchar(100)" json:"button_text,omitempty"`
	SecondaryButtonText string     `gorm:"type:varchar(100)" json:"secondary_button_text,omitempty"`
	SecondaryLinkURL    string     `gorm:"type:varchar(500)" json:"secondary_link_url,omitempty"`
	SecondaryImageURL   string     `gorm:"type:varchar(500)" json:"secondary_image_url,omitempty"`
	SecondaryImageAlt   string     `gorm:"type:varchar(255)" json:"secondary_image_alt,omitempty"`
	BackgroundColor     string     `gorm:"type:varchar(20)" json:"background_color,omitempty"`
	ImageFit            string     `gorm:"type:varchar(20)" json:"image_fit,omitempty"`
	SortOrder           int        `gorm:"default:0" json:"sort_order"`
	IsActive            bool       `gorm:"default:true;index:idx_position_active" json:"is_active"`
	StartsAt            *time.Time `json:"starts_at,omitempty"`
	ExpiresAt           *time.Time `json:"expires_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

func (Banner) TableName() string {
	return "banners"
}
