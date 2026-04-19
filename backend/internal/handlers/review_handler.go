package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type ReviewHandler struct {
	service *services.ReviewService
}

func NewReviewHandler() *ReviewHandler {
	return &ReviewHandler{
		service: services.NewReviewService(database.DB),
	}
}

type createReviewRequest struct {
	ProductID uint64 `json:"product_id"`
	Rating    uint8  `json:"rating"`
	Title     string `json:"title"`
	Body      string `json:"body"`
}

type setApprovalRequest struct {
	Approved bool `json:"approved"`
}

// resolveProductID oncelikle :productID route parametresini kullanir, yoksa ?product_id query'sine duser.
func resolveProductID(c *fiber.Ctx) (uint64, error) {
	if raw := c.Params("productID"); raw != "" {
		return strconv.ParseUint(raw, 10, 64)
	}
	if raw := c.Query("product_id"); raw != "" {
		return strconv.ParseUint(raw, 10, 64)
	}
	return 0, strconv.ErrSyntax
}

// List public: bir urune ait onayli yorumlari ve istatistigi dondurur.
func (h *ReviewHandler) List(c *fiber.Ctx) error {
	productID, err := resolveProductID(c)
	if err != nil || productID == 0 {
		return utils.BadRequest(c, "Geçersiz ürün ID'si")
	}

	page, perPage := utils.GetPagination(c)

	reviews, total, err := h.service.List(productID, page, perPage)
	if err != nil {
		return utils.InternalError(c)
	}

	avg, count, err := h.service.GetStats(productID)
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
		"reviews": reviews,
		"stats": fiber.Map{
			"average_rating": avg,
			"total_count":    count,
		},
	}, pagination)
}

// Create giris yapmis kullanicinin yorum olusturmasini saglar.
func (h *ReviewHandler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	var req createReviewRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.ProductID == 0 {
		return utils.BadRequest(c, "Ürün ID zorunludur")
	}
	if req.Rating < 1 || req.Rating > 5 {
		return utils.BadRequest(c, "Puan 1 ile 5 arasında olmalıdır")
	}
	if len([]rune(strings.TrimSpace(req.Body))) < 10 {
		return utils.BadRequest(c, "Yorum en az 10 karakter olmalıdır")
	}

	review, err := h.service.Create(userID, req.ProductID, req.Rating, req.Title, req.Body)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"review":  review,
		"message": "Yorumunuz alındı, onaylandıktan sonra yayınlanacaktır",
	})
}

// Delete giris yapmis kullanicinin yalnizca kendi yorumunu silmesini saglar.
func (h *ReviewHandler) Delete(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return utils.BadRequest(c, "Geçersiz yorum ID'si")
	}

	if err := h.service.DeleteByUser(userID, id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Yorum silindi")
}

// AdminList admin icin yorumlari listeler. ?is_approved=true|false|0|1 ile filtrelenebilir.
func (h *ReviewHandler) AdminList(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)

	var isApproved *bool
	if v := c.Query("is_approved"); v != "" {
		val := v == "true" || v == "1"
		isApproved = &val
	}

	reviews, total, err := h.service.AdminList(page, perPage, isApproved)
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
		"reviews": reviews,
	}, pagination)
}

// SetApproval admin yorumu onaylar/onayi kaldirir (PATCH /admin/reviews/:id/approval).
func (h *ReviewHandler) SetApproval(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return utils.BadRequest(c, "Geçersiz yorum ID'si")
	}

	var req setApprovalRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if err := h.service.SetApproval(id, req.Approved); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	msg := "Yorum onaylandı"
	if !req.Approved {
		msg = "Yorumun onayı kaldırıldı"
	}
	return utils.SuccessMessageResponse(c, msg)
}

// AdminDelete admin yorumu tamamen siler.
func (h *ReviewHandler) AdminDelete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return utils.BadRequest(c, "Geçersiz yorum ID'si")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Yorum silindi")
}
