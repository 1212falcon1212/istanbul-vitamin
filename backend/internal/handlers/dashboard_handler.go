package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type DashboardHandler struct {
	orderService *services.OrderService
}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{
		orderService: services.NewOrderService(database.DB),
	}
}

// Stats dashboard istatistiklerini dondurur.
func (h *DashboardHandler) Stats(c *fiber.Ctx) error {
	stats, err := h.orderService.GetDashboardStats()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"stats": stats,
	})
}

// SalesChart son 30 gunluk satis grafiklerini dondurur.
func (h *DashboardHandler) SalesChart(c *fiber.Ctx) error {
	chart, err := h.orderService.GetSalesChart()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"chart": chart,
	})
}
