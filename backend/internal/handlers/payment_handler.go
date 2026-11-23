package handlers

import (
	"net"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type PaymentHandler struct {
	service *services.PaymentService
}

func NewPaymentHandler(cfg *config.Config) *PaymentHandler {
	return &PaymentHandler{
		service: services.NewPaymentService(database.DB, cfg),
	}
}

type startPaymentRequest struct {
	OrderID  uint64 `json:"order_id"`
	LastFour string `json:"last_four"`
}

// StartPayment odeme islemini baslatir.
func (h *PaymentHandler) StartPayment(c *fiber.Ctx) error {
	var req startPaymentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.OrderID == 0 {
		return utils.BadRequest(c, "Sipariş ID zorunludur")
	}

	userID, _ := c.Locals("userID").(uint64)
	var owned models.Order
	if userID == 0 || database.DB.Where("id = ? AND user_id = ?", req.OrderID, userID).First(&owned).Error != nil {
		return utils.NotFound(c, "Sipariş")
	}
	ip := c.IP()
	if peer := net.ParseIP(ip); peer != nil && peer.IsLoopback() {
		if forwarded := net.ParseIP(c.Get("X-Real-IP")); forwarded != nil {
			ip = forwarded.String()
		}
	}
	cardData := services.CardPaymentData{UserIP: ip, LastFour: req.LastFour}

	result, err := h.service.StartPayment(req.OrderID, cardData)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"payment": result,
	})
}

// GetInstallments taksit seceneklerini dondurur.
func (h *PaymentHandler) GetInstallments(c *fiber.Ctx) error {
	bin := strings.TrimSpace(c.Query("bin"))
	amountStr := strings.TrimSpace(c.Query("amount"))

	if bin == "" || len(bin) < 6 {
		return utils.BadRequest(c, "Geçerli bir BIN numarası giriniz (en az 6 hane)")
	}

	if amountStr == "" {
		return utils.BadRequest(c, "Tutar zorunludur")
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil || amount <= 0 {
		return utils.BadRequest(c, "Geçerli bir tutar giriniz")
	}

	options, err := h.service.GetInstallments(bin, amount)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"installments": options,
	})
}

// PayTRCallback PayTR odeme callback'ini isler.
func (h *PaymentHandler) PayTRCallback(c *fiber.Ctx) error {
	data := make(map[string]string)
	data["merchant_oid"] = c.FormValue("merchant_oid")
	data["status"] = c.FormValue("status")
	data["total_amount"] = c.FormValue("total_amount")
	data["hash"] = c.FormValue("hash")
	data["test_mode"] = c.FormValue("test_mode")

	if err := h.service.HandleCallback(data); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("FAIL")
	}

	return c.SendString("OK")
}
