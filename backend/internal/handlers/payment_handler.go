package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/database"
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
	OrderID        uint64 `json:"order_id"`
	CardNumber     string `json:"card_number"`
	ExpMonth       string `json:"exp_month"`
	ExpYear        string `json:"exp_year"`
	CVV            string `json:"cvv"`
	CardHolderName string `json:"card_holder_name"`
	Installment    int    `json:"installment"`
	SaveCard       bool   `json:"save_card"`
	CardToken      string `json:"card_token"`
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

	// Kaydedilmis kart ile odeme yapilmiyorsa kart bilgileri zorunlu
	if req.CardToken == "" {
		req.CardNumber = strings.TrimSpace(req.CardNumber)
		req.ExpMonth = strings.TrimSpace(req.ExpMonth)
		req.ExpYear = strings.TrimSpace(req.ExpYear)
		req.CVV = strings.TrimSpace(req.CVV)
		req.CardHolderName = strings.TrimSpace(req.CardHolderName)

		if req.CardNumber == "" || req.ExpMonth == "" || req.ExpYear == "" || req.CVV == "" || req.CardHolderName == "" {
			return utils.BadRequest(c, "Kart bilgileri zorunludur")
		}
	}

	cardData := services.CardPaymentData{
		CardNumber:     req.CardNumber,
		ExpMonth:       req.ExpMonth,
		ExpYear:        req.ExpYear,
		CVV:            req.CVV,
		CardHolderName: req.CardHolderName,
		Installment:    req.Installment,
		SaveCard:       req.SaveCard,
		CardToken:      req.CardToken,
	}

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
	data["payment_id"] = c.FormValue("payment_id")

	if err := h.service.HandleCallback(data); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("FAIL")
	}

	return c.SendString("OK")
}
