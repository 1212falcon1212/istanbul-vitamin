package services

import (
	"errors"

	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

type CardService struct {
	db *gorm.DB
}

func NewCardService(db *gorm.DB) *CardService {
	return &CardService{db: db}
}

// List kullanicinin kayitli kartlarini dondurur.
func (s *CardService) List(userID uint64) ([]models.SavedCard, error) {
	var cards []models.SavedCard
	if err := s.db.Where("user_id = ?", userID).Order("is_default DESC, created_at DESC").Find(&cards).Error; err != nil {
		return nil, errors.New("kartlar listelenirken bir hata oluştu")
	}
	return cards, nil
}

// Create yeni kart kaydeder.
func (s *CardService) Create(card *models.SavedCard) error {
	if card.IsDefault {
		if err := s.db.Model(&models.SavedCard{}).
			Where("user_id = ? AND is_default = ?", card.UserID, true).
			Update("is_default", false).Error; err != nil {
			return errors.New("varsayılan kart güncellenirken bir hata oluştu")
		}
	}

	if err := s.db.Create(card).Error; err != nil {
		return errors.New("kart kaydedilirken bir hata oluştu")
	}

	return nil
}

// Delete karti siler. Kullaniciya ait oldugundan emin olur.
func (s *CardService) Delete(id, userID uint64) error {
	result := s.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.SavedCard{})
	if result.Error != nil {
		return errors.New("kart silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("kart bulunamadı")
	}
	return nil
}

// GetDefault kullanicinin varsayilan kartini dondurur.
func (s *CardService) GetDefault(userID uint64) (*models.SavedCard, error) {
	var card models.SavedCard
	if err := s.db.Where("user_id = ? AND is_default = ?", userID, true).First(&card).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("varsayılan kart bulunamadı")
		}
		return nil, errors.New("kart getirilirken bir hata oluştu")
	}
	return &card, nil
}
