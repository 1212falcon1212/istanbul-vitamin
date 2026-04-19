package services

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/istanbulvitamin/backend/internal/cache"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

const (
	cacheKeyCategoriesTree     = "categories:tree"
	cacheKeyCategoriesShowcase = "categories:showcase"
	cacheTTLCategories         = time.Hour
)

type CategoryService struct {
	db *gorm.DB
}

func NewCategoryService(db *gorm.DB) *CategoryService {
	return &CategoryService{db: db}
}

// List aktif kategorileri sıralı şekilde getirir.
func (s *CategoryService) List(isActive bool) ([]models.Category, error) {
	var categories []models.Category
	query := s.db.Order("sort_order ASC, name ASC")
	if isActive {
		query = query.Where("is_active = ?", true)
	}
	if err := query.Find(&categories).Error; err != nil {
		return nil, errors.New("kategoriler getirilirken bir hata oluştu")
	}
	return categories, nil
}

// Showcase vitrin kategorilerini ürünleriyle birlikte döndürür.
// Sonuç 1 saat cache'lenir; productLimit key'e dahildir.
func (s *CategoryService) Showcase(productLimit int) ([]map[string]interface{}, error) {
	key := cacheKeyCategoriesShowcase + ":limit:" + strconv.Itoa(productLimit)
	return cache.Remember(context.Background(), key, cacheTTLCategories, func() ([]map[string]interface{}, error) {
		var categories []models.Category
		if err := s.db.Where("is_active = ? AND is_showcase = ?", true, true).
			Order("showcase_sort_order ASC").Find(&categories).Error; err != nil {
			return nil, errors.New("vitrin kategorileri getirilirken bir hata oluştu")
		}

		result := make([]map[string]interface{}, 0, len(categories))
		for _, cat := range categories {
			var products []models.Product
			s.db.Joins("JOIN product_categories ON product_categories.product_id = products.id").
				Where("product_categories.category_id = ? AND products.is_active = ?", cat.ID, true).
				Preload("Brand").
				Preload("Images", func(db *gorm.DB) *gorm.DB {
					return db.Order("product_images.sort_order ASC")
				}).
				Order("products.sold_count DESC, products.created_at DESC").
				Limit(productLimit).
				Find(&products)

			result = append(result, map[string]interface{}{
				"category": cat,
				"products": products,
			})
		}
		return result, nil
	})
}

// Tree aktif kategorilerin ağaç yapısını döndürür.
// Sonuç 1 saat cache'lenir.
func (s *CategoryService) Tree() ([]models.Category, error) {
	return cache.Remember(context.Background(), cacheKeyCategoriesTree, cacheTTLCategories, func() ([]models.Category, error) {
		var categories []models.Category
		if err := s.db.Where("is_active = ?", true).Order("sort_order ASC, name ASC").Find(&categories).Error; err != nil {
			return nil, errors.New("kategori ağacı oluşturulurken bir hata oluştu")
		}
		return buildCategoryTree(categories), nil
	})
}

// buildCategoryTree bellekte kategori ağacını oluşturur.
func buildCategoryTree(categories []models.Category) []models.Category {
	categoryMap := make(map[uint64]*models.Category, len(categories))
	for i := range categories {
		categories[i].Children = []models.Category{}
		categoryMap[categories[i].ID] = &categories[i]
	}

	var roots []models.Category
	for i := range categories {
		cat := &categories[i]
		if cat.ParentID != nil {
			if parent, ok := categoryMap[*cat.ParentID]; ok {
				parent.Children = append(parent.Children, *cat)
			}
		} else {
			roots = append(roots, *cat)
		}
	}

	// Kök kategorilerin güncel children değerlerini al
	for i, root := range roots {
		if updated, ok := categoryMap[root.ID]; ok {
			roots[i].Children = updated.Children
		}
	}

	return roots
}

// GetBySlug slug ile kategori getirir, alt kategoriler dahil.
func (s *CategoryService) GetBySlug(slug string) (*models.Category, error) {
	var category models.Category
	if err := s.db.Preload("Children", "is_active = ?", true, func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC, name ASC")
	}).Where("slug = ? AND is_active = ?", slug, true).First(&category).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("kategori bulunamadı")
		}
		return nil, errors.New("kategori getirilirken bir hata oluştu")
	}
	return &category, nil
}

// GetByID ID ile kategori getirir.
func (s *CategoryService) GetByID(id uint64) (*models.Category, error) {
	var category models.Category
	if err := s.db.First(&category, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("kategori bulunamadı")
		}
		return nil, errors.New("kategori getirilirken bir hata oluştu")
	}
	return &category, nil
}

// Create yeni kategori oluşturur.
func (s *CategoryService) Create(category *models.Category) error {
	category.Slug = utils.Slugify(category.Name)

	// Slug benzersizlik kontrolü
	if err := s.ensureUniqueSlug(category, 0); err != nil {
		return err
	}

	// Üst kategori varsa depth ve path hesapla
	if category.ParentID != nil {
		parent, err := s.GetByID(*category.ParentID)
		if err != nil {
			return errors.New("üst kategori bulunamadı")
		}
		category.Depth = parent.Depth + 1
	}

	if err := s.db.Create(category).Error; err != nil {
		return errors.New("kategori oluşturulurken bir hata oluştu")
	}

	// Path'i oluşturulan ID ile güncelle
	path := strconv.FormatUint(category.ID, 10)
	if category.ParentID != nil {
		parent, _ := s.GetByID(*category.ParentID)
		if parent != nil && parent.Path != "" {
			path = parent.Path + "/" + strconv.FormatUint(category.ID, 10)
		}
	}
	category.Path = path

	if err := s.db.Model(category).Update("path", path).Error; err != nil {
		return errors.New("kategori yolu güncellenirken bir hata oluştu")
	}

	s.invalidateCategoryCache()
	return nil
}

// Update kategoriyi günceller.
func (s *CategoryService) Update(category *models.Category) error {
	existing, err := s.GetByID(category.ID)
	if err != nil {
		return err
	}

	// İsim değiştiyse slug'ı yeniden oluştur
	if category.Name != existing.Name {
		category.Slug = utils.Slugify(category.Name)
		if err := s.ensureUniqueSlug(category, category.ID); err != nil {
			return err
		}
	}

	// Üst kategori değiştiyse depth ve path yeniden hesapla
	parentChanged := false
	if (category.ParentID == nil) != (existing.ParentID == nil) {
		parentChanged = true
	} else if category.ParentID != nil && existing.ParentID != nil && *category.ParentID != *existing.ParentID {
		parentChanged = true
	}

	if parentChanged {
		if category.ParentID != nil {
			// Kendisini üst kategori olarak atamayı engelle
			if *category.ParentID == category.ID {
				return errors.New("bir kategori kendisinin üst kategorisi olamaz")
			}

			parent, err := s.GetByID(*category.ParentID)
			if err != nil {
				return errors.New("üst kategori bulunamadı")
			}
			category.Depth = parent.Depth + 1
			category.Path = parent.Path + "/" + strconv.FormatUint(category.ID, 10)
		} else {
			category.Depth = 0
			category.Path = strconv.FormatUint(category.ID, 10)
		}
	}

	if err := s.db.Save(category).Error; err != nil {
		return errors.New("kategori güncellenirken bir hata oluştu")
	}

	// Üst kategori değiştiyse alt kategorilerin depth ve path değerlerini güncelle
	if parentChanged {
		if err := s.updateChildrenPaths(category); err != nil {
			return errors.New("alt kategori yolları güncellenirken bir hata oluştu")
		}
	}

	s.invalidateCategoryCache()
	return nil
}

// Delete kategoriyi siler.
func (s *CategoryService) Delete(id uint64) error {
	category, err := s.GetByID(id)
	if err != nil {
		return err
	}

	// Alt kategori kontrolü
	var childCount int64
	if err := s.db.Model(&models.Category{}).Where("parent_id = ?", id).Count(&childCount).Error; err != nil {
		return errors.New("alt kategori kontrolü yapılırken bir hata oluştu")
	}
	if childCount > 0 {
		return errors.New("alt kategorileri olan bir kategori silinemez. Önce alt kategorileri silin")
	}

	// Ürün kontrolü (product_categories many2many tablosu)
	var productCount int64
	if err := s.db.Table("product_categories").Where("category_id = ?", id).Count(&productCount).Error; err != nil {
		return errors.New("ürün kontrolü yapılırken bir hata oluştu")
	}
	if productCount > 0 {
		return errors.New("ürünleri olan bir kategori silinemez. Önce ürünleri başka kategoriye taşıyın")
	}

	if err := s.db.Delete(category).Error; err != nil {
		return errors.New("kategori silinirken bir hata oluştu")
	}

	s.invalidateCategoryCache()
	return nil
}

// invalidateCategoryCache Tree ve Showcase cache'lerini temizler.
func (s *CategoryService) invalidateCategoryCache() {
	ctx := context.Background()
	cache.Del(ctx, cacheKeyCategoriesTree)
	// Showcase key'leri farklı limit suffix'leri içerebilir — prefix ile sil.
	cache.DelPrefix(ctx, cacheKeyCategoriesShowcase)
}

// AdminList tüm kategorileri (aktif/pasif) path sırasıyla getirir.
func (s *CategoryService) AdminList() ([]models.Category, error) {
	var categories []models.Category
	if err := s.db.Order("path ASC, sort_order ASC").Find(&categories).Error; err != nil {
		return nil, errors.New("kategoriler getirilirken bir hata oluştu")
	}
	return categories, nil
}

// ensureUniqueSlug slug benzersizliğini sağlar.
func (s *CategoryService) ensureUniqueSlug(category *models.Category, excludeID uint64) error {
	baseSlug := category.Slug
	slug := baseSlug
	counter := 1

	for {
		var count int64
		query := s.db.Model(&models.Category{}).Where("slug = ?", slug)
		if excludeID > 0 {
			query = query.Where("id != ?", excludeID)
		}
		if err := query.Count(&count).Error; err != nil {
			return errors.New("slug kontrolü yapılırken bir hata oluştu")
		}
		if count == 0 {
			category.Slug = slug
			return nil
		}
		counter++
		slug = baseSlug + "-" + strconv.Itoa(counter)
	}
}

// updateChildrenPaths alt kategorilerin path ve depth değerlerini yeniden hesaplar.
func (s *CategoryService) updateChildrenPaths(parent *models.Category) error {
	var children []models.Category
	if err := s.db.Where("parent_id = ?", parent.ID).Find(&children).Error; err != nil {
		return err
	}

	for i := range children {
		children[i].Depth = parent.Depth + 1
		children[i].Path = parent.Path + "/" + strconv.FormatUint(children[i].ID, 10)
		if err := s.db.Model(&children[i]).Updates(map[string]interface{}{
			"depth": children[i].Depth,
			"path":  children[i].Path,
		}).Error; err != nil {
			return err
		}
		// Rekürsif olarak alt kategorileri güncelle
		if err := s.updateChildrenPaths(&children[i]); err != nil {
			return err
		}
	}

	return nil
}
