package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type CardHandler struct {
	service *services.CardService
}

func NewCardHandler() *CardHandler {
	return &CardHandler{
		service: services.NewCardService(database.DB),
	}
}

// List kullanicinin kayitli kartlarini listeler.
func (h *CardHandler) List(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	cards, err := h.service.List(userID)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"cards": cards,
	})
}

// Delete kayitli karti siler.
func (h *CardHandler) Delete(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz kart ID'si")
	}

	if err := h.service.Delete(id, userID); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Kart başarıyla silindi")
}
