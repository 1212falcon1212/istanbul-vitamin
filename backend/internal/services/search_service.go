package services

import (
	"errors"
	"os"
	"strings"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"github.com/meilisearch/meilisearch-go"
	"gorm.io/gorm"
)

// MySQL FULLTEXT varsayılan minimum kelime uzunluğu (ft_min_word_len = 4 / innodb_ft_min_token_size = 3).
// Bu değerden kısa sorgular için LIKE fallback'ine düşeriz.
const fulltextMinLen = 3

type SearchService struct {
	db    *gorm.DB
	meili meilisearch.ServiceManager
}

func NewSearchService(db *gorm.DB) *SearchService {
	host := os.Getenv("MEILISEARCH_HOST")
	if host == "" {
		host = "http://localhost:7700"
	}
	key := os.Getenv("MEILISEARCH_KEY")
	client := meilisearch.New(host, meilisearch.WithAPIKey(key))
	return &SearchService{db: db, meili: client}
}

const meiliIndex = "istanbulvitamin_products"

// Search Meilisearch üzerinden tam metin arama yapar, başarısız olursa DB LIKE'a düşer.
func (s *SearchService) Search(query string, page, perPage int) ([]models.Product, int64, error) {
	if query == "" {
		return []models.Product{}, 0, nil
	}

	// Meili önce
	if products, total, ok := s.searchMeili(query, page, perPage); ok {
		return products, total, nil
	}
	// Fallback: LIKE
	return s.searchDB(query, page, perPage)
}

// Autocomplete hızlı öneri — Meili kullanır, yoksa DB'ye düşer.
func (s *SearchService) Autocomplete(query string, limit int) ([]models.Product, error) {
	if query == "" {
		return []models.Product{}, nil
	}
	if limit <= 0 || limit > 10 {
		limit = 5
	}

	if products, ok := s.autocompleteMeili(query, limit); ok {
		return products, nil
	}
	return s.autocompleteDB(query, limit)
}

// -----------------------------------------------------
// Meilisearch
// -----------------------------------------------------

type meiliDoc struct {
	ID               uint64  `json:"id"`
	Name             string  `json:"name"`
	Slug             string  `json:"slug"`
	SKU              string  `json:"sku"`
	Barcode          string  `json:"barcode"`
	ShortDescription string  `json:"short_description"`
	BrandID          uint64  `json:"brand_id"`
	BrandName        string  `json:"brand_name"`
	BrandSlug        string  `json:"brand_slug"`
	Price            float64 `json:"price"`
	ComparePrice     float64 `json:"compare_price"`
	Stock            int     `json:"stock"`
	IsActive         bool    `json:"is_active"`
	IsFeatured       bool    `json:"is_featured"`
	IsCampaign       bool    `json:"is_campaign"`
	ImageURL         string  `json:"image_url"`
}

func (s *SearchService) searchMeili(query string, page, perPage int) ([]models.Product, int64, bool) {
	if s.meili == nil {
		return nil, 0, false
	}
	idx := s.meili.Index(meiliIndex)
	offset := int64(utils.GetOffset(page, perPage))
	res, err := idx.Search(query, &meilisearch.SearchRequest{
		Limit:  int64(perPage),
		Offset: offset,
		Filter: "is_active = true AND stock > 0 AND price > 1",
	})
	if err != nil {
		return nil, 0, false
	}
	products := meiliHitsToProducts(res.Hits)
	return products, res.EstimatedTotalHits, true
}

func (s *SearchService) autocompleteMeili(query string, limit int) ([]models.Product, bool) {
	if s.meili == nil {
		return nil, false
	}
	idx := s.meili.Index(meiliIndex)
	res, err := idx.Search(query, &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Filter: "is_active = true AND stock > 0 AND price > 1",
	})
	if err != nil {
		return nil, false
	}
	return meiliHitsToProducts(res.Hits), true
}

func meiliHitsToProducts(hits meilisearch.Hits) []models.Product {
	out := make([]models.Product, 0, len(hits))
	for _, h := range hits {
		var d meiliDoc
		if err := h.DecodeInto(&d); err != nil {
			continue
		}
		p := models.Product{
			ID:               d.ID,
			Name:             d.Name,
			Slug:             d.Slug,
			SKU:              d.SKU,
			Barcode:          d.Barcode,
			ShortDescription: d.ShortDescription,
			Price:            d.Price,
			Stock:            d.Stock,
			IsActive:         d.IsActive,
			IsFeatured:       d.IsFeatured,
			IsCampaign:       d.IsCampaign,
		}
		if d.ComparePrice > 0 {
			cp := d.ComparePrice
			p.ComparePrice = &cp
		}
		if d.BrandID > 0 {
			p.Brand = &models.Brand{
				ID:   d.BrandID,
				Name: d.BrandName,
				Slug: d.BrandSlug,
			}
		}
		if d.ImageURL != "" {
			p.Images = []models.ProductImage{
				{ProductID: p.ID, ImageURL: d.ImageURL, IsPrimary: true},
			}
		}
		out = append(out, p)
	}
	return out
}

// -----------------------------------------------------
// DB fallback
// -----------------------------------------------------

func (s *SearchService) searchDB(query string, page, perPage int) ([]models.Product, int64, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []models.Product{}, 0, nil
	}

	// Kısa sorgular FULLTEXT minimum token uzunluğunun altında — LIKE fallback.
	if len([]rune(query)) < fulltextMinLen {
		return s.searchDBLike(query, page, perPage)
	}

	var products []models.Product
	var total int64

	dbQuery := s.db.Model(&models.Product{}).
		Where("is_active = ?", true).
		Where("MATCH(name, short_description) AGAINST(? IN NATURAL LANGUAGE MODE)", query)

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, errors.New("arama sonuçları sayılırken bir hata oluştu")
	}
	offset := utils.GetOffset(page, perPage)
	err := dbQuery.
		Preload("Brand").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Order(gorm.Expr("MATCH(name, short_description) AGAINST(? IN NATURAL LANGUAGE MODE) DESC, sold_count DESC", query)).
		Offset(offset).
		Limit(perPage).
		Find(&products).Error
	if err != nil {
		return nil, 0, errors.New("arama yapılırken bir hata oluştu")
	}
	return products, total, nil
}

// searchDBLike, FULLTEXT için çok kısa (<3 karakter) sorgularda LIKE ile fallback arama yapar.
func (s *SearchService) searchDBLike(query string, page, perPage int) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64
	searchTerm := "%" + query + "%"

	dbQuery := s.db.Model(&models.Product{}).
		Where("is_active = ?", true).
		Where("(name LIKE ? OR short_description LIKE ?)", searchTerm, searchTerm)

	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, errors.New("arama sonuçları sayılırken bir hata oluştu")
	}
	offset := utils.GetOffset(page, perPage)
	err := dbQuery.
		Preload("Brand").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Order("sold_count DESC, name ASC").
		Offset(offset).
		Limit(perPage).
		Find(&products).Error
	if err != nil {
		return nil, 0, errors.New("arama yapılırken bir hata oluştu")
	}
	return products, total, nil
}

func (s *SearchService) autocompleteDB(query string, limit int) ([]models.Product, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []models.Product{}, nil
	}

	// Kısa sorgular için LIKE fallback.
	if len([]rune(query)) < fulltextMinLen {
		return s.autocompleteDBLike(query, limit)
	}

	var products []models.Product
	// BOOLEAN MODE ile prefix/wildcard desteği — kullanıcı girdisini sanitize edip trailing '*' ekliyoruz.
	booleanTerm := sanitizeBooleanTerm(query) + "*"

	err := s.db.Model(&models.Product{}).
		Select("id, name, slug, price, compare_price").
		Where("is_active = ?", true).
		Where("MATCH(name, short_description) AGAINST(? IN BOOLEAN MODE)", booleanTerm).
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Where("is_primary = ?", true).Limit(1)
		}).
		Order(gorm.Expr("MATCH(name, short_description) AGAINST(? IN BOOLEAN MODE) DESC, sold_count DESC", booleanTerm)).
		Limit(limit).
		Find(&products).Error
	if err != nil {
		return nil, errors.New("otomatik tamamlama sırasında bir hata oluştu")
	}
	return products, nil
}

// autocompleteDBLike, FULLTEXT için çok kısa sorgularda LIKE ile fallback autocomplete yapar.
func (s *SearchService) autocompleteDBLike(query string, limit int) ([]models.Product, error) {
	var products []models.Product
	searchTerm := "%" + query + "%"
	err := s.db.Model(&models.Product{}).
		Select("id, name, slug, price, compare_price").
		Where("is_active = ? AND name LIKE ?", true, searchTerm).
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Where("is_primary = ?", true).Limit(1)
		}).
		Order("sold_count DESC").
		Limit(limit).
		Find(&products).Error
	if err != nil {
		return nil, errors.New("otomatik tamamlama sırasında bir hata oluştu")
	}
	return products, nil
}

// sanitizeBooleanTerm, MySQL FULLTEXT BOOLEAN MODE operatörlerini kullanıcı girdisinden temizler
// (+, -, <, >, (, ), ~, *, ", @) — böylece kullanıcı girdisi yanlışlıkla operatör olarak yorumlanmaz.
func sanitizeBooleanTerm(q string) string {
	replacer := strings.NewReplacer(
		"+", " ",
		"-", " ",
		"<", " ",
		">", " ",
		"(", " ",
		")", " ",
		"~", " ",
		"*", " ",
		"\"", " ",
		"@", " ",
	)
	cleaned := strings.TrimSpace(replacer.Replace(q))
	// Çoklu boşlukları tek boşluğa indir.
	return strings.Join(strings.Fields(cleaned), " ")
}
