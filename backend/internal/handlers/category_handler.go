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

type CategoryHandler struct {
	service *services.CategoryService
}

func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{
		service: services.NewCategoryService(database.DB),
	}
}

type createCategoryRequest struct {
	Name            string  `json:"name"`
	ParentID        *uint64 `json:"parent_id"`
	Description     string  `json:"description"`
	ImageURL        string  `json:"image_url"`
	IconURL         string  `json:"icon_url"`
	SortOrder       int     `json:"sort_order"`
	IsActive        *bool   `json:"is_active"`
	MetaTitle       string  `json:"meta_title"`
	MetaDescription string  `json:"meta_description"`
}

type updateCategoryRequest struct {
	Name            *string `json:"name"`
	ParentID        *uint64 `json:"parent_id"`
	RemoveParent    bool    `json:"remove_parent"`
	Description     *string `json:"description"`
	ImageURL        *string `json:"image_url"`
	IconURL         *string `json:"icon_url"`
	SortOrder       *int    `json:"sort_order"`
	IsActive        *bool   `json:"is_active"`
	MetaTitle       *string `json:"meta_title"`
	MetaDescription *string `json:"meta_description"`
}

// List aktif kategorileri listeler (public).
func (h *CategoryHandler) List(c *fiber.Ctx) error {
	categories, err := h.service.List(true)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"categories": categories,
	})
}

// Tree kategori ağacını döndürür (public).
func (h *CategoryHandler) Tree(c *fiber.Ctx) error {
	tree, err := h.service.Tree()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"categories": tree,
	})
}

// Showcase vitrin kategorilerini ürünleriyle döndürür (public).
func (h *CategoryHandler) Showcase(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "8"))
	if limit < 1 || limit > 20 {
		limit = 8
	}

	showcases, err := h.service.Showcase(limit)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"showcases": showcases,
	})
}

// GetBySlug slug ile kategori getirir (public).
func (h *CategoryHandler) GetBySlug(c *fiber.Ctx) error {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return utils.BadRequest(c, "Kategori slug değeri zorunludur")
	}

	category, err := h.service.GetBySlug(slug)
	if err != nil {
		return utils.NotFound(c, "Kategori")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"category": category,
	})
}

// AdminList tüm kategorileri listeler (admin).
func (h *CategoryHandler) AdminList(c *fiber.Ctx) error {
	categories, err := h.service.AdminList()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"categories": categories,
	})
}

// Create yeni kategori oluşturur (admin).
func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	var req createCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return utils.BadRequest(c, "Kategori adı zorunludur")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := &models.Category{
		Name:            req.Name,
		ParentID:        req.ParentID,
		Description:     strings.TrimSpace(req.Description),
		ImageURL:        strings.TrimSpace(req.ImageURL),
		IconURL:         strings.TrimSpace(req.IconURL),
		SortOrder:       req.SortOrder,
		IsActive:        isActive,
		MetaTitle:       strings.TrimSpace(req.MetaTitle),
		MetaDescription: strings.TrimSpace(req.MetaDescription),
	}

	if err := h.service.Create(category); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"category": category,
	})
}

// Update kategoriyi günceller (admin).
func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz kategori ID")
	}

	category, err := h.service.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Kategori")
	}

	var req updateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return utils.BadRequest(c, "Kategori adı boş olamaz")
		}
		category.Name = name
	}

	if req.RemoveParent {
		category.ParentID = nil
	} else if req.ParentID != nil {
		category.ParentID = req.ParentID
	}

	if req.Description != nil {
		category.Description = strings.TrimSpace(*req.Description)
	}
	if req.ImageURL != nil {
		category.ImageURL = strings.TrimSpace(*req.ImageURL)
	}
	if req.IconURL != nil {
		category.IconURL = strings.TrimSpace(*req.IconURL)
	}
	if req.SortOrder != nil {
		category.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		category.IsActive = *req.IsActive
	}
	if req.MetaTitle != nil {
		category.MetaTitle = strings.TrimSpace(*req.MetaTitle)
	}
	if req.MetaDescription != nil {
		category.MetaDescription = strings.TrimSpace(*req.MetaDescription)
	}

	if err := h.service.Update(category); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"category": category,
	})
}

// Delete kategoriyi siler (admin).
func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz kategori ID")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Kategori başarıyla silindi")
}
