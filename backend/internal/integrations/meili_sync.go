// Package integrations Meilisearch ile product senkronizasyonu için yardımcı.
// Product service Create/Update sonrası async çağırılır; kritik path'i bloklamaz.

package integrations

import (
	"log"
	"os"

	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/meilisearch/meilisearch-go"
)

const meiliIndex = "istanbulvitamin_products"

// MeiliDoc search_service.go'daki struct ile tutarlı olmalı.
type MeiliDoc struct {
	ID               uint64   `json:"id"`
	Name             string   `json:"name"`
	Slug             string   `json:"slug"`
	SKU              string   `json:"sku"`
	Barcode          string   `json:"barcode"`
	ShortDescription string   `json:"short_description"`
	BrandID          uint64   `json:"brand_id"`
	BrandName        string   `json:"brand_name"`
	BrandSlug        string   `json:"brand_slug"`
	CategoryIDs      []uint64 `json:"category_ids"`
	Price            float64  `json:"price"`
	ComparePrice     float64  `json:"compare_price"`
	Stock            int      `json:"stock"`
	IsActive         bool     `json:"is_active"`
	IsFeatured       bool     `json:"is_featured"`
	IsCampaign       bool     `json:"is_campaign"`
	ImageURL         string   `json:"image_url"`
}

func client() meilisearch.ServiceManager {
	host := os.Getenv("MEILISEARCH_HOST")
	if host == "" {
		host = "http://localhost:7700"
	}
	return meilisearch.New(host, meilisearch.WithAPIKey(os.Getenv("MEILISEARCH_KEY")))
}

// IndexProduct tek bir ürünü Meili'ye async upsert eder.
// Hata durumunda sadece log, ana akışı bozmaz.
func IndexProduct(productID uint64) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[meili-sync] panic: %v", r)
			}
		}()

		doc, err := buildDoc(productID)
		if err != nil {
			log.Printf("[meili-sync] build doc %d: %v", productID, err)
			return
		}
		idx := client().Index(meiliIndex)
		if _, err := idx.AddDocuments([]MeiliDoc{*doc}, nil); err != nil {
			log.Printf("[meili-sync] add doc %d: %v", productID, err)
		}
	}()
}

// DeleteProduct Meili'den kaldırır.
func DeleteProduct(productID uint64) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[meili-sync] panic: %v", r)
			}
		}()
		idx := client().Index(meiliIndex)
		if _, err := idx.DeleteDocument(uintToString(productID), nil); err != nil {
			log.Printf("[meili-sync] delete doc %d: %v", productID, err)
		}
	}()
}

func buildDoc(productID uint64) (*MeiliDoc, error) {
	var p models.Product
	if err := database.DB.
		Preload("Brand").
		Preload("Images").
		Preload("Categories").
		First(&p, productID).Error; err != nil {
		return nil, err
	}

	doc := &MeiliDoc{
		ID:               p.ID,
		Name:             p.Name,
		Slug:             p.Slug,
		SKU:              p.SKU,
		Barcode:          p.Barcode,
		ShortDescription: p.ShortDescription,
		Price:            p.Price,
		Stock:            p.Stock,
		IsActive:         p.IsActive,
		IsFeatured:       p.IsFeatured,
		IsCampaign:       p.IsCampaign,
	}
	if p.ComparePrice != nil {
		doc.ComparePrice = *p.ComparePrice
	}
	if p.Brand != nil {
		doc.BrandID = p.Brand.ID
		doc.BrandName = p.Brand.Name
		doc.BrandSlug = p.Brand.Slug
	}
	for _, img := range p.Images {
		if img.IsPrimary {
			doc.ImageURL = img.ImageURL
			break
		}
	}
	if doc.ImageURL == "" && len(p.Images) > 0 {
		doc.ImageURL = p.Images[0].ImageURL
	}
	for _, c := range p.Categories {
		doc.CategoryIDs = append(doc.CategoryIDs, c.ID)
	}
	return doc, nil
}

func uintToString(u uint64) string {
	// fmt.Sprintf avoid allocation — simple itoa
	if u == 0 {
		return "0"
	}
	buf := make([]byte, 0, 20)
	for u > 0 {
		buf = append([]byte{byte(u%10) + '0'}, buf...)
		u /= 10
	}
	return string(buf)
}
