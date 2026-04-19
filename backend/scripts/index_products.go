//go:build ignore

// index_products.go — MySQL'den tüm ürünleri Meilisearch'e indeksler.
// Çalıştır: go run scripts/index_products.go
// Çevre değişkenleri: MEILISEARCH_HOST, MEILISEARCH_KEY (backend/.env)

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/meilisearch/meilisearch-go"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Product struct {
	ID               uint64  `gorm:"primaryKey" json:"id"`
	BrandID          *uint64 `json:"brand_id"`
	SKU              string  `gorm:"column:sku" json:"sku"`
	Barcode          string  `json:"barcode"`
	Name             string  `json:"name"`
	Slug             string  `json:"slug"`
	ShortDescription string  `gorm:"column:short_description" json:"short_description"`
	Price            float64 `json:"price"`
	ComparePrice     *float64 `gorm:"column:compare_price" json:"compare_price,omitempty"`
	Stock            int     `json:"stock"`
	IsActive         bool    `gorm:"column:is_active" json:"is_active"`
	IsFeatured       bool    `gorm:"column:is_featured" json:"is_featured"`
	IsCampaign       bool    `gorm:"column:is_campaign" json:"is_campaign"`
}

type Brand struct {
	ID   uint64 `gorm:"primaryKey"`
	Name string
	Slug string
}

type Image struct {
	ProductID uint64
	ImageURL  string `gorm:"column:image_url"`
	IsPrimary bool   `gorm:"column:is_primary"`
	SortOrder int    `gorm:"column:sort_order"`
}

type Doc struct {
	ID               uint64   `json:"id"`
	Name             string   `json:"name"`
	Slug             string   `json:"slug"`
	SKU              string   `json:"sku"`
	Barcode          string   `json:"barcode"`
	ShortDescription string   `json:"short_description"`
	BrandName        string   `json:"brand_name,omitempty"`
	BrandSlug        string   `json:"brand_slug,omitempty"`
	BrandID          uint64   `json:"brand_id,omitempty"`
	CategoryIDs      []uint64 `json:"category_ids,omitempty"`
	Price            float64  `json:"price"`
	ComparePrice     float64  `json:"compare_price,omitempty"`
	Stock            int      `json:"stock"`
	IsActive         bool     `json:"is_active"`
	IsFeatured       bool     `json:"is_featured"`
	IsCampaign       bool     `json:"is_campaign"`
	ImageURL         string   `json:"image_url,omitempty"`
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	_ = godotenv.Load(".env")

	// MySQL
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		env("DB_USER", "root"),
		env("DB_PASSWORD", ""),
		env("DB_HOST", "localhost"),
		env("DB_PORT", "3306"),
		env("DB_NAME", "ecommerce"),
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("mysql: %v", err)
	}

	// Meilisearch client
	meiliHost := env("MEILISEARCH_HOST", "http://localhost:7700")
	meiliKey := env("MEILISEARCH_KEY", "")
	client := meilisearch.New(meiliHost, meilisearch.WithAPIKey(meiliKey))
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Index hazırlığı
	const indexUID = "istanbulvitamin_products"
	_, _ = client.CreateIndex(&meilisearch.IndexConfig{
		Uid:        indexUID,
		PrimaryKey: "id",
	})
	index := client.Index(indexUID)

	// Ayarlar
	settings := &meilisearch.Settings{
		SearchableAttributes: []string{
			"name",
			"brand_name",
			"short_description",
			"sku",
			"barcode",
			"slug",
		},
		FilterableAttributes: []string{
			"is_active",
			"is_featured",
			"is_campaign",
			"brand_id",
			"category_ids",
			"price",
			"stock",
		},
		SortableAttributes: []string{
			"price",
			"stock",
			"id",
		},
		RankingRules: []string{
			"words",
			"typo",
			"proximity",
			"attribute",
			"sort",
			"exactness",
		},
	}
	if _, err := index.UpdateSettings(settings); err != nil {
		log.Fatalf("update settings: %v", err)
	}

	// Brands → cache
	var brands []Brand
	if err := db.Table("brands").Find(&brands).Error; err != nil {
		log.Fatalf("brands: %v", err)
	}
	brandMap := make(map[uint64]Brand, len(brands))
	for _, b := range brands {
		brandMap[b.ID] = b
	}

	// Primary images → cache
	var images []Image
	if err := db.Table("product_images").
		Order("product_id, is_primary DESC, sort_order").
		Find(&images).Error; err != nil {
		log.Fatalf("images: %v", err)
	}
	imageMap := make(map[uint64]string, len(images))
	for _, im := range images {
		if _, ok := imageMap[im.ProductID]; !ok {
			imageMap[im.ProductID] = im.ImageURL
		}
	}

	// product_categories → cache
	type PC struct {
		ProductID  uint64
		CategoryID uint64
	}
	var pcs []PC
	if err := db.Table("product_categories").Find(&pcs).Error; err != nil {
		log.Fatalf("product_categories: %v", err)
	}
	catMap := make(map[uint64][]uint64)
	for _, pc := range pcs {
		catMap[pc.ProductID] = append(catMap[pc.ProductID], pc.CategoryID)
	}

	// Ürünleri sayfalı indeksle
	batchSize := 500
	offset := 0
	total := 0
	for {
		var products []Product
		if err := db.Table("products").
			Select("id, brand_id, sku, barcode, name, slug, short_description, price, compare_price, stock, is_active, is_featured, is_campaign").
			Offset(offset).Limit(batchSize).Find(&products).Error; err != nil {
			log.Fatalf("fetch products: %v", err)
		}
		if len(products) == 0 {
			break
		}

		docs := make([]Doc, 0, len(products))
		for _, p := range products {
			d := Doc{
				ID:               p.ID,
				Name:             p.Name,
				Slug:             p.Slug,
				SKU:              strings.TrimSpace(p.SKU),
				Barcode:          strings.TrimSpace(p.Barcode),
				ShortDescription: p.ShortDescription,
				Price:            p.Price,
				Stock:            p.Stock,
				IsActive:         p.IsActive,
				IsFeatured:       p.IsFeatured,
				IsCampaign:       p.IsCampaign,
				CategoryIDs:      catMap[p.ID],
				ImageURL:         imageMap[p.ID],
			}
			if p.ComparePrice != nil {
				d.ComparePrice = *p.ComparePrice
			}
			if p.BrandID != nil {
				if b, ok := brandMap[*p.BrandID]; ok {
					d.BrandID = b.ID
					d.BrandName = b.Name
					d.BrandSlug = b.Slug
				}
			}
			docs = append(docs, d)
		}

		if _, err := index.AddDocuments(docs, nil); err != nil {
			log.Fatalf("add batch: %v", err)
		}
		total += len(products)
		fmt.Printf("  • %d ürün kuyrukta (toplam=%d)\n", len(products), total)
		offset += batchSize
	}

	fmt.Printf("\n✓ %d ürün Meilisearch '%s' index'ine gönderildi.\n", total, indexUID)
	fmt.Println("  Task'ın tamamlanması birkaç saniye sürebilir.")
	_ = ctx
}
