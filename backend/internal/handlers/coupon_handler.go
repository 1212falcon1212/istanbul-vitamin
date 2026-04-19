package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
	"time"
)

type CouponHandler struct {
	service *services.CouponService
}

func NewCouponHandler() *CouponHandler {
	return &CouponHandler{
		service: services.NewCouponService(database.DB),
	}
}

type couponRequest struct {
	Code              string   `json:"code"`
	Description       string   `json:"description"`
	DiscountType      string   `json:"discount_type"`
	DiscountValue     float64  `json:"discount_value"`
	MinOrderAmount    float64  `json:"min_order_amount"`
	MaxDiscountAmount *float64 `json:"max_discount_amount"`
	UsageLimit        *int     `json:"usage_limit"`
	PerUserLimit      int      `json:"per_user_limit"`
	StartsAt          *string  `json:"starts_at"`
	ExpiresAt         *string  `json:"expires_at"`
	IsActive          *bool    `json:"is_active"`
}

// List kuponlari listeler (admin).
func (h *CouponHandler) List(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)

	coupons, total, err := h.service.List(page, perPage)
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
		"coupons": coupons,
	}, pagination)
}

// Create yeni kupon olusturur (admin).
func (h *CouponHandler) Create(c *fiber.Ctx) error {
	var req couponRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Code = strings.TrimSpace(req.Code)
	if req.Code == "" {
		return utils.BadRequest(c, "Kupon kodu zorunludur")
	}
	if req.DiscountType != "percentage" && req.DiscountType != "fixed" {
		return utils.BadRequest(c, "İndirim tipi 'percentage' veya 'fixed' olmalıdır")
	}
	if req.DiscountValue <= 0 {
		return utils.BadRequest(c, "İndirim değeri sıfırdan büyük olmalıdır")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	coupon := &models.Coupon{
		Code:              req.Code,
		Description:       strings.TrimSpace(req.Description),
		DiscountType:      req.DiscountType,
		DiscountValue:     req.DiscountValue,
		MinOrderAmount:    req.MinOrderAmount,
		MaxDiscountAmount: req.MaxDiscountAmount,
		UsageLimit:        req.UsageLimit,
		PerUserLimit:      req.PerUserLimit,
		IsActive:          isActive,
	}

	if req.StartsAt != nil {
		t, err := time.Parse(time.RFC3339, *req.StartsAt)
		if err == nil {
			coupon.StartsAt = &t
		}
	}
	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err == nil {
			coupon.ExpiresAt = &t
		}
	}

	if err := h.service.Create(coupon); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"coupon": coupon,
	})
}

// Update kuponu gunceller (admin).
func (h *CouponHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz kupon ID'si")
	}

	var req couponRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Code = strings.TrimSpace(req.Code)
	if req.Code == "" {
		return utils.BadRequest(c, "Kupon kodu zorunludur")
	}
	if req.DiscountType != "percentage" && req.DiscountType != "fixed" {
		return utils.BadRequest(c, "İndirim tipi 'percentage' veya 'fixed' olmalıdır")
	}
	if req.DiscountValue <= 0 {
		return utils.BadRequest(c, "İndirim değeri sıfırdan büyük olmalıdır")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	coupon := &models.Coupon{
		ID:                id,
		Code:              req.Code,
		Description:       strings.TrimSpace(req.Description),
		DiscountType:      req.DiscountType,
		DiscountValue:     req.DiscountValue,
		MinOrderAmount:    req.MinOrderAmount,
		MaxDiscountAmount: req.MaxDiscountAmount,
		UsageLimit:        req.UsageLimit,
		PerUserLimit:      req.PerUserLimit,
		IsActive:          isActive,
	}

	if req.StartsAt != nil {
		t, err := time.Parse(time.RFC3339, *req.StartsAt)
		if err == nil {
			coupon.StartsAt = &t
		}
	}
	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err == nil {
			coupon.ExpiresAt = &t
		}
	}

	if err := h.service.Update(coupon); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"coupon": coupon,
	})
}

// Delete kuponu siler (admin).
func (h *CouponHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz kupon ID'si")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Kupon başarıyla silindi")
}
