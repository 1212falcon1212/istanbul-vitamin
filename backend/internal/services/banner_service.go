package services

import (
	"errors"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

type BannerService struct {
	db *gorm.DB
}

func NewBannerService(db *gorm.DB) *BannerService {
	return &BannerService{db: db}
}

// List tum aktif banner'lari dondurur.
func (s *BannerService) List() ([]models.Banner, error) {
	var banners []models.Banner
	now := time.Now()

	err := s.db.
		Where("is_active = ?", true).
		Where("(starts_at IS NULL OR starts_at <= ?)", now).
		Where("(expires_at IS NULL OR expires_at >= ?)", now).
		Order("sort_order ASC").
		Find(&banners).Error
	if err != nil {
		return nil, errors.New("banner'lar listelenirken bir hata oluştu")
	}

	return banners, nil
}

// GetByPosition belirli pozisyondaki aktif banner'lari sort_order sirasina gore dondurur.
func (s *BannerService) GetByPosition(position string) ([]models.Banner, error) {
	var banners []models.Banner
	now := time.Now()

	err := s.db.
		Where("position = ? AND is_active = ?", position, true).
		Where("(starts_at IS NULL OR starts_at <= ?)", now).
		Where("(expires_at IS NULL OR expires_at >= ?)", now).
		Order("sort_order ASC").
		Find(&banners).Error
	if err != nil {
		return nil, errors.New("banner'lar listelenirken bir hata oluştu")
	}

	return banners, nil
}

// AdminList tum banner'lari dondurur.
func (s *BannerService) AdminList() ([]models.Banner, error) {
	var banners []models.Banner

	if err := s.db.Order("position ASC, sort_order ASC").Find(&banners).Error; err != nil {
		return nil, errors.New("banner'lar listelenirken bir hata oluştu")
	}

	return banners, nil
}

// Create yeni banner olusturur.
func (s *BannerService) Create(banner *models.Banner) error {
	if err := s.db.Create(banner).Error; err != nil {
		return errors.New("banner oluşturulurken bir hata oluştu")
	}
	return nil
}

// Update mevcut banner'i gunceller.
func (s *BannerService) Update(banner *models.Banner) error {
	var existing models.Banner
	if err := s.db.First(&existing, banner.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("banner bulunamadı")
		}
		return errors.New("banner getirilirken bir hata oluştu")
	}

	if err := s.db.Save(banner).Error; err != nil {
		return errors.New("banner güncellenirken bir hata oluştu")
	}
	return nil
}

// Delete banner'i siler.
func (s *BannerService) Delete(id uint64) error {
	result := s.db.Delete(&models.Banner{}, id)
	if result.Error != nil {
		return errors.New("banner silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("banner bulunamadı")
	}
	return nil
}
