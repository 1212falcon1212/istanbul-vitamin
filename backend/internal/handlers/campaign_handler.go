package handlers

import (
	"bytes"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type CampaignHandler struct {
	service *services.CampaignService
}

func NewCampaignHandler() *CampaignHandler {
	return &CampaignHandler{
		service: services.NewCampaignService(database.DB),
	}
}

type campaignRequest struct {
	Name              string   `json:"name"`
	Slug              string   `json:"slug"`
	Description       string   `json:"description"`
	BannerImage       string   `json:"banner_image"`
	BannerImageMobile string   `json:"banner_image_mobile"`
	DiscountType      string   `json:"discount_type"`
	DiscountValue     *float64 `json:"discount_value"`
	StartsAt          *string  `json:"starts_at"`
	ExpiresAt         *string  `json:"expires_at"`
	IsActive          *bool    `json:"is_active"`
	MetaTitle         string   `json:"meta_title"`
	MetaDescription   string   `json:"meta_description"`
	Products          []uint64 `json:"products"`
	// ProductsSet flag'i, Products alanı explicit olarak gönderildi mi diye Update
	// sırasında ayırt etmek için kullanılır. BodyParser tarafından doldurulmaz,
	// bu yüzden manuel olarak nil-check yapılır.
}

// List aktif kampanyaları sayfalı olarak döndürür (public).
func (h *CampaignHandler) List(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)

	campaigns, total, err := h.service.List(page, perPage)
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
		"campaigns": campaigns,
	}, pagination)
}

// GetBySlug slug ile aktif kampanyayı getirir (public).
func (h *CampaignHandler) GetBySlug(c *fiber.Ctx) error {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return utils.BadRequest(c, "Kampanya slug değeri zorunludur")
	}

	campaign, err := h.service.GetBySlug(slug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.NotFound(c, "Kampanya")
		}
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"campaign": campaign,
	})
}

// AdminList tüm kampanyaları (aktif/pasif) sayfalı olarak listeler (admin).
func (h *CampaignHandler) AdminList(c *fiber.Ctx) error {
	page, perPage := utils.GetPagination(c)

	campaigns, total, err := h.service.AdminList(page, perPage)
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
		"campaigns": campaigns,
	}, pagination)
}

// Create yeni kampanya oluşturur (admin).
func (h *CampaignHandler) Create(c *fiber.Ctx) error {
	var req campaignRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return utils.BadRequest(c, "Kampanya adı zorunludur")
	}

	startsAt, err := parseCampaignTime(req.StartsAt)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz başlangıç tarihi formatı")
	}
	expiresAt, err := parseCampaignTime(req.ExpiresAt)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz bitiş tarihi formatı")
	}

	discountType := strings.TrimSpace(req.DiscountType)
	if discountType != "" && discountType != "percentage" && discountType != "fixed" {
		return utils.BadRequest(c, "Geçersiz indirim tipi")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	campaign := &models.Campaign{
		Name:              req.Name,
		Slug:              strings.TrimSpace(req.Slug),
		Description:       strings.TrimSpace(req.Description),
		BannerImage:       strings.TrimSpace(req.BannerImage),
		BannerImageMobile: strings.TrimSpace(req.BannerImageMobile),
		DiscountType:      discountType,
		DiscountValue:     req.DiscountValue,
		StartsAt:          startsAt,
		ExpiresAt:         expiresAt,
		IsActive:          isActive,
		MetaTitle:         strings.TrimSpace(req.MetaTitle),
		MetaDescription:   strings.TrimSpace(req.MetaDescription),
	}

	if err := h.service.Create(campaign, req.Products); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"campaign": campaign,
	})
}

// Update kampanyayı günceller (admin).
func (h *CampaignHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz kampanya ID")
	}

	campaign, err := h.service.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Kampanya")
	}

	// Products alanının explicit gönderilip gönderilmediğini ayırt etmek için
	// önce raw body'i kontrol et.
	raw := c.Body()
	productsProvided := bodyHasKey(raw, "products")

	var req campaignRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return utils.BadRequest(c, "Kampanya adı zorunludur")
	}

	startsAt, err := parseCampaignTime(req.StartsAt)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz başlangıç tarihi formatı")
	}
	expiresAt, err := parseCampaignTime(req.ExpiresAt)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz bitiş tarihi formatı")
	}

	discountType := strings.TrimSpace(req.DiscountType)
	if discountType != "" && discountType != "percentage" && discountType != "fixed" {
		return utils.BadRequest(c, "Geçersiz indirim tipi")
	}

	campaign.Name = req.Name
	campaign.Description = strings.TrimSpace(req.Description)
	campaign.BannerImage = strings.TrimSpace(req.BannerImage)
	campaign.BannerImageMobile = strings.TrimSpace(req.BannerImageMobile)
	if discountType != "" {
		campaign.DiscountType = discountType
	}
	campaign.DiscountValue = req.DiscountValue
	campaign.StartsAt = startsAt
	campaign.ExpiresAt = expiresAt
	if req.IsActive != nil {
		campaign.IsActive = *req.IsActive
	}
	campaign.MetaTitle = strings.TrimSpace(req.MetaTitle)
	campaign.MetaDescription = strings.TrimSpace(req.MetaDescription)

	var productIDs *[]uint64
	if productsProvided {
		ids := req.Products
		if ids == nil {
			ids = []uint64{}
		}
		productIDs = &ids
	}

	if err := h.service.Update(campaign, productIDs); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"campaign": campaign,
	})
}

// Delete kampanyayı siler (admin).
func (h *CampaignHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz kampanya ID")
	}

	if err := h.service.Delete(id); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Kampanya başarıyla silindi")
}

// parseCampaignTime "2006-01-02T15:04:05Z07:00" veya "2006-01-02 15:04:05" veya
// "2006-01-02" formatlarını kabul eder. Boş/nil değer nil time döner.
func parseCampaignTime(v *string) (*time.Time, error) {
	if v == nil {
		return nil, nil
	}
	s := strings.TrimSpace(*v)
	if s == "" {
		return nil, nil
	}
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, s); err == nil {
			return &t, nil
		}
	}
	return nil, errors.New("geçersiz tarih")
}

// bodyHasKey JSON body'sinde verilen anahtarın var olup olmadığını basit bir
// şekilde kontrol eder. Tam JSON parse etmek yerine, "products" alanının
// gönderilip gönderilmediğini anlamak için kullanılır.
func bodyHasKey(body []byte, key string) bool {
	if len(body) == 0 {
		return false
	}
	return bytes.Contains(body, []byte("\""+key+"\""))
}
