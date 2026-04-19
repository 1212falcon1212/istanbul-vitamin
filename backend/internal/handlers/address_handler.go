package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type AddressHandler struct {
	service *services.AddressService
}

func NewAddressHandler() *AddressHandler {
	return &AddressHandler{
		service: services.NewAddressService(database.DB),
	}
}

type addressRequest struct {
	Title        string `json:"title"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Phone        string `json:"phone"`
	City         string `json:"city"`
	District     string `json:"district"`
	Neighborhood string `json:"neighborhood"`
	AddressLine  string `json:"address_line"`
	PostalCode   string `json:"postal_code"`
	IsDefault    bool   `json:"is_default"`
}

// List kullanicinin adreslerini listeler.
func (h *AddressHandler) List(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	addresses, err := h.service.List(userID)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"addresses": addresses,
	})
}

// Create yeni adres olusturur.
func (h *AddressHandler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	var req addressRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Title = strings.TrimSpace(req.Title)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.City = strings.TrimSpace(req.City)
	req.District = strings.TrimSpace(req.District)
	req.AddressLine = strings.TrimSpace(req.AddressLine)

	if req.Title == "" || req.FirstName == "" || req.LastName == "" ||
		req.Phone == "" || req.City == "" || req.District == "" || req.AddressLine == "" {
		return utils.BadRequest(c, "Başlık, ad, soyad, telefon, şehir, ilçe ve adres alanları zorunludur")
	}

	address := &models.Address{
		UserID:       userID,
		Title:        req.Title,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        req.Phone,
		City:         req.City,
		District:     req.District,
		Neighborhood: strings.TrimSpace(req.Neighborhood),
		AddressLine:  req.AddressLine,
		PostalCode:   strings.TrimSpace(req.PostalCode),
		IsDefault:    req.IsDefault,
	}

	if err := h.service.Create(address); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.CreatedResponse(c, fiber.Map{
		"address": address,
	})
}

// Update mevcut adresi gunceller.
func (h *AddressHandler) Update(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz adres ID'si")
	}

	var req addressRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Title = strings.TrimSpace(req.Title)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.City = strings.TrimSpace(req.City)
	req.District = strings.TrimSpace(req.District)
	req.AddressLine = strings.TrimSpace(req.AddressLine)

	if req.Title == "" || req.FirstName == "" || req.LastName == "" ||
		req.Phone == "" || req.City == "" || req.District == "" || req.AddressLine == "" {
		return utils.BadRequest(c, "Başlık, ad, soyad, telefon, şehir, ilçe ve adres alanları zorunludur")
	}

	address := &models.Address{
		ID:           id,
		UserID:       userID,
		Title:        req.Title,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        req.Phone,
		City:         req.City,
		District:     req.District,
		Neighborhood: strings.TrimSpace(req.Neighborhood),
		AddressLine:  req.AddressLine,
		PostalCode:   strings.TrimSpace(req.PostalCode),
		IsDefault:    req.IsDefault,
	}

	if err := h.service.Update(address); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"address": address,
	})
}

// Delete adresi siler.
func (h *AddressHandler) Delete(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz adres ID'si")
	}

	if err := h.service.Delete(id, userID); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Adres başarıyla silindi")
}
