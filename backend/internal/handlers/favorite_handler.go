package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type FavoriteHandler struct {
	service *services.FavoriteService
}

func NewFavoriteHandler() *FavoriteHandler {
	return &FavoriteHandler{
		service: services.NewFavoriteService(database.DB),
	}
}

type addFavoriteRequest struct {
	ProductID uint64 `json:"product_id"`
}

// List kullanicinin favorilerini listeler.
func (h *FavoriteHandler) List(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	page, perPage := utils.GetPagination(c)

	favorites, total, err := h.service.List(userID, page, perPage)
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
		"favorites": favorites,
	}, pagination)
}

// Add favorilere urun ekler.
func (h *FavoriteHandler) Add(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	var req addFavoriteRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.ProductID == 0 {
		return utils.BadRequest(c, "Ürün ID zorunludur")
	}

	if err := h.service.Add(userID, req.ProductID); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"message": "Ürün favorilere eklendi",
	})
}

// Remove favorilerden urun kaldirir.
func (h *FavoriteHandler) Remove(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	productID, err := strconv.ParseUint(c.Params("productId"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz ürün ID'si")
	}

	if err := h.service.Remove(userID, productID); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Ürün favorilerden kaldırıldı")
}
