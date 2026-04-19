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

type BannerHandler struct {
	service *services.BannerService
}

func NewBannerHandler() *BannerHandler {
	return &BannerHandler{
		service: services.NewBannerService(database.DB),
	}
}

type createBannerRequest struct {
	Position       string  `json:"position"`
	Title          string  `json:"title"`
	ImageURL       string  `json:"image_url"`
	ImageURLMobile string  `json:"image_url_mobile"`
	LinkURL        string  `json:"link_url"`
	SortOrder      int     `json:"sort_order"`
	IsActive       *bool   `json:"is_active"`
	StartsAt       *string `json:"starts_at"`
	ExpiresAt      *string `json:"expires_at"`
}

// List aktif banner'lari dondurur (public).
func (h *BannerHandler) List(c *fiber.Ctx) error {
	banners, err := h.service.List()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"banners": banners,
	})
}

// GetByPosition belirli pozisyondaki banner'lari dondurur (public).
func (h *BannerHandler) GetByPosition(c *fiber.Ctx) error {
	position := c.Params("position")
	if position == "" {
		return utils.BadRequest(c, "Banner pozisyonu zorunludur")
	}

	banners, err := h.service.GetByPosition(position)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"banners": banners,
	})
}

// AdminList tum banner'lari dondurur (admin).
func (h *BannerHandler) AdminList(c *fiber.Ctx) error {
	banners, err := h.service.AdminList()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"banners": banners,
	})
}

// Create yeni banner olusturur.
func (h *BannerHandler) Create(c *fiber.Ctx) error {
	var req createBannerRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Position = strings.TrimSpace(req.Position)
	req.ImageURL = strings.TrimSpace(req.ImageURL)

	if req.Position == "" {
		return utils.BadRequest(c, "Banner pozisyonu zorunludur")
	}
	if req.ImageURL == "" {
		return utils.BadRequest(c, "Banner görseli zorunludur")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	banner := &models.Banner{
		Position:       req.Position,
		Title:          strings.TrimSpace(req.Title),
		ImageURL:       req.ImageURL,
		ImageURLMobile: strings.TrimSpace(req.ImageURLMobile),
		LinkURL:        strings.TrimSpace(req.LinkURL),
		SortOrder:      req.SortOrder,
		IsActive:       isActive,
		StartsAt:       parseOptionalTime(req.StartsAt),
		ExpiresAt:      parseOptionalTime(req.ExpiresAt),
	}

	if err := h.service.Create(banner); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"banner": banner,
	})
}

// Update mevcut banner'i gunceller.
func (h *BannerHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz banner ID'si")
	}

	var req createBannerRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Position = strings.TrimSpace(req.Position)
	req.ImageURL = strings.TrimSpace(req.ImageURL)

	if req.Position == "" {
		return utils.BadRequest(c, "Banner pozisyonu zorunludur")
	}
	if req.ImageURL == "" {
		return utils.BadRequest(c, "Banner görseli zorunludur")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	banner := &models.Banner{
		ID:             id,
		Position:       req.Position,
		Title:          strings.TrimSpace(req.Title),
		ImageURL:       req.ImageURL,
		ImageURLMobile: strings.TrimSpace(req.ImageURLMobile),
		LinkURL:        strings.TrimSpace(req.LinkURL),
		SortOrder:      req.SortOrder,
		IsActive:       isActive,
		StartsAt:       parseOptionalTime(req.StartsAt),
		ExpiresAt:      parseOptionalTime(req.ExpiresAt),
	}

	if err := h.service.Update(banner); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"banner": banner,
	})
}

// Delete banner'i siler.
func (h *BannerHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz banner ID'si")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Banner başarıyla silindi")
}
