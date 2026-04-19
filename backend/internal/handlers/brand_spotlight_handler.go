package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type BrandSpotlightHandler struct {
	service *services.BrandSpotlightService
}

func NewBrandSpotlightHandler() *BrandSpotlightHandler {
	return &BrandSpotlightHandler{
		service: services.NewBrandSpotlightService(database.DB),
	}
}

// GetSpotlight en fazla ürüne sahip aktif markayı ve ürünlerini döndürür.
// GET /api/v1/brands/spotlight
func (h *BrandSpotlightHandler) GetSpotlight(c *fiber.Ctx) error {
	data, err := h.service.GetSpotlight()
	if err != nil {
		return utils.NotFound(c, "Spotlight marka")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"brand":         data.Brand,
		"products":      data.Products,
		"product_count": data.ProductCount,
	})
}
