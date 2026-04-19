package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type ProductHandler struct {
	service *services.ProductService
}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{
		service: services.NewProductService(database.DB),
	}
}

// ---------- Request structs ----------

type createProductRequest struct {
	Name              string                    `json:"name"`
	SKU               string                    `json:"sku"`
	Barcode           string                    `json:"barcode"`
	BrandID           *uint64                   `json:"brand_id"`
	ShortDescription  string                    `json:"short_description"`
	Description       string                    `json:"description"`
	Price             float64                   `json:"price"`
	ComparePrice      *float64                  `json:"compare_price"`
	CostPrice         *float64                  `json:"cost_price"`
	Stock             int                       `json:"stock"`
	LowStockThreshold int                      `json:"low_stock_threshold"`
	Weight            *float64                  `json:"weight"`
	IsActive          *bool                     `json:"is_active"`
	IsFeatured        bool                      `json:"is_featured"`
	IsCampaign        bool                      `json:"is_campaign"`
	TaxRate           float64                   `json:"tax_rate"`
	MetaTitle         string                    `json:"meta_title"`
	MetaDescription   string                    `json:"meta_description"`
	CategoryIDs       []uint64                  `json:"category_ids"`
	PrimaryCategoryID *uint64                   `json:"primary_category_id"`
	Tags              []string                  `json:"tags"`
	Images            []createProductImageInput `json:"images"`
	Variants          []createProductVariant    `json:"variants"`
}

type createProductImageInput struct {
	ImageURL  string `json:"image_url"`
	AltText   string `json:"alt_text"`
	SortOrder int    `json:"sort_order"`
	IsPrimary bool   `json:"is_primary"`
}

type createProductVariant struct {
	Name         string   `json:"name"`
	SKU          string   `json:"sku"`
	Barcode      string   `json:"barcode"`
	Price        float64  `json:"price"`
	ComparePrice *float64 `json:"compare_price"`
	Stock        int      `json:"stock"`
	IsActive     bool     `json:"is_active"`
	SortOrder    int      `json:"sort_order"`
}

type updateStockRequest struct {
	Stock int `json:"stock"`
}

// ---------- Public endpoints ----------

// List halka acik urun listesi dondurur.
func (h *ProductHandler) List(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)
	params := services.ProductListParams{
		Page:    page,
		PerPage: perPage,
		SortBy:  c.Query("sort"),
		Search:  strings.TrimSpace(c.Query("search")),
	}

	isActive := true
	params.IsActive = &isActive

	if v := c.Query("category_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			params.CategoryID = &id
		}
	}
	if v := c.Query("brand_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			params.BrandID = &id
		}
	}
	if v := c.Query("min_price"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil {
			params.MinPrice = &p
		}
	}
	if v := c.Query("max_price"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil {
			params.MaxPrice = &p
		}
	}
	if v := strings.TrimSpace(c.Query("concern")); v != "" {
		params.ConcernKeywords = ConcernKeywords(v)
	}

	products, total, err := h.service.List(params)
	if err != nil {
		return utils.InternalError(c)
	}

	pagination := &utils.Pagination{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	}
	pagination.Calculate()

	return utils.PaginatedSuccessResponse(c, fiber.Map{
		"products": products,
	}, pagination)
}

// Featured one cikan urunleri dondurur.
func (h *ProductHandler) Featured(c *fiber.Ctx) error {
	limit := 8
	if v := c.Query("limit"); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	products, err := h.service.Featured(limit)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"products": products,
	})
}

// GetBySlug slug ile urun detayi dondurur.
func (h *ProductHandler) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return utils.BadRequest(c, "Ürün slug'ı zorunludur")
	}

	product, err := h.service.GetBySlug(slug)
	if err != nil {
		return utils.NotFound(c, "Ürün")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"product": product,
	})
}

// ---------- Admin endpoints ----------

// AdminGetByID admin düzenleme sayfası için numeric ID ile ürün detayı döner
// (inaktif ürünler dahil, tüm ilişkiler preload).
func (h *ProductHandler) AdminGetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ürün ID'si")
	}

	product, err := h.service.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Ürün")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"product": product,
	})
}

// AdminList admin icin urun listesi dondurur (inaktif urunler dahil).
func (h *ProductHandler) AdminList(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)
	params := services.ProductListParams{
		Page:    page,
		PerPage: perPage,
		SortBy:  c.Query("sort"),
		Search:  strings.TrimSpace(c.Query("search")),
	}

	// Admin is_active filtresini opsiyonel kullanir
	if v := c.Query("is_active"); v != "" {
		isActive := v == "true" || v == "1"
		params.IsActive = &isActive
	}

	if v := c.Query("category_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			params.CategoryID = &id
		}
	}
	if v := c.Query("brand_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			params.BrandID = &id
		}
	}
	if v := c.Query("min_price"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil {
			params.MinPrice = &p
		}
	}
	if v := c.Query("max_price"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil {
			params.MaxPrice = &p
		}
	}

	products, total, err := h.service.AdminList(params)
	if err != nil {
		return utils.InternalError(c)
	}

	pagination := &utils.Pagination{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	}
	pagination.Calculate()

	return utils.PaginatedSuccessResponse(c, fiber.Map{
		"products": products,
	}, pagination)
}

// Create yeni urun olusturur.
func (h *ProductHandler) Create(c *fiber.Ctx) error {
	var req createProductRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.SKU = strings.TrimSpace(req.SKU)

	if req.Name == "" {
		return utils.BadRequest(c, "Ürün adı zorunludur")
	}
	if req.SKU == "" {
		return utils.BadRequest(c, "SKU zorunludur")
	}
	if req.Price <= 0 {
		return utils.BadRequest(c, "Fiyat sıfırdan büyük olmalıdır")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product := &models.Product{
		Name:              req.Name,
		SKU:               req.SKU,
		Barcode:           strings.TrimSpace(req.Barcode),
		BrandID:           req.BrandID,
		ShortDescription:  strings.TrimSpace(req.ShortDescription),
		Description:       req.Description,
		Price:             req.Price,
		ComparePrice:      req.ComparePrice,
		CostPrice:         req.CostPrice,
		Stock:             req.Stock,
		LowStockThreshold: req.LowStockThreshold,
		Weight:            req.Weight,
		IsActive:          isActive,
		IsFeatured:        req.IsFeatured,
		IsCampaign:        req.IsCampaign,
		TaxRate:           req.TaxRate,
		MetaTitle:         strings.TrimSpace(req.MetaTitle),
		MetaDescription:   strings.TrimSpace(req.MetaDescription),
	}

	if err := h.service.Create(product, req.CategoryIDs, req.PrimaryCategoryID, req.Tags); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	// Gorselleri ekle
	if len(req.Images) > 0 {
		var images []models.ProductImage
		for _, img := range req.Images {
			images = append(images, models.ProductImage{
				ProductID: product.ID,
				ImageURL:  strings.TrimSpace(img.ImageURL),
				AltText:   strings.TrimSpace(img.AltText),
				SortOrder: img.SortOrder,
				IsPrimary: img.IsPrimary,
			})
		}
		if err := h.service.UpdateImages(product.ID, images); err != nil {
			return utils.BadRequest(c, err.Error())
		}
	}

	// Varyantlari ekle
	if len(req.Variants) > 0 {
		for _, v := range req.Variants {
			variant := models.ProductVariant{
				ProductID:    product.ID,
				Name:         strings.TrimSpace(v.Name),
				SKU:          strings.TrimSpace(v.SKU),
				Barcode:      strings.TrimSpace(v.Barcode),
				Price:        v.Price,
				ComparePrice: v.ComparePrice,
				Stock:        v.Stock,
				IsActive:     v.IsActive,
				SortOrder:    v.SortOrder,
			}
			if err := database.DB.Create(&variant).Error; err != nil {
				return utils.BadRequest(c, "Varyant oluşturulurken bir hata oluştu")
			}
		}
	}

	// Tam urun bilgilerini getir
	fullProduct, err := h.service.GetByID(product.ID)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.CreatedResponse(c, fiber.Map{
		"product": fullProduct,
	})
}

// Update mevcut urunu gunceller.
func (h *ProductHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ürün ID'si")
	}

	existing, err := h.service.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Ürün")
	}

	var req createProductRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.SKU = strings.TrimSpace(req.SKU)

	if req.Name == "" {
		return utils.BadRequest(c, "Ürün adı zorunludur")
	}
	if req.SKU == "" {
		return utils.BadRequest(c, "SKU zorunludur")
	}
	if req.Price <= 0 {
		return utils.BadRequest(c, "Fiyat sıfırdan büyük olmalıdır")
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	existing.Name = req.Name
	existing.SKU = req.SKU
	existing.Barcode = strings.TrimSpace(req.Barcode)
	existing.BrandID = req.BrandID
	existing.ShortDescription = strings.TrimSpace(req.ShortDescription)
	existing.Description = req.Description
	existing.Price = req.Price
	existing.ComparePrice = req.ComparePrice
	existing.CostPrice = req.CostPrice
	existing.Stock = req.Stock
	existing.LowStockThreshold = req.LowStockThreshold
	existing.Weight = req.Weight
	existing.IsActive = isActive
	existing.IsFeatured = req.IsFeatured
	existing.IsCampaign = req.IsCampaign
	existing.TaxRate = req.TaxRate
	existing.MetaTitle = strings.TrimSpace(req.MetaTitle)
	existing.MetaDescription = strings.TrimSpace(req.MetaDescription)

	if err := h.service.Update(existing, req.CategoryIDs, req.PrimaryCategoryID, req.Tags); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	// Gorselleri guncelle
	if req.Images != nil {
		var images []models.ProductImage
		for _, img := range req.Images {
			images = append(images, models.ProductImage{
				ProductID: id,
				ImageURL:  strings.TrimSpace(img.ImageURL),
				AltText:   strings.TrimSpace(img.AltText),
				SortOrder: img.SortOrder,
				IsPrimary: img.IsPrimary,
			})
		}
		if err := h.service.UpdateImages(id, images); err != nil {
			return utils.BadRequest(c, err.Error())
		}
	}

	// Varyantlari guncelle (sil + yeniden olustur)
	if req.Variants != nil {
		if err := database.DB.Where("product_id = ?", id).Delete(&models.ProductVariant{}).Error; err != nil {
			return utils.BadRequest(c, "Varyantlar güncellenirken bir hata oluştu")
		}
		for _, v := range req.Variants {
			variant := models.ProductVariant{
				ProductID:    id,
				Name:         strings.TrimSpace(v.Name),
				SKU:          strings.TrimSpace(v.SKU),
				Barcode:      strings.TrimSpace(v.Barcode),
				Price:        v.Price,
				ComparePrice: v.ComparePrice,
				Stock:        v.Stock,
				IsActive:     v.IsActive,
				SortOrder:    v.SortOrder,
			}
			if err := database.DB.Create(&variant).Error; err != nil {
				return utils.BadRequest(c, "Varyant oluşturulurken bir hata oluştu")
			}
		}
	}

	// Tam urun bilgilerini getir
	fullProduct, err := h.service.GetByID(id)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"product": fullProduct,
	})
}

// Delete urunu siler.
func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ürün ID'si")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Ürün başarıyla silindi")
}
