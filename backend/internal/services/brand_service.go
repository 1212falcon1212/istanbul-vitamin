package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/cache"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

const (
	cacheKeyBrandsAllPrefix = "brands:all:"
	cacheKeyBrandsSpotlight = "brands:spotlight"
	cacheTTLBrandsList      = time.Hour
)

// brandListPayload cache için serialize edilen yapı — (brands, total) çiftini tutar.
type brandListPayload struct {
	Brands []models.Brand `json:"brands"`
	Total  int64          `json:"total"`
}

type BrandService struct {
	db *gorm.DB
}

func NewBrandService(db *gorm.DB) *BrandService {
	return &BrandService{db: db}
}

// List aktif markaları sayfalı olarak döndürür.
func (s *BrandService) List(page, perPage int) ([]models.Brand, int64, error) {
	return s.ListFiltered(page, perPage, nil)
}

// ListFiltered aktif markaları opsiyonel kategori filtresiyle listeler.
// categoryID verildiğinde sadece o kategoride (doğrudan veya alt ağaçta) ürünü
// bulunan markaları döner. categoryID nil ise sonuç 1 saat cache'lenir.
func (s *BrandService) ListFiltered(page, perPage int, categoryID *uint64) ([]models.Brand, int64, error) {
	if categoryID == nil {
		key := fmt.Sprintf("%sp%d:pp%d", cacheKeyBrandsAllPrefix, page, perPage)
		payload, err := cache.Remember(context.Background(), key, cacheTTLBrandsList, func() (brandListPayload, error) {
			brands, total, err := s.queryBrands(page, perPage, nil)
			if err != nil {
				return brandListPayload{}, err
			}
			return brandListPayload{Brands: brands, Total: total}, nil
		})
		if err != nil {
			return nil, 0, err
		}
		return payload.Brands, payload.Total, nil
	}

	return s.queryBrands(page, perPage, categoryID)
}

// queryBrands asıl DB sorgusunu çalıştırır.
func (s *BrandService) queryBrands(page, perPage int, categoryID *uint64) ([]models.Brand, int64, error) {
	var brands []models.Brand
	var total int64

	query := s.db.Model(&models.Brand{}).Where("brands.is_active = ?", true)

	if categoryID != nil {
		catIDs := s.descendantCategoryIDs(*categoryID)
		if len(catIDs) == 0 {
			catIDs = []uint64{*categoryID}
		}
		// Subquery ile o kategoride ürünü olan brand_id'leri çek — duplicate yok
		sub := s.db.Table("products").
			Select("DISTINCT products.brand_id").
			Joins("INNER JOIN product_categories ON product_categories.product_id = products.id").
			Where("products.is_active = 1 AND product_categories.category_id IN ?", catIDs)
		query = query.Where("brands.id IN (?)", sub)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("markalar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)
	if err := query.Order("brands.sort_order ASC, brands.name ASC").Offset(offset).Limit(perPage).Find(&brands).Error; err != nil {
		return nil, 0, errors.New("markalar listelenirken bir hata oluştu")
	}

	return brands, total, nil
}

// GetBySlug aktif markayı slug ile getirir.
func (s *BrandService) GetBySlug(slug string) (*models.Brand, error) {
	var brand models.Brand
	if err := s.db.Where("slug = ? AND is_active = ?", slug, true).First(&brand).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("marka bulunamadı")
		}
		return nil, errors.New("marka bilgisi alınırken bir hata oluştu")
	}
	return &brand, nil
}

// GetByID markayı ID ile getirir.
func (s *BrandService) GetByID(id uint64) (*models.Brand, error) {
	var brand models.Brand
	if err := s.db.First(&brand, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("marka bulunamadı")
		}
		return nil, errors.New("marka bilgisi alınırken bir hata oluştu")
	}
	return &brand, nil
}

// Create yeni marka oluşturur ve slug otomatik üretir.
func (s *BrandService) Create(brand *models.Brand) error {
	brand.Slug = utils.Slugify(brand.Name)

	// Slug benzersizliğini kontrol et
	slug, err := s.ensureUniqueSlug(brand.Slug, 0)
	if err != nil {
		return err
	}
	brand.Slug = slug

	if err := s.db.Create(brand).Error; err != nil {
		return errors.New("marka oluşturulurken bir hata oluştu")
	}
	s.invalidateBrandCache()
	return nil
}

// Update marka bilgilerini günceller, isim değiştiyse slug yeniden üretilir.
func (s *BrandService) Update(brand *models.Brand) error {
	// Mevcut markayı al
	var existing models.Brand
	if err := s.db.First(&existing, brand.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("marka bulunamadı")
		}
		return errors.New("marka bilgisi alınırken bir hata oluştu")
	}

	// İsim değiştiyse slug'ı yeniden üret
	if brand.Name != existing.Name {
		newSlug := utils.Slugify(brand.Name)
		slug, err := s.ensureUniqueSlug(newSlug, brand.ID)
		if err != nil {
			return err
		}
		brand.Slug = slug
	}

	if err := s.db.Save(brand).Error; err != nil {
		return errors.New("marka güncellenirken bir hata oluştu")
	}
	s.invalidateBrandCache()
	return nil
}

// Delete markayı siler. Ürünleri varsa hata döner.
func (s *BrandService) Delete(id uint64) error {
	var brand models.Brand
	if err := s.db.First(&brand, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("marka bulunamadı")
		}
		return errors.New("marka bilgisi alınırken bir hata oluştu")
	}

	// Ürün kontrolü
	var productCount int64
	if err := s.db.Model(&models.Product{}).Where("brand_id = ?", id).Count(&productCount).Error; err != nil {
		return errors.New("ürün kontrolü yapılırken bir hata oluştu")
	}
	if productCount > 0 {
		return errors.New("bu markaya ait ürünler bulunduğu için silinemez")
	}

	if err := s.db.Delete(&brand).Error; err != nil {
		return errors.New("marka silinirken bir hata oluştu")
	}
	s.invalidateBrandCache()
	return nil
}

// invalidateBrandCache spotlight ve sayfalanmış brand listesi cache'lerini temizler.
func (s *BrandService) invalidateBrandCache() {
	ctx := context.Background()
	cache.Del(ctx, cacheKeyBrandsSpotlight)
	cache.DelPrefix(ctx, cacheKeyBrandsAllPrefix)
}

// AdminList tüm markaları (aktif/pasif) sayfalı, aranabilir ve filtrelenebilir döndürür.
// search boş değilse name LIKE ile eşleşir; isActive nil değilse duruma göre filtreler.
func (s *BrandService) AdminList(page, perPage int, search string, isActive *bool) ([]models.Brand, int64, error) {
	var brands []models.Brand
	var total int64

	query := s.db.Model(&models.Brand{})

	if term := strings.TrimSpace(search); term != "" {
		like := "%" + term + "%"
		query = query.Where("name LIKE ? OR slug LIKE ?", like, like)
	}
	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("markalar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)
	if err := query.Order("sort_order ASC, name ASC").Offset(offset).Limit(perPage).Find(&brands).Error; err != nil {
		return nil, 0, errors.New("markalar listelenirken bir hata oluştu")
	}

	return brands, total, nil
}

// ensureUniqueSlug slug'ın benzersiz olmasını sağlar.
// excludeID > 0 ise, o ID'ye sahip kayıt hariç tutulur (güncelleme senaryosu).
func (s *BrandService) ensureUniqueSlug(slug string, excludeID uint64) (string, error) {
	originalSlug := slug
	counter := 1

	for {
		query := s.db.Model(&models.Brand{}).Where("slug = ?", slug)
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
		slug = fmt.Sprintf("%s-%d", originalSlug, counter)
	}
}

// descendantCategoryIDs kategori ve tüm alt kategorilerinin ID listesini verir.
func (s *BrandService) descendantCategoryIDs(rootID uint64) []uint64 {
	var root models.Category
	if err := s.db.Select("id, path").First(&root, rootID).Error; err != nil {
		return []uint64{rootID}
	}
	var ids []uint64
	if err := s.db.Model(&models.Category{}).
		Where("id = ? OR path LIKE ?", rootID, root.Path+"/%").
		Pluck("id", &ids).Error; err != nil {
		return []uint64{rootID}
	}
	return ids
}
