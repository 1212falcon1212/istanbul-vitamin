package services

import (
	"errors"
	"strings"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type VariationService struct {
	db *gorm.DB
}

func NewVariationService(db *gorm.DB) *VariationService {
	return &VariationService{db: db}
}

// ListTypes tüm varyasyon türlerini döndürür — admin paneli için.
// includeInactive true ise pasif olanlar da gelir.
func (s *VariationService) ListTypes(includeInactive bool) ([]models.VariationType, error) {
	var types []models.VariationType
	q := s.db.Model(&models.VariationType{})
	if !includeInactive {
		q = q.Where("is_active = ?", true)
	}
	if err := q.
		Preload("Values", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		Order("sort_order ASC, name ASC").
		Find(&types).Error; err != nil {
		return nil, errors.New("varyasyon türleri listelenirken bir hata oluştu")
	}
	return types, nil
}

// GetType tek bir varyasyon türünü değerleriyle getirir.
func (s *VariationService) GetType(id uint64) (*models.VariationType, error) {
	var t models.VariationType
	if err := s.db.
		Preload("Values", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("varyasyon türü bulunamadı")
		}
		return nil, errors.New("varyasyon türü getirilirken bir hata oluştu")
	}
	return &t, nil
}

// CreateType yeni bir varyasyon türü oluşturur. Slug otomatik.
func (s *VariationService) CreateType(t *models.VariationType) error {
	t.Name = strings.TrimSpace(t.Name)
	if t.Name == "" {
		return errors.New("tür adı zorunludur")
	}
	t.Slug = s.uniqueTypeSlug(utils.Slugify(t.Name), 0)
	if err := s.db.Create(t).Error; err != nil {
		return errors.New("varyasyon türü oluşturulamadı")
	}
	return nil
}

// UpdateType türü günceller (name + sortOrder + isActive).
// Slug değiştirilmez — stabilite için.
func (s *VariationService) UpdateType(id uint64, name string, sortOrder int, isActive bool) (*models.VariationType, error) {
	t, err := s.GetType(id)
	if err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("tür adı zorunludur")
	}
	t.Name = name
	t.SortOrder = sortOrder
	t.IsActive = isActive
	if err := s.db.Save(t).Error; err != nil {
		return nil, errors.New("varyasyon türü güncellenemedi")
	}
	return t, nil
}

// DeleteType türü ve ilişkili değerlerini (CASCADE) siler.
func (s *VariationService) DeleteType(id uint64) error {
	// Kullanımda mı kontrolü — herhangi bir variant bu türün bir değerine bağlıysa sil.
	var inUse int64
	s.db.Table("product_variant_values pvv").
		Joins("JOIN variation_values vv ON vv.id = pvv.variation_value_id").
		Where("vv.variation_type_id = ?", id).
		Count(&inUse)
	if inUse > 0 {
		return errors.New("bu tür ürün varyantlarında kullanıldığı için silinemez")
	}

	if err := s.db.Delete(&models.VariationType{}, id).Error; err != nil {
		return errors.New("varyasyon türü silinemedi")
	}
	return nil
}

// CreateValue bir türe yeni değer ekler (ör. "Kırmızı" → Renk türüne).
func (s *VariationService) CreateValue(v *models.VariationValue) error {
	v.Value = strings.TrimSpace(v.Value)
	if v.Value == "" {
		return errors.New("değer boş olamaz")
	}
	if v.VariationTypeID == 0 {
		return errors.New("tür bilgisi eksik")
	}
	// Tür gerçekten var mı?
	var count int64
	s.db.Model(&models.VariationType{}).Where("id = ?", v.VariationTypeID).Count(&count)
	if count == 0 {
		return errors.New("bu tür bulunamadı")
	}
	v.Slug = s.uniqueValueSlug(v.VariationTypeID, utils.Slugify(v.Value), 0)
	if err := s.db.Create(v).Error; err != nil {
		return errors.New("değer oluşturulamadı")
	}
	return nil
}

// UpdateValue değeri günceller.
func (s *VariationService) UpdateValue(id uint64, value, colorHex string, sortOrder int, isActive bool) (*models.VariationValue, error) {
	var v models.VariationValue
	if err := s.db.First(&v, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("değer bulunamadı")
		}
		return nil, errors.New("değer getirilirken bir hata oluştu")
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, errors.New("değer boş olamaz")
	}
	v.Value = value
	v.ColorHex = strings.TrimSpace(colorHex)
	v.SortOrder = sortOrder
	v.IsActive = isActive
	if err := s.db.Save(&v).Error; err != nil {
		return nil, errors.New("değer güncellenemedi")
	}
	return &v, nil
}

// DeleteValue değeri siler. Kullanımdaysa reddeder.
func (s *VariationService) DeleteValue(id uint64) error {
	var inUse int64
	s.db.Model(&models.ProductVariantValue{}).Where("variation_value_id = ?", id).Count(&inUse)
	if inUse > 0 {
		return errors.New("bu değer varyantlarda kullanıldığı için silinemez")
	}
	if err := s.db.Delete(&models.VariationValue{}, id).Error; err != nil {
		return errors.New("değer silinemedi")
	}
	return nil
}

// --- slug helpers ---

func (s *VariationService) uniqueTypeSlug(base string, excludeID uint64) string {
	candidate := base
	counter := 1
	for {
		q := s.db.Model(&models.VariationType{}).Where("slug = ?", candidate)
		if excludeID > 0 {
			q = q.Where("id <> ?", excludeID)
		}
		var count int64
		q.Count(&count)
		if count == 0 {
			return candidate
		}
		counter++
		candidate = base + "-" + itoa(counter)
	}
}

func (s *VariationService) uniqueValueSlug(typeID uint64, base string, excludeID uint64) string {
	candidate := base
	counter := 1
	for {
		q := s.db.Model(&models.VariationValue{}).
			Where("variation_type_id = ? AND slug = ?", typeID, candidate)
		if excludeID > 0 {
			q = q.Where("id <> ?", excludeID)
		}
		var count int64
		q.Count(&count)
		if count == 0 {
			return candidate
		}
		counter++
		candidate = base + "-" + itoa(counter)
	}
}

func itoa(n int) string {
	// minimal int-to-string helper — strconv bağımlılığını getirmemek için inline.
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := make([]byte, 0, 8)
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}
