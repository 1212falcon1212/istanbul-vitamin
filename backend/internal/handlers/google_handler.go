package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/integrations/googlemarketing"
	"github.com/istanbulvitamin/backend/internal/utils"
	"os"
)

type GoogleHandler struct {
	store  *googlemarketing.Store
	client *googlemarketing.Client
}

func NewGoogleHandler() *GoogleHandler {
	path := os.Getenv("GOOGLE_CONFIG_PATH")
	if path == "" {
		path = ".private/google.enc"
	}
	return &GoogleHandler{store: &googlemarketing.Store{Path: path, Key: os.Getenv("GOOGLE_CONFIG_KEY")}, client: googlemarketing.NewClient()}
}
func (h *GoogleHandler) Public(c *fiber.Ctx) error {
	cfg, err := h.store.Load()
	if err != nil {
		cfg = googlemarketing.Config{}
	}
	return utils.SuccessResponse(c, fiber.Map{"enabled": cfg.Enabled, "measurement_id": cfg.MeasurementID, "ads_id": cfg.AdsID, "conversion_label": cfg.ConversionLabel})
}
func (h *GoogleHandler) Status(c *fiber.Ctx) error {
	cfg, err := h.store.Load()
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	has := fiber.Map{"client_secret": cfg.ClientSecret != "", "refresh_token": cfg.RefreshToken != "", "developer_token": cfg.DeveloperToken != ""}
	analyticsMissing, adsMissing := cfg.Missing("analytics"), cfg.Missing("ads")
	cfg.ClientSecret = ""
	cfg.RefreshToken = ""
	cfg.DeveloperToken = ""
	return utils.SuccessResponse(c, fiber.Map{"config": cfg, "secrets_configured": has, "encryption_ready": os.Getenv("GOOGLE_CONFIG_KEY") != "", "network_enabled": os.Getenv("GOOGLE_ALLOW_NETWORK") == "true", "verification": "pending", "analytics_missing": analyticsMissing, "ads_missing": adsMissing})
}
func (h *GoogleHandler) Save(c *fiber.Ctx) error {
	var req struct {
		Config googlemarketing.Config `json:"config"`
		Clear  bool                   `json:"clear_secrets"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek")
	}
	if err := h.store.Save(req.Config, req.Clear); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Yapılandırma şifrelenerek kaydedildi; hesap doğrulaması bekliyor")
}
func (h *GoogleHandler) Report(c *fiber.Ctx) error {
	if os.Getenv("GOOGLE_ALLOW_NETWORK") != "true" {
		return c.Status(409).JSON(fiber.Map{"success": false, "error": "Gerçek Google çağrıları kapalı; hesap doğrulaması sonraki aşamada"})
	}
	cfg, err := h.store.Load()
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	data, err := h.client.Report(c.UserContext(), cfg, c.Params("provider"))
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"success": false, "error": err.Error()})
	}
	return utils.SuccessResponse(c, fiber.Map{"report": data})
}
