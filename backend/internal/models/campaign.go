package models

import "time"

type Campaign struct {
	ID               uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Name             string     `gorm:"type:varchar(255);not null" json:"name"`
	Slug             string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"slug"`
	Description      string     `gorm:"type:text" json:"description,omitempty"`
	BannerImage      string     `gorm:"type:varchar(500)" json:"banner_image,omitempty"`
	BannerImageMobile string    `gorm:"type:varchar(500)" json:"banner_image_mobile,omitempty"`
	DiscountType     string     `gorm:"type:enum('percentage','fixed')" json:"discount_type,omitempty"`
	DiscountValue    *float64   `gorm:"type:decimal(10,2)" json:"discount_value,omitempty"`
	StartsAt         *time.Time `json:"starts_at,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	IsActive         bool       `gorm:"default:true" json:"is_active"`
	MetaTitle        string     `gorm:"type:varchar(255)" json:"meta_title,omitempty"`
	MetaDescription  string     `gorm:"type:text" json:"meta_description,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	// Relations
	Products []Product `gorm:"many2many:campaign_products" json:"products,omitempty"`
}

func (Campaign) TableName() string {
	return "campaigns"
}

type CampaignProduct struct {
	CampaignID uint64 `gorm:"primaryKey"`
	ProductID  uint64 `gorm:"primaryKey"`
}

func (CampaignProduct) TableName() string {
	return "campaign_products"
}
