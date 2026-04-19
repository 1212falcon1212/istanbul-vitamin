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

type PageHandler struct {
	service *services.PageService
}

func NewPageHandler() *PageHandler {
	return &PageHandler{
		service: services.NewPageService(database.DB),
	}
}

type createPageRequest struct {
	Title           string `json:"title"`
	Slug            string `json:"slug"`
	Content         string `json:"content"`
	IsActive        *bool  `json:"is_active"`
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
}

// GetBySlug slug ile sayfayi dondurur (public).
func (h *PageHandler) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return utils.BadRequest(c, "Sayfa slug'ı zorunludur")
	}

	page, err := h.service.GetBySlug(slug)
	if err != nil {
		return utils.NotFound(c, "Sayfa")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"page": page,
	})
}

// AdminList admin icin sayfalanmis sayfa listesi dondurur.
func (h *PageHandler) AdminList(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)

	pages, total, err := h.service.List(page, perPage)
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
		"pages": pages,
	}, pagination)
}

// Create yeni sayfa olusturur.
func (h *PageHandler) Create(c *fiber.Ctx) error {
	var req createPageRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		return utils.BadRequest(c, "Sayfa başlığı zorunludur")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	p := &models.Page{
		Title:           req.Title,
		Slug:            strings.TrimSpace(req.Slug),
		Content:         req.Content,
		IsActive:        isActive,
		MetaTitle:       strings.TrimSpace(req.MetaTitle),
		MetaDescription: strings.TrimSpace(req.MetaDescription),
	}

	if err := h.service.Create(p); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"page": p,
	})
}

// Update mevcut sayfayi gunceller.
func (h *PageHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz sayfa ID'si")
	}

	var req createPageRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		return utils.BadRequest(c, "Sayfa başlığı zorunludur")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	p := &models.Page{
		ID:              id,
		Title:           req.Title,
		Slug:            strings.TrimSpace(req.Slug),
		Content:         req.Content,
		IsActive:        isActive,
		MetaTitle:       strings.TrimSpace(req.MetaTitle),
		MetaDescription: strings.TrimSpace(req.MetaDescription),
	}

	if err := h.service.Update(p); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"page": p,
	})
}

// Delete sayfayi siler.
func (h *PageHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz sayfa ID'si")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Sayfa başarıyla silindi")
}
