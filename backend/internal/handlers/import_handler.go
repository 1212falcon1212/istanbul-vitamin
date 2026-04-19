package handlers

import (
	"encoding/json"
	"io"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type ImportHandler struct{}

func NewImportHandler() *ImportHandler {
	return &ImportHandler{}
}

type importProductItem struct {
	Name             string   `json:"name"`
	SKU              string   `json:"sku"`
	Barcode          string   `json:"barcode"`
	Price            float64  `json:"price"`
	ComparePrice     *float64 `json:"compare_price"`
	Stock            int      `json:"stock"`
	ShortDescription string   `json:"short_description"`
	Description      string   `json:"description"`
	BrandName        string   `json:"brand_name"`
	CategoryNames    []string `json:"category_names"`
	Images           []string `json:"images"`
	IsActive         *bool    `json:"is_active"`
}

// ImportProducts JSON dosyasindan toplu urun aktarimi yapar (placeholder).
func (h *ImportHandler) ImportProducts(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequest(c, "Dosya yüklenemedi")
	}

	f, err := file.Open()
	if err != nil {
		return utils.BadRequest(c, "Dosya açılamadı")
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return utils.BadRequest(c, "Dosya okunamadı")
	}

	var items []importProductItem
	if err := json.Unmarshal(data, &items); err != nil {
		return utils.BadRequest(c, "Geçersiz JSON formatı")
	}

	if len(items) == 0 {
		return utils.BadRequest(c, "Dosyada ürün bulunamadı")
	}

	// Placeholder: gercek import islemi burada yapilacak
	imported := 0
	skipped := 0
	var errors []string

	for _, item := range items {
		if item.Name == "" || item.SKU == "" {
			skipped++
			errors = append(errors, "SKU veya isim eksik: "+item.SKU)
			continue
		}
		imported++
	}

	return utils.SuccessResponse(c, fiber.Map{
		"total":    len(items),
		"imported": imported,
		"skipped":  skipped,
		"errors":   errors,
	})
}

// Preview JSON dosyasindan ilk 10 urunu onizleme olarak dondurur.
func (h *ImportHandler) Preview(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequest(c, "Dosya yüklenemedi")
	}

	f, err := file.Open()
	if err != nil {
		return utils.BadRequest(c, "Dosya açılamadı")
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return utils.BadRequest(c, "Dosya okunamadı")
	}

	var items []importProductItem
	if err := json.Unmarshal(data, &items); err != nil {
		return utils.BadRequest(c, "Geçersiz JSON formatı")
	}

	previewLimit := 10
	if len(items) < previewLimit {
		previewLimit = len(items)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"total":   len(items),
		"preview": items[:previewLimit],
	})
}
