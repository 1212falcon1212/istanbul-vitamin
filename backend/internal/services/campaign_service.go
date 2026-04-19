package services

import (
	"errors"
	"fmt"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type CampaignService struct {
	db *gorm.DB
}

func NewCampaignService(db *gorm.DB) *CampaignService {
	return &CampaignService{db: db}
}

// activeScope aktif olan ve zaman aralığı içindeki kampanyaları filtreler.
func (s *CampaignService) activeScope(q *gorm.DB) *gorm.DB {
	return q.Where("is_active = ?", true).
		Where("starts_at IS NULL OR starts_at <= NOW()").
		Where("expires_at IS NULL OR expires_at >= NOW()")
}

// List sadece aktif ve yayın aralığında olan kampanyaları sayfalı döndürür.
func (s *CampaignService) List(page, perPage int) ([]models.Campaign, int64, error) {
	var campaigns []models.Campaign
	var total int64

	query := s.activeScope(s.db.Model(&models.Campaign{}))

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("kampanyalar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)
	if err := query.Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&campaigns).Error; err != nil {
		return nil, 0, errors.New("kampanyalar listelenirken bir hata oluştu")
	}

	return campaigns, total, nil
}

// GetBySlug aktif ve yayın aralığındaki kampanyayı slug ile getirir.
func (s *CampaignService) GetBySlug(slug string) (*models.Campaign, error) {
	var campaign models.Campaign
	query := s.activeScope(s.db.Model(&models.Campaign{})).Where("slug = ?", slug)
	if err := query.Preload("Products", func(db *gorm.DB) *gorm.DB {
		return db.Where("products.is_active = ?", true)
	}).Preload("Products.Brand").
		Preload("Products.Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		First(&campaign).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, errors.New("kampanya getirilirken bir hata oluştu")
	}
	return &campaign, nil
}

// GetByID kampanyayı ID ile getirir (admin senaryoları).
func (s *CampaignService) GetByID(id uint64) (*models.Campaign, error) {
	var campaign models.Campaign
	if err := s.db.Preload("Products").First(&campaign, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("kampanya bulunamadı")
		}
		return nil, errors.New("kampanya getirilirken bir hata oluştu")
	}
	return &campaign, nil
}

// AdminList tüm kampanyaları (aktif/pasif) sayfalı döndürür.
func (s *CampaignService) AdminList(page, perPage int) ([]models.Campaign, int64, error) {
	var campaigns []models.Campaign
	var total int64

	query := s.db.Model(&models.Campaign{})

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("kampanyalar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)
	if err := query.Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&campaigns).Error; err != nil {
		return nil, 0, errors.New("kampanyalar listelenirken bir hata oluştu")
	}

	return campaigns, total, nil
}

// Create yeni kampanya oluşturur; slug üretir ve product ilişkisini kurar.
func (s *CampaignService) Create(campaign *models.Campaign, productIDs []uint64) error {
	if campaign.Slug == "" {
		campaign.Slug = utils.Slugify(campaign.Name)
	} else {
		campaign.Slug = utils.Slugify(campaign.Slug)
	}

	slug, err := s.ensureUniqueSlug(campaign.Slug, 0)
	if err != nil {
		return err
	}
	campaign.Slug = slug

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(campaign).Error; err != nil {
			return errors.New("kampanya oluşturulurken bir hata oluştu")
		}
		if len(productIDs) > 0 {
			products, err := s.loadProducts(tx, productIDs)
			if err != nil {
				return err
			}
			if err := tx.Model(campaign).Association("Products").Replace(products); err != nil {
				return errors.New("kampanya ürünleri ilişkilendirilirken bir hata oluştu")
			}
		}
		return nil
	})
}

// Update kampanyayı ve (verilmişse) ürün ilişkisini günceller.
// productIDs nil ise ilişkiye dokunulmaz; boş slice [] verilirse tüm ürünler kaldırılır.
func (s *CampaignService) Update(campaign *models.Campaign, productIDs *[]uint64) error {
	existing, err := s.GetByID(campaign.ID)
	if err != nil {
		return err
	}

	if campaign.Name != existing.Name {
		newSlug := utils.Slugify(campaign.Name)
		uniqueSlug, err := s.ensureUniqueSlug(newSlug, campaign.ID)
		if err != nil {
			return err
		}
		campaign.Slug = uniqueSlug
	} else {
		campaign.Slug = existing.Slug
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(campaign).Error; err != nil {
			return errors.New("kampanya güncellenirken bir hata oluştu")
		}
		if productIDs != nil {
			if len(*productIDs) == 0 {
				if err := tx.Model(campaign).Association("Products").Clear(); err != nil {
					return errors.New("kampanya ürünleri güncellenirken bir hata oluştu")
				}
			} else {
				products, err := s.loadProducts(tx, *productIDs)
				if err != nil {
					return err
				}
				if err := tx.Model(campaign).Association("Products").Replace(products); err != nil {
					return errors.New("kampanya ürünleri güncellenirken bir hata oluştu")
				}
			}
		}
		return nil
	})
}

// Delete kampanyayı ve ürün ilişkilerini kaldırır.
func (s *CampaignService) Delete(id uint64) error {
	campaign, err := s.GetByID(id)
	if err != nil {
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(campaign).Association("Products").Clear(); err != nil {
			return errors.New("kampanya ürün ilişkileri silinirken bir hata oluştu")
		}
		if err := tx.Delete(campaign).Error; err != nil {
			return errors.New("kampanya silinirken bir hata oluştu")
		}
		return nil
	})
}

// loadProducts verilen ID'ler için ürünleri getirir; eksik ID varsa hata döner.
func (s *CampaignService) loadProducts(tx *gorm.DB, ids []uint64) ([]models.Product, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var products []models.Product
	if err := tx.Where("id IN ?", ids).Find(&products).Error; err != nil {
		return nil, errors.New("kampanya ürünleri alınırken bir hata oluştu")
	}
	if len(products) != len(uniqueUint64(ids)) {
		return nil, errors.New("bir veya daha fazla ürün bulunamadı")
	}
	return products, nil
}

// ensureUniqueSlug slug'ın benzersiz olmasını sağlar; varsa -2, -3, ... ekler.
func (s *CampaignService) ensureUniqueSlug(slug string, excludeID uint64) (string, error) {
	if slug == "" {
		return "", errors.New("slug boş olamaz")
	}
	original := slug
	counter := 1
	for {
		query := s.db.Model(&models.Campaign{}).Where("slug = ?", slug)
		if excludeID > 0 {
			query = query.Where("id != ?", excludeID)
		}
		var count int64
		if err := query.Count(&count).Error; err != nil {
			return "", errors.New("slug kontrolü yapılırken bir hata oluştu")
		}
		if count == 0 {
			return slug, nil
		}
		counter++
		slug = fmt.Sprintf("%s-%d", original, counter)
	}
}

// uniqueUint64 verilen slice'ın tekilleştirilmiş halini döndürür.
func uniqueUint64(ids []uint64) []uint64 {
	seen := make(map[uint64]struct{}, len(ids))
	out := make([]uint64, 0, len(ids))
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
