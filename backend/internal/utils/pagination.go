package utils

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Pagination struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

func GetPagination(c *fiber.Ctx) (page, perPage int) {
	page, _ = strconv.Atoi(c.Query("page", "1"))
	perPage, _ = strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	// Admin dropdown/lookup'ları için 500'e kadar izin ver; normal listeler 20-50 kullanır.
	if perPage > 500 {
		perPage = 500
	}

	return page, perPage
}

func (p *Pagination) Calculate() {
	if p.PerPage > 0 {
		p.TotalPages = int((p.Total + int64(p.PerPage) - 1) / int64(p.PerPage))
	}
}

func GetOffset(page, perPage int) int {
	return (page - 1) * perPage
}
