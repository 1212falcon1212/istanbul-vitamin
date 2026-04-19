package services

import (
	"errors"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type CustomerService struct {
	db *gorm.DB
}

func NewCustomerService(db *gorm.DB) *CustomerService {
	return &CustomerService{db: db}
}

// List admin icin kullanici listesi dondurur (opsiyonel arama ile).
func (s *CustomerService) List(page, perPage int, search string) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := s.db.Model(&models.User{})

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where(
			"(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)",
			searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("müşteriler sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)

	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&users).Error
	if err != nil {
		return nil, 0, errors.New("müşteriler listelenirken bir hata oluştu")
	}

	return users, total, nil
}

// GetByID kullaniciyi ID ile getirir (adresler ve siparis sayisi ile birlikte).
func (s *CustomerService) GetByID(id uint64) (*models.User, error) {
	var user models.User

	err := s.db.
		Preload("Addresses").
		First(&user, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("müşteri bulunamadı")
		}
		return nil, errors.New("müşteri bilgileri alınırken bir hata oluştu")
	}

	return &user, nil
}
