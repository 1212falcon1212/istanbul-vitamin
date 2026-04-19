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

type BrandHandler struct {
	service *services.BrandService
}

func NewBrandHandler() *BrandHandler {
	return &BrandHandler{
		service: services.NewBrandService(database.DB),
	}
}

type brandRequest struct {
	Name            string `json:"name"`
	LogoURL         string `json:"logo_url"`
	Description     string `json:"description"`
	IsActive        *bool  `json:"is_active"`
	SortOrder       *int   `json:"sort_order"`
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
}

// List aktif markaları sayfalı olarak listeler.
func (h *BrandHandler) List(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)

	var categoryID *uint64
	if v := c.Query("category_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			categoryID = &id
		}
	}

	brands, total, err := h.service.ListFiltered(page, perPage, categoryID)
	if err != nil {
		return utils.InternalError(c)
	}

	pagination := &utils.Pagination{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	}
	pagination.Calculate()

	return utils.PaginatedSuccessResponse(c, brands, pagination)
}

// GetBySlug slug ile aktif markayı getirir.
func (h *BrandHandler) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return utils.BadRequest(c, "Marka slug değeri gereklidir")
	}

	brand, err := h.service.GetBySlug(slug)
	if err != nil {
		return utils.NotFound(c, "Marka")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"brand": brand,
	})
}

// AdminList tüm markaları (aktif/pasif) sayfalı olarak listeler.
func (h *BrandHandler) AdminList(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)
	search := strings.TrimSpace(c.Query("search"))

	var isActive *bool
	if v := strings.TrimSpace(c.Query("is_active")); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			isActive = &b
		}
	}

	brands, total, err := h.service.AdminList(page, perPage, search, isActive)
	if err != nil {
		return utils.InternalError(c)
	}

	pagination := &utils.Pagination{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	}
	pagination.Calculate()

	return utils.PaginatedSuccessResponse(c, brands, pagination)
}

// Create yeni marka oluşturur.
func (h *BrandHandler) Create(c *fiber.Ctx) error {
	var req brandRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return utils.BadRequest(c, "Marka adı zorunludur")
	}

	brand := &models.Brand{
		Name:            req.Name,
		LogoURL:         strings.TrimSpace(req.LogoURL),
		Description:     strings.TrimSpace(req.Description),
		MetaTitle:       strings.TrimSpace(req.MetaTitle),
		MetaDescription: strings.TrimSpace(req.MetaDescription),
	}

	if req.IsActive != nil {
		brand.IsActive = *req.IsActive
	} else {
		brand.IsActive = true
	}

	if req.SortOrder != nil {
		brand.SortOrder = *req.SortOrder
	}

	if err := h.service.Create(brand); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"brand": brand,
	})
}

// Update marka bilgilerini günceller.
func (h *BrandHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz marka ID değeri")
	}

	brand, err := h.service.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Marka")
	}

	var req brandRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return utils.BadRequest(c, "Marka adı zorunludur")
	}

	brand.Name = req.Name
	brand.LogoURL = strings.TrimSpace(req.LogoURL)
	brand.Description = strings.TrimSpace(req.Description)
	brand.MetaTitle = strings.TrimSpace(req.MetaTitle)
	brand.MetaDescription = strings.TrimSpace(req.MetaDescription)

	if req.IsActive != nil {
		brand.IsActive = *req.IsActive
	}

	if req.SortOrder != nil {
		brand.SortOrder = *req.SortOrder
	}

	if err := h.service.Update(brand); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"brand": brand,
	})
}

// Delete markayı siler.
func (h *BrandHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz marka ID değeri")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Marka başarıyla silindi")
}
