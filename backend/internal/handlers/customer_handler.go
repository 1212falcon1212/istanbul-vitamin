package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type CustomerHandler struct {
	service *services.CustomerService
}

func NewCustomerHandler() *CustomerHandler {
	return &CustomerHandler{
		service: services.NewCustomerService(database.DB),
	}
}

// List admin icin musteri listesi dondurur.
func (h *CustomerHandler) List(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)
	search := strings.TrimSpace(c.Query("search"))

	users, total, err := h.service.List(page, perPage, search)
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
		"customers": users,
	}, pagination)
}

// GetByID musteri detayini dondurur.
func (h *CustomerHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz müşteri ID'si")
	}

	user, err := h.service.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Müşteri")
	}

	// Siparis sayisini ayri sorgula
	var orderCount int64
	database.DB.Model(&struct{}{}).Table("orders").Where("user_id = ?", id).Count(&orderCount)

	return utils.SuccessResponse(c, fiber.Map{
		"customer":    user,
		"order_count": orderCount,
	})
}
