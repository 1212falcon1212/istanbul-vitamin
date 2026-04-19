package handlers

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type SliderHandler struct {
	service *services.SliderService
}

func NewSliderHandler() *SliderHandler {
	return &SliderHandler{
		service: services.NewSliderService(database.DB),
	}
}

type createSliderRequest struct {
	Title          string  `json:"title"`
	Subtitle       string  `json:"subtitle"`
	ImageURL       string  `json:"image_url"`
	ImageURLMobile string  `json:"image_url_mobile"`
	LinkURL        string  `json:"link_url"`
	ButtonText     string  `json:"button_text"`
	SortOrder      int     `json:"sort_order"`
	IsActive       *bool   `json:"is_active"`
	StartsAt       *string `json:"starts_at"`
	ExpiresAt      *string `json:"expires_at"`
}

// List aktif slider'lari dondurur (public).
func (h *SliderHandler) List(c *fiber.Ctx) error {
	sliders, err := h.service.List()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"sliders": sliders,
	})
}

// AdminList tum slider'lari dondurur (admin).
func (h *SliderHandler) AdminList(c *fiber.Ctx) error {
	sliders, err := h.service.AdminList()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"sliders": sliders,
	})
}

// Create yeni slider olusturur.
func (h *SliderHandler) Create(c *fiber.Ctx) error {
	var req createSliderRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.ImageURL = strings.TrimSpace(req.ImageURL)
	if req.ImageURL == "" {
		return utils.BadRequest(c, "Slider görseli zorunludur")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	slider := &models.Slider{
		Title:          strings.TrimSpace(req.Title),
		Subtitle:       strings.TrimSpace(req.Subtitle),
		ImageURL:       req.ImageURL,
		ImageURLMobile: strings.TrimSpace(req.ImageURLMobile),
		LinkURL:        strings.TrimSpace(req.LinkURL),
		ButtonText:     strings.TrimSpace(req.ButtonText),
		SortOrder:      req.SortOrder,
		IsActive:       isActive,
		StartsAt:       parseOptionalTime(req.StartsAt),
		ExpiresAt:      parseOptionalTime(req.ExpiresAt),
	}

	if err := h.service.Create(slider); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"slider": slider,
	})
}

// Update mevcut slider'i gunceller.
func (h *SliderHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz slider ID'si")
	}

	var req createSliderRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.ImageURL = strings.TrimSpace(req.ImageURL)
	if req.ImageURL == "" {
		return utils.BadRequest(c, "Slider görseli zorunludur")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	slider := &models.Slider{
		ID:             id,
		Title:          strings.TrimSpace(req.Title),
		Subtitle:       strings.TrimSpace(req.Subtitle),
		ImageURL:       req.ImageURL,
		ImageURLMobile: strings.TrimSpace(req.ImageURLMobile),
		LinkURL:        strings.TrimSpace(req.LinkURL),
		ButtonText:     strings.TrimSpace(req.ButtonText),
		SortOrder:      req.SortOrder,
		IsActive:       isActive,
		StartsAt:       parseOptionalTime(req.StartsAt),
		ExpiresAt:      parseOptionalTime(req.ExpiresAt),
	}

	if err := h.service.Update(slider); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"slider": slider,
	})
}

// Delete slider'i siler.
func (h *SliderHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz slider ID'si")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Slider başarıyla silindi")
}

// parseOptionalTime string'den time.Time pointer parse eder.
func parseOptionalTime(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		// Alternatif format dene
		t, err = time.Parse("2006-01-02 15:04:05", *s)
		if err != nil {
			return nil
		}
	}
	return &t
}
