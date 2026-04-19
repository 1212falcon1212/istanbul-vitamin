package services

import (
	"errors"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type FavoriteService struct {
	db *gorm.DB
}

func NewFavoriteService(db *gorm.DB) *FavoriteService {
	return &FavoriteService{db: db}
}

// List kullanicinin favori urunlerini sayfalanmis olarak dondurur.
func (s *FavoriteService) List(userID uint64, page, perPage int) ([]models.Favorite, int64, error) {
	var favorites []models.Favorite
	var total int64

	query := s.db.Model(&models.Favorite{}).Where("user_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("favoriler sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)

	err := query.
		Preload("Product").
		Preload("Product.Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&favorites).Error
	if err != nil {
		return nil, 0, errors.New("favoriler listelenirken bir hata oluştu")
	}

	return favorites, total, nil
}

// Add kullanicinin favorilerine urun ekler.
func (s *FavoriteService) Add(userID, productID uint64) error {
	// Urun var mi kontrol et
	var productCount int64
	if err := s.db.Model(&models.Product{}).Where("id = ?", productID).Count(&productCount).Error; err != nil || productCount == 0 {
		return errors.New("ürün bulunamadı")
	}

	// Tekrar kontrolu
	var existingCount int64
	if err := s.db.Model(&models.Favorite{}).Where("user_id = ? AND product_id = ?", userID, productID).Count(&existingCount).Error; err != nil {
		return errors.New("favori kontrol edilirken bir hata oluştu")
	}
	if existingCount > 0 {
		return errors.New("bu ürün zaten favorilerinizde")
	}

	favorite := models.Favorite{
		UserID:    userID,
		ProductID: productID,
	}

	if err := s.db.Create(&favorite).Error; err != nil {
		return errors.New("favori eklenirken bir hata oluştu")
	}

	return nil
}

// Remove kullanicinin favorilerinden urun kaldirir.
func (s *FavoriteService) Remove(userID, productID uint64) error {
	result := s.db.Where("user_id = ? AND product_id = ?", userID, productID).Delete(&models.Favorite{})
	if result.Error != nil {
		return errors.New("favori kaldırılırken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("favori bulunamadı")
	}
	return nil
}

// IsFavorite urunun kullanicinin favorilerinde olup olmadigini dondurur.
func (s *FavoriteService) IsFavorite(userID, productID uint64) bool {
	var count int64
	s.db.Model(&models.Favorite{}).Where("user_id = ? AND product_id = ?", userID, productID).Count(&count)
	return count > 0
}
