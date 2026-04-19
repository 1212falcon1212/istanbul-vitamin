package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type MarketplaceHandler struct {
	service *services.MarketplaceService
}

func NewMarketplaceHandler() *MarketplaceHandler {
	return &MarketplaceHandler{
		service: services.NewMarketplaceService(database.DB),
	}
}

// SyncLogs senkronizasyon loglarini listeler.
func (h *MarketplaceHandler) SyncLogs(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)
	marketplace := strings.TrimSpace(c.Query("marketplace"))
	syncType := strings.TrimSpace(c.Query("sync_type"))

	logs, total, err := h.service.GetSyncLogs(marketplace, syncType, page, perPage)
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
		"sync_logs": logs,
	}, pagination)
}

// TriggerTrendyolSync Trendyol senkronizasyonunu baslatir.
func (h *MarketplaceHandler) TriggerTrendyolSync(c *fiber.Ctx) error {
	syncType := strings.TrimSpace(c.Query("sync_type", "product_push"))

	if err := h.service.TriggerSync("trendyol", syncType); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Trendyol senkronizasyonu başlatıldı")
}

// TriggerHBSync Hepsiburada senkronizasyonunu baslatir.
func (h *MarketplaceHandler) TriggerHBSync(c *fiber.Ctx) error {
	syncType := strings.TrimSpace(c.Query("sync_type", "product_push"))

	if err := h.service.TriggerSync("hepsiburada", syncType); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Hepsiburada senkronizasyonu başlatıldı")
}
