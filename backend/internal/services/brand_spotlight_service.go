package services

import (
	"context"
	"errors"
	"time"

	"github.com/istanbulvitamin/backend/internal/cache"
	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

const cacheTTLBrandSpotlight = 30 * time.Minute

type SpotlightData struct {
	Brand        *models.Brand     `json:"brand"`
	Products     []models.Product  `json:"products"`
	ProductCount int64             `json:"product_count"`
}

type BrandSpotlightService struct {
	db *gorm.DB
}

func NewBrandSpotlightService(db *gorm.DB) *BrandSpotlightService {
	return &BrandSpotlightService{db: db}
}

// GetSpotlight en fazla ürüne sahip aktif markayı ve ürünlerini döndürür.
// Sonuç 30 dakika cache'lenir.
func (s *BrandSpotlightService) GetSpotlight() (*SpotlightData, error) {
	return cache.Remember(context.Background(), cacheKeyBrandsSpotlight, cacheTTLBrandSpotlight, func() (*SpotlightData, error) {
		// En fazla ürüne sahip aktif markayı bul
		var brand models.Brand
		err := s.db.
			Joins("JOIN products ON products.brand_id = brands.id AND products.is_active = ?", true).
			Where("brands.is_active = ?", true).
			Group("brands.id").
			Order("COUNT(products.id) DESC").
			First(&brand).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("spotlight için uygun marka bulunamadı")
			}
			return nil, errors.New("spotlight markası getirilirken bir hata oluştu")
		}

		// Toplam ürün sayısını hesapla
		var productCount int64
		if err := s.db.Model(&models.Product{}).
			Where("brand_id = ? AND is_active = ?", brand.ID, true).
			Count(&productCount).Error; err != nil {
			return nil, errors.New("ürün sayısı hesaplanırken bir hata oluştu")
		}

		// Markanın 6 ürününü getir (görseller dahil)
		var products []models.Product
		err = s.db.
			Where("brand_id = ? AND is_active = ?", brand.ID, true).
			Preload("Images", func(db *gorm.DB) *gorm.DB {
				return db.Order("product_images.sort_order ASC")
			}).
			Preload("Brand").
			Order("created_at DESC").
			Limit(6).
			Find(&products).Error
		if err != nil {
			return nil, errors.New("spotlight ürünleri getirilirken bir hata oluştu")
		}

		return &SpotlightData{
			Brand:        &brand,
			Products:     products,
			ProductCount: productCount,
		}, nil
	})
}
