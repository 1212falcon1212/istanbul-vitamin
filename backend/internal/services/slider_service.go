package services

import (
	"errors"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

type SliderService struct {
	db *gorm.DB
}

func NewSliderService(db *gorm.DB) *SliderService {
	return &SliderService{db: db}
}

// List aktif slider'lari starts_at/expires_at filtreleriyle, sort_order'a gore sirali dondurur.
func (s *SliderService) List() ([]models.Slider, error) {
	var sliders []models.Slider
	now := time.Now()

	err := s.db.
		Where("is_active = ?", true).
		Where("(starts_at IS NULL OR starts_at <= ?)", now).
		Where("(expires_at IS NULL OR expires_at >= ?)", now).
		Order("sort_order ASC").
		Find(&sliders).Error
	if err != nil {
		return nil, errors.New("slider'lar listelenirken bir hata oluştu")
	}

	return sliders, nil
}

// AdminList tum slider'lari dondurur.
func (s *SliderService) AdminList() ([]models.Slider, error) {
	var sliders []models.Slider

	if err := s.db.Order("sort_order ASC").Find(&sliders).Error; err != nil {
		return nil, errors.New("slider'lar listelenirken bir hata oluştu")
	}

	return sliders, nil
}

// Create yeni slider olusturur.
func (s *SliderService) Create(slider *models.Slider) error {
	if err := s.db.Create(slider).Error; err != nil {
		return errors.New("slider oluşturulurken bir hata oluştu")
	}
	return nil
}

// Update mevcut slider'i gunceller.
func (s *SliderService) Update(slider *models.Slider) error {
	var existing models.Slider
	if err := s.db.First(&existing, slider.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("slider bulunamadı")
		}
		return errors.New("slider getirilirken bir hata oluştu")
	}

	if err := s.db.Save(slider).Error; err != nil {
		return errors.New("slider güncellenirken bir hata oluştu")
	}
	return nil
}

// Delete slider'i siler.
func (s *SliderService) Delete(id uint64) error {
	result := s.db.Delete(&models.Slider{}, id)
	if result.Error != nil {
		return errors.New("slider silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("slider bulunamadı")
	}
	return nil
}
