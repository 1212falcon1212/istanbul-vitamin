package models

import "time"

type Product struct {
	ID                uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	BrandID           *uint64   `gorm:"index" json:"brand_id"`
	SKU               string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"sku"`
	Barcode           string    `gorm:"type:varchar(50)" json:"barcode,omitempty"`
	Name              string    `gorm:"type:varchar(500);not null" json:"name"`
	Slug              string    `gorm:"type:varchar(550);uniqueIndex;not null" json:"slug"`
	ShortDescription  string    `gorm:"type:text" json:"short_description,omitempty"`
	Description       string    `gorm:"type:longtext" json:"description,omitempty"`
	Price             float64   `gorm:"type:decimal(10,2);not null" json:"price"`
	ComparePrice      *float64  `gorm:"type:decimal(10,2)" json:"compare_price,omitempty"`
	CostPrice         *float64  `gorm:"type:decimal(10,2)" json:"cost_price,omitempty"`
	Currency          string    `gorm:"type:varchar(3);default:'TRY'" json:"currency"`
	Stock             int       `gorm:"default:0" json:"stock"`
	LowStockThreshold int       `gorm:"default:5" json:"low_stock_threshold"`
	Weight            *float64  `gorm:"type:decimal(8,2)" json:"weight,omitempty"`
	IsActive          bool      `gorm:"default:true;index:idx_active_featured" json:"is_active"`
	IsFeatured        bool      `gorm:"default:false;index:idx_active_featured" json:"is_featured"`
	IsCampaign        bool      `gorm:"default:false" json:"is_campaign"`
	TaxRate           float64   `gorm:"type:decimal(5,2);default:20.00" json:"tax_rate"`

	// Marketplace
	TrendyolID      string `gorm:"type:varchar(100)" json:"trendyol_id,omitempty"`
	TrendyolBarcode string `gorm:"type:varchar(100)" json:"trendyol_barcode,omitempty"`
	HepsiburadaID   string `gorm:"type:varchar(100)" json:"hepsiburada_id,omitempty"`
	HepsiburadaSKU  string `gorm:"type:varchar(100)" json:"hepsiburada_sku,omitempty"`

	// SEO
	MetaTitle       string `gorm:"type:varchar(255)" json:"meta_title,omitempty"`
	MetaDescription string `gorm:"type:text" json:"meta_description,omitempty"`

	// Feed
	FeedSourceID string `gorm:"type:varchar(500)" json:"feed_source_id,omitempty"`

	// Stats
	ViewCount uint `gorm:"default:0" json:"view_count"`
	SoldCount uint `gorm:"default:0" json:"sold_count"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	Brand      *Brand           `gorm:"foreignKey:BrandID" json:"brand,omitempty"`
	Categories []Category       `gorm:"many2many:product_categories" json:"categories,omitempty"`
	Images     []ProductImage   `gorm:"foreignKey:ProductID" json:"images,omitempty"`
	Variants   []ProductVariant `gorm:"foreignKey:ProductID" json:"variants,omitempty"`
	Tags       []ProductTag     `gorm:"foreignKey:ProductID" json:"tags,omitempty"`
}

func (Product) TableName() string {
	return "products"
}

type ProductCategory struct {
	ProductID  uint64 `gorm:"primaryKey" json:"product_id"`
	CategoryID uint64 `gorm:"primaryKey" json:"category_id"`
	IsPrimary  bool   `gorm:"default:false" json:"is_primary"`
}

func (ProductCategory) TableName() string {
	return "product_categories"
}

type ProductImage struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint64    `gorm:"not null;index" json:"product_id"`
	ImageURL  string    `gorm:"type:varchar(500);not null" json:"image_url"`
	AltText   string    `gorm:"type:varchar(255)" json:"alt_text,omitempty"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsPrimary bool      `gorm:"default:false" json:"is_primary"`
	CreatedAt time.Time `json:"created_at"`
}

func (ProductImage) TableName() string {
	return "product_images"
}

type ProductVariant struct {
	ID           uint64   `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID    uint64   `gorm:"not null;index" json:"product_id"`
	Name         string   `gorm:"type:varchar(200);not null" json:"name"`
	SKU          string   `gorm:"type:varchar(100)" json:"sku,omitempty"`
	Barcode      string   `gorm:"type:varchar(50)" json:"barcode,omitempty"`
	Price        float64  `gorm:"type:decimal(10,2);not null" json:"price"`
	ComparePrice *float64 `gorm:"type:decimal(10,2)" json:"compare_price,omitempty"`
	Stock        int      `gorm:"default:0" json:"stock"`
	IsActive     bool     `gorm:"default:true" json:"is_active"`
	SortOrder    int      `gorm:"default:0" json:"sort_order"`

	// Values: bu varyantın hangi varyasyon değerlerini içerdiği (ör. Kırmızı + S).
	// GORM Many2Many ile product_variant_values join tablosu üzerinden yüklenir.
	Values []VariationValue `gorm:"many2many:product_variant_values;joinForeignKey:VariantID;joinReferences:VariationValueID" json:"values,omitempty"`
}

func (ProductVariant) TableName() string {
	return "product_variants"
}

type ProductTag struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint64 `gorm:"not null" json:"product_id"`
	Tag       string `gorm:"type:varchar(100);not null;index" json:"tag"`
}

func (ProductTag) TableName() string {
	return "product_tags"
}
