package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type SearchHandler struct {
	service *services.SearchService
}

func NewSearchHandler() *SearchHandler {
	return &SearchHandler{
		service: services.NewSearchService(database.DB),
	}
}

// Search urun arama yapar.
func (h *SearchHandler) Search(c *fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		return utils.BadRequest(c, "Arama terimi zorunludur")
	}

	page, perPage := utils.GetPagination(c)

	products, total, err := h.service.Search(q, page, perPage)
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
		"products": products,
	}, pagination)
}

// Autocomplete hizli arama onerisi dondurur.
func (h *SearchHandler) Autocomplete(c *fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		return utils.SuccessResponse(c, fiber.Map{
			"products": []interface{}{},
		})
	}

	limit := 5
	if v := c.Query("limit"); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 && l <= 10 {
			limit = l
		}
	}

	products, err := h.service.Autocomplete(q, limit)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"products": products,
	})
}
