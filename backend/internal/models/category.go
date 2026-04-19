package models

import "time"

type Category struct {
	ID              uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	ParentID        *uint64    `gorm:"index" json:"parent_id"`
	Name            string     `gorm:"type:varchar(200);not null" json:"name"`
	Slug            string     `gorm:"type:varchar(250);uniqueIndex;not null" json:"slug"`
	Description     string     `gorm:"type:text" json:"description,omitempty"`
	ImageURL        string     `gorm:"type:varchar(500)" json:"image_url,omitempty"`
	IconURL         string     `gorm:"type:varchar(500)" json:"icon_url,omitempty"`
	SortOrder       int        `gorm:"default:0" json:"sort_order"`
	IsActive        bool       `gorm:"default:true" json:"is_active"`
	IsShowcase      bool       `gorm:"default:false" json:"is_showcase"`
	ShowcaseSortOrder int      `gorm:"default:0" json:"showcase_sort_order"`
	MetaTitle       string     `gorm:"type:varchar(255)" json:"meta_title,omitempty"`
	MetaDescription string     `gorm:"type:text" json:"meta_description,omitempty"`
	Depth           uint8      `gorm:"default:0;index" json:"depth"`
	Path            string     `gorm:"type:varchar(500)" json:"path"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Relations
	Parent   *Category  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []Category `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Products []Product  `gorm:"many2many:product_categories" json:"products,omitempty"`
}

func (Category) TableName() string {
	return "categories"
}
