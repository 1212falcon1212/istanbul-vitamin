package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

// CancellationHandler iptal/iade akışı için müşteri ve admin endpoint'leri.
type CancellationHandler struct {
	svc *services.CancellationService
}

// NewCancellationHandler hazır handler döner.
func NewCancellationHandler(svc *services.CancellationService) *CancellationHandler {
	return &CancellationHandler{svc: svc}
}

type customerRequest struct {
	Type   string `json:"type"`   // "cancel" | "return"
	Reason string `json:"reason"` // wrong_item, damaged, no_longer_needed, size_color, late_delivery, other
	Note   string `json:"note"`
}

// Request POST /api/orders/:id/cancellation — müşteri yeni iptal/iade talebi açar.
func (h *CancellationHandler) Request(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz sipariş ID'si")
	}
	var req customerRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}
	cancellation, err := h.svc.RequestByCustomer(userID, orderID, strings.TrimSpace(req.Type), strings.TrimSpace(req.Reason), strings.TrimSpace(req.Note))
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.CreatedResponse(c, fiber.Map{"cancellation": cancellation})
}

// ListMine GET /api/me/cancellations — müşterinin geçmiş iptal/iade talepleri.
func (h *CancellationHandler) ListMine(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}
	rows, err := h.svc.ListByCustomer(userID)
	if err != nil {
		return utils.InternalError(c)
	}
	return utils.SuccessResponse(c, fiber.Map{"cancellations": rows})
}

// AdminList GET /admin/cancellations — admin kuyruğu.
func (h *CancellationHandler) AdminList(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)
	statusFilter := strings.TrimSpace(c.Query("status"))
	rows, total, err := h.svc.ListPending(statusFilter, page, perPage)
	if err != nil {
		return utils.InternalError(c)
	}
	pagination := &utils.Pagination{Page: page, PerPage: perPage, Total: total}
	pagination.Calculate()
	return utils.PaginatedSuccessResponse(c, fiber.Map{"cancellations": rows}, pagination)
}

type adminDecisionRequest struct {
	Reason string `json:"reason"`
}

// Approve POST /admin/cancellations/:id/approve.
func (h *CancellationHandler) Approve(c *fiber.Ctx) error {
	cid, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz talep ID'si")
	}
	adminID := uint64(0)
	if v, ok := c.Locals("adminID").(uint64); ok {
		adminID = v
	} else if v, ok := c.Locals("userID").(uint64); ok {
		adminID = v
	}
	if err := h.svc.ApproveByAdmin(adminID, cid); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Talep onaylandı")
}

// Reject POST /admin/cancellations/:id/reject (body: {reason}).
func (h *CancellationHandler) Reject(c *fiber.Ctx) error {
	cid, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz talep ID'si")
	}
	var req adminDecisionRequest
	_ = c.BodyParser(&req)
	if strings.TrimSpace(req.Reason) == "" {
		return utils.BadRequest(c, "Red nedeni zorunlu")
	}
	adminID := uint64(0)
	if v, ok := c.Locals("adminID").(uint64); ok {
		adminID = v
	} else if v, ok := c.Locals("userID").(uint64); ok {
		adminID = v
	}
	if err := h.svc.RejectByAdmin(adminID, cid, req.Reason); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Talep reddedildi")
}
