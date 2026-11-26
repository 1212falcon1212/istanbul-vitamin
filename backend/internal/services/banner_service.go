package services

import (
	"context"
	"errors"
	"github.com/istanbulvitamin/backend/internal/cache"
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
	banners, err := cache.Remember(context.Background(), "banners:active:v1", time.Minute, func() ([]models.Banner, error) {
		var rows []models.Banner
		if err := s.db.Where("is_active = ?", true).Order("sort_order ASC, id ASC").Find(&rows).Error; err != nil {
			return nil, errors.New("banner'lar listelenirken bir hata oluştu")
		}
		return rows, nil
	})
	if err != nil {
		return nil, err
	}
	now := time.Now()
	visible := make([]models.Banner, 0, len(banners))
	for _, b := range banners {
		if (b.StartsAt == nil || !now.Before(*b.StartsAt)) && (b.ExpiresAt == nil || !now.After(*b.ExpiresAt)) {
			visible = append(visible, b)
		}
	}
	return visible, nil
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
	cache.Del(context.Background(), "banners:active:v1")
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

	// Save tum kolonlari yazar; CreatedAt zero-value gitmesin diye mevcut degeri koruyoruz.
	banner.CreatedAt = existing.CreatedAt

	if err := s.db.Save(banner).Error; err != nil {
		return errors.New("banner güncellenirken bir hata oluştu")
	}
	cache.Del(context.Background(), "banners:active:v1")
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
	cache.Del(context.Background(), "banners:active:v1")
	return nil
}
