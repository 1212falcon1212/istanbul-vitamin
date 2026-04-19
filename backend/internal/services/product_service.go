package services

import (
	"errors"
	"fmt"

	"github.com/istanbulvitamin/backend/internal/integrations"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type ProductListParams struct {
	Page            int
	PerPage         int
	CategoryID      *uint64
	BrandID         *uint64
	MinPrice        *float64
	MaxPrice        *float64
	SortBy          string
	Search          string
	IsActive        *bool
	ConcernKeywords []string
}

type ProductService struct {
	db *gorm.DB
}

func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{db: db}
}

// List sayfalanmis ve filtrelenmis urun listesi dondurur.
func (s *ProductService) List(params ProductListParams) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	query := s.db.Model(&models.Product{})

	if params.IsActive != nil {
		query = query.Where("products.is_active = ?", *params.IsActive)
	}

	if params.BrandID != nil {
		query = query.Where("products.brand_id = ?", *params.BrandID)
	}

	if params.MinPrice != nil {
		query = query.Where("products.price >= ?", *params.MinPrice)
	}

	if params.MaxPrice != nil {
		query = query.Where("products.price <= ?", *params.MaxPrice)
	}

	if params.Search != "" {
		searchTerm := "%" + params.Search + "%"
		query = query.Where("(products.name LIKE ? OR products.sku LIKE ? OR products.barcode LIKE ?)", searchTerm, searchTerm, searchTerm)
	}

	if len(params.ConcernKeywords) > 0 {
		orQ := s.db.Model(&models.Product{})
		for i, kw := range params.ConcernKeywords {
			if i == 0 {
				orQ = orQ.Where("products.name LIKE ? OR products.description LIKE ?", kw, kw)
			} else {
				orQ = orQ.Or("products.name LIKE ? OR products.description LIKE ?", kw, kw)
			}
		}
		query = query.Where(orQ)
	}

	if params.CategoryID != nil {
		// Kategori ve tüm alt kategorilerindeki ürünleri dahil et.
		// Subquery ile distinct product_id listesi — JOIN'den doğan duplicate'i engeller
		// ve Count/Find ikisi de temiz kalır.
		descIDs, err := s.descendantCategoryIDs(*params.CategoryID)
		if err != nil || len(descIDs) == 0 {
			descIDs = []uint64{*params.CategoryID}
		}
		sub := s.db.Table("product_categories").
			Select("DISTINCT product_id").
			Where("category_id IN ?", descIDs)
		query = query.Where("products.id IN (?)", sub)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("ürünler sayılırken bir hata oluştu")
	}

	switch params.SortBy {
	case "price_asc":
		query = query.Order("products.price ASC")
	case "price_desc":
		query = query.Order("products.price DESC")
	case "newest":
		query = query.Order("products.created_at DESC")
	case "best_seller":
		query = query.Order("products.sold_count DESC")
	case "trending":
		query = query.Order("products.sold_count DESC, products.view_count DESC")
	case "featured":
		query = query.Where("products.is_featured = ?", true).Order("products.created_at DESC")
	case "name_asc":
		query = query.Order("products.name ASC")
	default:
		query = query.Order("products.created_at DESC")
	}

	offset := utils.GetOffset(params.Page, params.PerPage)

	err := query.
		Preload("Brand").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Preload("Tags").
		Offset(offset).
		Limit(params.PerPage).
		Find(&products).Error
	if err != nil {
		return nil, 0, errors.New("ürünler listelenirken bir hata oluştu")
	}

	return products, total, nil
}

// Featured aktif ve one cikan urunleri dondurur.
func (s *ProductService) Featured(limit int) ([]models.Product, error) {
	var products []models.Product

	err := s.db.
		Where("is_active = ? AND is_featured = ?", true, true).
		Preload("Brand").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Order("created_at DESC").
		Limit(limit).
		Find(&products).Error
	if err != nil {
		return nil, errors.New("öne çıkan ürünler getirilirken bir hata oluştu")
	}

	return products, nil
}

// GetBySlug slug ile urun getirir ve goruntulenme sayisini arttirir.
func (s *ProductService) GetBySlug(slug string) (*models.Product, error) {
	var product models.Product

	err := s.db.
		Where("slug = ?", slug).
		Preload("Brand").
		Preload("Categories").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Preload("Variants", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_variants.sort_order ASC")
		}).
		Preload("Tags").
		First(&product).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("ürün bulunamadı")
		}
		return nil, errors.New("ürün getirilirken bir hata oluştu")
	}

	// Goruntulenme sayisini arttir (asenkron olarak, hata onemli degil)
	s.db.Model(&product).UpdateColumn("view_count", gorm.Expr("view_count + 1"))

	return &product, nil
}

// GetByID id ile urun getirir.
func (s *ProductService) GetByID(id uint64) (*models.Product, error) {
	var product models.Product

	err := s.db.
		Preload("Brand").
		Preload("Categories").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Preload("Variants", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_variants.sort_order ASC")
		}).
		Preload("Tags").
		First(&product, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("ürün bulunamadı")
		}
		return nil, errors.New("ürün getirilirken bir hata oluştu")
	}

	return &product, nil
}

// Create yeni urun olusturur (kategoriler ve etiketlerle birlikte).
func (s *ProductService) Create(product *models.Product, categoryIDs []uint64, primaryCategoryID *uint64, tags []string) error {
	product.Slug = utils.Slugify(product.Name)

	// Slug benzersizligini kontrol et
	slug, err := s.ensureUniqueSlug(product.Slug, 0)
	if err != nil {
		return err
	}
	product.Slug = slug

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(product).Error; err != nil {
			return errors.New("ürün oluşturulurken bir hata oluştu")
		}

		// Kategorileri ekle
		if err := s.createProductCategories(tx, product.ID, categoryIDs, primaryCategoryID); err != nil {
			return err
		}

		// Etiketleri ekle
		if err := s.createProductTags(tx, product.ID, tags); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return err
	}

	// Meilisearch async sync (hata olursa log'a yazılır, ana akış bloklanmaz)
	integrations.IndexProduct(product.ID)
	return nil
}

// Update mevcut urunu gunceller (kategoriler ve etiketlerle birlikte).
func (s *ProductService) Update(product *models.Product, categoryIDs []uint64, primaryCategoryID *uint64, tags []string) error {
	// Mevcut urunu kontrol et
	var existing models.Product
	if err := s.db.First(&existing, product.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("ürün bulunamadı")
		}
		return errors.New("ürün getirilirken bir hata oluştu")
	}

	// Isim degistiyse slug'i yeniden olustur
	if product.Name != existing.Name {
		slug, err := s.ensureUniqueSlug(utils.Slugify(product.Name), product.ID)
		if err != nil {
			return err
		}
		product.Slug = slug
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(product).Error; err != nil {
			return errors.New("ürün güncellenirken bir hata oluştu")
		}

		// Kategorileri degistir
		if err := tx.Where("product_id = ?", product.ID).Delete(&models.ProductCategory{}).Error; err != nil {
			return errors.New("ürün kategorileri güncellenirken bir hata oluştu")
		}
		if err := s.createProductCategories(tx, product.ID, categoryIDs, primaryCategoryID); err != nil {
			return err
		}

		// Etiketleri degistir
		if err := tx.Where("product_id = ?", product.ID).Delete(&models.ProductTag{}).Error; err != nil {
			return errors.New("ürün etiketleri güncellenirken bir hata oluştu")
		}
		if err := s.createProductTags(tx, product.ID, tags); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return err
	}

	integrations.IndexProduct(product.ID)
	return nil
}

// Delete urunu siler. Siparis varsa hata dondurur.
func (s *ProductService) Delete(id uint64) error {
	// Siparis kontrolu
	var orderItemCount int64
	if err := s.db.Model(&models.OrderItem{}).Where("product_id = ?", id).Count(&orderItemCount).Error; err != nil {
		return errors.New("sipariş kontrolü yapılırken bir hata oluştu")
	}
	if orderItemCount > 0 {
		return errors.New("bu ürüne ait siparişler bulunduğu için silinemez")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		// Iliskileri sil
		if err := tx.Where("product_id = ?", id).Delete(&models.ProductImage{}).Error; err != nil {
			return errors.New("ürün görselleri silinirken bir hata oluştu")
		}
		if err := tx.Where("product_id = ?", id).Delete(&models.ProductVariant{}).Error; err != nil {
			return errors.New("ürün varyantları silinirken bir hata oluştu")
		}
		if err := tx.Where("product_id = ?", id).Delete(&models.ProductTag{}).Error; err != nil {
			return errors.New("ürün etiketleri silinirken bir hata oluştu")
		}
		if err := tx.Where("product_id = ?", id).Delete(&models.ProductCategory{}).Error; err != nil {
			return errors.New("ürün kategorileri silinirken bir hata oluştu")
		}

		if err := tx.Delete(&models.Product{}, id).Error; err != nil {
			return errors.New("ürün silinirken bir hata oluştu")
		}

		return nil
	}); err != nil {
		return err
	}

	integrations.DeleteProduct(id)
	return nil
}

// AdminList admin icin urun listesi dondurur (inaktif urunler dahil).
func (s *ProductService) AdminList(params ProductListParams) ([]models.Product, int64, error) {
	// Admin listesinde is_active filtresi opsiyonel (zorunlu degil)
	return s.List(params)
}

// UpdateStock urunun stok miktarini gunceller.
func (s *ProductService) UpdateStock(id uint64, stock int) error {
	result := s.db.Model(&models.Product{}).Where("id = ?", id).Update("stock", stock)
	if result.Error != nil {
		return errors.New("stok güncellenirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("ürün bulunamadı")
	}
	return nil
}

// UpdateImages urunun gorsellerini degistirir.
func (s *ProductService) UpdateImages(productID uint64, images []models.ProductImage) error {
	// Urun var mi kontrol et
	var count int64
	if err := s.db.Model(&models.Product{}).Where("id = ?", productID).Count(&count).Error; err != nil || count == 0 {
		return errors.New("ürün bulunamadı")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		// Mevcut gorselleri sil
		if err := tx.Where("product_id = ?", productID).Delete(&models.ProductImage{}).Error; err != nil {
			return errors.New("mevcut görseller silinirken bir hata oluştu")
		}

		// Yeni gorselleri ekle
		for i := range images {
			images[i].ProductID = productID
			images[i].ID = 0
		}
		if len(images) > 0 {
			if err := tx.Create(&images).Error; err != nil {
				return errors.New("görseller eklenirken bir hata oluştu")
			}
		}

		return nil
	})
}

// ensureUniqueSlug slug benzersizligini saglar.
func (s *ProductService) ensureUniqueSlug(slug string, excludeID uint64) (string, error) {
	candidate := slug
	for i := 1; i <= 100; i++ {
		var count int64
		query := s.db.Model(&models.Product{}).Where("slug = ?", candidate)
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

// createProductCategories urun-kategori iliskilerini olusturur.
func (s *ProductService) createProductCategories(tx *gorm.DB, productID uint64, categoryIDs []uint64, primaryCategoryID *uint64) error {
	for _, catID := range categoryIDs {
		pc := models.ProductCategory{
			ProductID:  productID,
			CategoryID: catID,
			IsPrimary:  primaryCategoryID != nil && *primaryCategoryID == catID,
		}
		if err := tx.Create(&pc).Error; err != nil {
			return errors.New("ürün kategorileri oluşturulurken bir hata oluştu")
		}
	}
	return nil
}

// createProductTags urun etiketlerini olusturur.
func (s *ProductService) createProductTags(tx *gorm.DB, productID uint64, tags []string) error {
	for _, tag := range tags {
		if tag == "" {
			continue
		}
		pt := models.ProductTag{
			ProductID: productID,
			Tag:       tag,
		}
		if err := tx.Create(&pt).Error; err != nil {
			return errors.New("ürün etiketleri oluşturulurken bir hata oluştu")
		}
	}
	return nil
}

// descendantCategoryIDs verilen kategoriyi ve tüm alt kategorilerinin ID listesini
// categories.path LIKE 'path/%' eşlemesiyle tek sorguda döndürür.
func (s *ProductService) descendantCategoryIDs(rootID uint64) ([]uint64, error) {
	var root models.Category
	if err := s.db.Select("id, path").First(&root, rootID).Error; err != nil {
		return nil, err
	}
	var ids []uint64
	if err := s.db.Model(&models.Category{}).
		Where("id = ? OR path LIKE ?", rootID, root.Path+"/%").
		Pluck("id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

