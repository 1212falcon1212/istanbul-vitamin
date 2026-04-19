package services

import (
	"errors"

	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

type AddressService struct {
	db *gorm.DB
}

func NewAddressService(db *gorm.DB) *AddressService {
	return &AddressService{db: db}
}

// List kullanicinin tum adreslerini dondurur.
func (s *AddressService) List(userID uint64) ([]models.Address, error) {
	var addresses []models.Address
	if err := s.db.Where("user_id = ?", userID).Order("is_default DESC, created_at DESC").Find(&addresses).Error; err != nil {
		return nil, errors.New("adresler listelenirken bir hata oluştu")
	}
	return addresses, nil
}

// Create yeni adres olusturur. Varsayilan olarak isaretlenmisse diger varsayilanlari kaldirir.
func (s *AddressService) Create(address *models.Address) error {
	if address.IsDefault {
		if err := s.db.Model(&models.Address{}).
			Where("user_id = ? AND is_default = ?", address.UserID, true).
			Update("is_default", false).Error; err != nil {
			return errors.New("varsayılan adres güncellenirken bir hata oluştu")
		}
	}

	if err := s.db.Create(address).Error; err != nil {
		return errors.New("adres oluşturulurken bir hata oluştu")
	}

	return nil
}

// Update mevcut adresi gunceller. Kullaniciya ait oldugundan emin olur.
func (s *AddressService) Update(address *models.Address) error {
	// Sahiplik kontrolu
	var existing models.Address
	if err := s.db.Where("id = ? AND user_id = ?", address.ID, address.UserID).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("adres bulunamadı")
		}
		return errors.New("adres getirilirken bir hata oluştu")
	}

	if address.IsDefault {
		if err := s.db.Model(&models.Address{}).
			Where("user_id = ? AND id != ? AND is_default = ?", address.UserID, address.ID, true).
			Update("is_default", false).Error; err != nil {
			return errors.New("varsayılan adres güncellenirken bir hata oluştu")
		}
	}

	if err := s.db.Save(address).Error; err != nil {
		return errors.New("adres güncellenirken bir hata oluştu")
	}

	return nil
}

// Delete adresi siler. Kullaniciya ait oldugundan emin olur.
func (s *AddressService) Delete(id uint64, userID uint64) error {
	result := s.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Address{})
	if result.Error != nil {
		return errors.New("adres silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("adres bulunamadı")
	}
	return nil
}
