package services

import (
	"errors"
	"fmt"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type PageService struct {
	db *gorm.DB
}

func NewPageService(db *gorm.DB) *PageService {
	return &PageService{db: db}
}

// GetBySlug slug ile aktif sayfayi getirir.
func (s *PageService) GetBySlug(slug string) (*models.Page, error) {
	var page models.Page
	if err := s.db.Where("slug = ? AND is_active = ?", slug, true).First(&page).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("sayfa bulunamadı")
		}
		return nil, errors.New("sayfa getirilirken bir hata oluştu")
	}
	return &page, nil
}

// List admin icin sayfalanmis sayfa listesi dondurur.
func (s *PageService) List(page, perPage int) ([]models.Page, int64, error) {
	var pages []models.Page
	var total int64

	if err := s.db.Model(&models.Page{}).Count(&total).Error; err != nil {
		return nil, 0, errors.New("sayfalar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)
	if err := s.db.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&pages).Error; err != nil {
		return nil, 0, errors.New("sayfalar listelenirken bir hata oluştu")
	}

	return pages, total, nil
}

// Create yeni sayfa olusturur ve slug'i otomatik uretir.
func (s *PageService) Create(p *models.Page) error {
	if p.Slug == "" {
		p.Slug = utils.Slugify(p.Title)
	}

	// Slug benzersizligini kontrol et
	slug, err := s.ensureUniqueSlug(p.Slug, 0)
	if err != nil {
		return err
	}
	p.Slug = slug

	if err := s.db.Create(p).Error; err != nil {
		return errors.New("sayfa oluşturulurken bir hata oluştu")
	}
	return nil
}

// Update mevcut sayfayi gunceller.
func (s *PageService) Update(p *models.Page) error {
	var existing models.Page
	if err := s.db.First(&existing, p.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("sayfa bulunamadı")
		}
		return errors.New("sayfa getirilirken bir hata oluştu")
	}

	// Baslik degistiyse slug'i yeniden olustur
	if p.Title != existing.Title && p.Slug == existing.Slug {
		slug, err := s.ensureUniqueSlug(utils.Slugify(p.Title), p.ID)
		if err != nil {
			return err
		}
		p.Slug = slug
	}

	if err := s.db.Save(p).Error; err != nil {
		return errors.New("sayfa güncellenirken bir hata oluştu")
	}
	return nil
}

// Delete sayfayi siler.
func (s *PageService) Delete(id uint64) error {
	result := s.db.Delete(&models.Page{}, id)
	if result.Error != nil {
		return errors.New("sayfa silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("sayfa bulunamadı")
	}
	return nil
}

// ensureUniqueSlug slug benzersizligini saglar.
func (s *PageService) ensureUniqueSlug(slug string, excludeID uint64) (string, error) {
	candidate := slug
	for i := 1; i <= 100; i++ {
		var count int64
		query := s.db.Model(&models.Page{}).Where("slug = ?", candidate)
		if excludeID > 0 {
			query = query.Where("id != ?", excludeID)
		}
		if err := query.Count(&count).Error; err != nil {
			return "", errors.New("slug kontrolü yapılırken bir hata oluştu")
		}
		if count == 0 {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", slug, i)
	}
	return "", errors.New("benzersiz slug oluşturulamadı")
}
