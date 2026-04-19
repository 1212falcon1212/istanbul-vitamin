package models

import "time"

// VariationType varyasyon üst kategorisi — "Renk", "Beden", "Aroma" gibi.
type VariationType struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Slug      string    `gorm:"type:varchar(120);uniqueIndex;not null" json:"slug"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Values []VariationValue `gorm:"foreignKey:VariationTypeID" json:"values,omitempty"`
}

func (VariationType) TableName() string {
	return "variation_types"
}

// VariationValue bir varyasyon tipinin alt seçeneği.
// "Kırmızı" (Renk), "S" (Beden) gibi.
type VariationValue struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	VariationTypeID uint64    `gorm:"not null;index" json:"variation_type_id"`
	Value           string    `gorm:"type:varchar(150);not null" json:"value"`
	Slug            string    `gorm:"type:varchar(170);not null" json:"slug"`
	ColorHex        string    `gorm:"type:varchar(7)" json:"color_hex,omitempty"` // "#RRGGBB" — renk için
	SortOrder       int       `gorm:"default:0" json:"sort_order"`
	IsActive        bool      `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	VariationType *VariationType `gorm:"foreignKey:VariationTypeID" json:"variation_type,omitempty"`
}

func (VariationValue) TableName() string {
	return "variation_values"
}

// ProductVariantValue ProductVariant ↔ VariationValue M2M join kaydı.
// GORM "join table" olarak kullanılır; ProductVariant.Values alanı bu üzerinden gelir.
type ProductVariantValue struct {
	VariantID        uint64 `gorm:"primaryKey" json:"variant_id"`
	VariationValueID uint64 `gorm:"primaryKey" json:"variation_value_id"`
}

func (ProductVariantValue) TableName() string {
	return "product_variant_values"
}
