package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type NewsletterHandler struct {
	service *services.NewsletterService
}

func NewNewsletterHandler() *NewsletterHandler {
	return &NewsletterHandler{
		service: services.NewNewsletterService(database.DB),
	}
}

type subscribeRequest struct {
	Email string `json:"email"`
}

// Subscribe body: {email} — bültene abone olur.
func (h *NewsletterHandler) Subscribe(c *fiber.Ctx) error {
	var req subscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return utils.BadRequest(c, "E-posta adresi zorunludur")
	}
	if !utils.IsValidEmail(email) {
		return utils.BadRequest(c, "Geçerli bir e-posta adresi giriniz")
	}

	if err := h.service.Subscribe(email); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Başarıyla kaydoldunuz")
}

// Unsubscribe query: ?token=X — aboneliği iptal eder.
func (h *NewsletterHandler) Unsubscribe(c *fiber.Ctx) error {
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		return utils.BadRequest(c, "Geçersiz bağlantı")
	}

	if err := h.service.Unsubscribe(token); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Aboneliğiniz sonlandırıldı")
}
