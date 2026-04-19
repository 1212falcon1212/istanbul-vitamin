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

type VariationHandler struct {
	service *services.VariationService
}

func NewVariationHandler() *VariationHandler {
	return &VariationHandler{service: services.NewVariationService(database.DB)}
}

type variationTypeRequest struct {
	Name      string `json:"name"`
	SortOrder int    `json:"sort_order"`
	IsActive  *bool  `json:"is_active"`
}

type variationValueRequest struct {
	VariationTypeID uint64 `json:"variation_type_id"`
	Value           string `json:"value"`
	ColorHex        string `json:"color_hex"`
	SortOrder       int    `json:"sort_order"`
	IsActive        *bool  `json:"is_active"`
}

// --- Types ---

// ListTypes tüm varyasyon türlerini + değerlerini döndürür (admin).
func (h *VariationHandler) ListTypes(c *fiber.Ctx) error {
	types, err := h.service.ListTypes(true)
	if err != nil {
		return utils.InternalError(c)
	}
	return utils.SuccessResponse(c, fiber.Map{"types": types})
}

// PublicListTypes — sadece aktif türleri ve değerleri döner (store ürün kartı filtreleri için).
func (h *VariationHandler) PublicListTypes(c *fiber.Ctx) error {
	types, err := h.service.ListTypes(false)
	if err != nil {
		return utils.InternalError(c)
	}
	return utils.SuccessResponse(c, fiber.Map{"types": types})
}

func (h *VariationHandler) CreateType(c *fiber.Ctx) error {
	var req variationTypeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}
	t := &models.VariationType{
		Name:      strings.TrimSpace(req.Name),
		SortOrder: req.SortOrder,
		IsActive:  true,
	}
	if req.IsActive != nil {
		t.IsActive = *req.IsActive
	}
	if err := h.service.CreateType(t); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.CreatedResponse(c, fiber.Map{"type": t})
}

func (h *VariationHandler) UpdateType(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ID")
	}
	var req variationTypeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	t, err := h.service.UpdateType(id, req.Name, req.SortOrder, isActive)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessResponse(c, fiber.Map{"type": t})
}

func (h *VariationHandler) DeleteType(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ID")
	}
	if err := h.service.DeleteType(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Varyasyon türü silindi")
}

// --- Values ---

func (h *VariationHandler) CreateValue(c *fiber.Ctx) error {
	var req variationValueRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}
	v := &models.VariationValue{
		VariationTypeID: req.VariationTypeID,
		Value:           strings.TrimSpace(req.Value),
		ColorHex:        strings.TrimSpace(req.ColorHex),
		SortOrder:       req.SortOrder,
		IsActive:        true,
	}
	if req.IsActive != nil {
		v.IsActive = *req.IsActive
	}
	if err := h.service.CreateValue(v); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.CreatedResponse(c, fiber.Map{"value": v})
}

func (h *VariationHandler) UpdateValue(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ID")
	}
	var req variationValueRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	v, err := h.service.UpdateValue(id, req.Value, req.ColorHex, req.SortOrder, isActive)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessResponse(c, fiber.Map{"value": v})
}

func (h *VariationHandler) DeleteValue(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ID")
	}
	if err := h.service.DeleteValue(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Değer silindi")
}
