package handlers

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/integrations/aras"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

// ArasHandler Aras Kargo entegrasyonu için admin endpoint'leri.
type ArasHandler struct {
	svc      *aras.Service
	settings *services.SettingService
}

// NewArasHandler hazır handler döner.
func NewArasHandler(svc *aras.Service, settings *services.SettingService) *ArasHandler {
	return &ArasHandler{svc: svc, settings: settings}
}

func (h *ArasHandler) ctx(c *fiber.Ctx) (context.Context, context.CancelFunc) {
	return context.WithTimeout(c.UserContext(), 60*time.Second)
}

// Ship POST /admin/orders/:id/aras/ship — siparişi Aras'a kargolar.
func (h *ArasHandler) Ship(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz sipariş ID'si")
	}
	ctx, cancel := h.ctx(c)
	defer cancel()
	if err := h.svc.CreateShipment(ctx, id); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Kargo oluşturuldu")
}

// Refresh POST /admin/orders/:id/aras/refresh — Aras'tan güncel statüyü çeker.
func (h *ArasHandler) Refresh(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz sipariş ID'si")
	}
	ctx, cancel := h.ctx(c)
	defer cancel()
	if err := h.svc.RefreshStatus(ctx, id); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Kargo durumu güncellendi")
}

// CancelShipment POST /admin/orders/:id/aras/cancel — yalnızca Aras gönderisini iptal eder
// (sipariş statüsünü değiştirmez; CancellationService o iş için ayrı kullanılır).
func (h *ArasHandler) CancelShipment(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz sipariş ID'si")
	}
	ctx, cancel := h.ctx(c)
	defer cancel()
	if err := h.svc.CancelShipment(ctx, id); err != nil {
		// 999 (irsaliye kesildi) durumunda da kullanıcıya net bilgi verelim.
		if errors.Is(err, aras.ErrCannotCancel) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"error":   "Kargo irsaliyesi kesildi, artık iptal edilemiyor. İade talebi açın.",
			})
		}
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessMessageResponse(c, "Aras gönderisi iptal edildi")
}

// Labels GET /admin/orders/:id/aras/labels — etiket basımı için parça barkodlarını döner.
func (h *ArasHandler) Labels(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz sipariş ID'si")
	}
	data, err := h.svc.BarcodesFor(id)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessResponse(c, fiber.Map{"label": data})
}

// RegisterSender POST /admin/aras/sender-address/register — settings.contact'tan
// ana depo bilgisini alıp Aras SaveAddress'i çağırır, dönen ID'yi settings'e yazar.
func (h *ArasHandler) RegisterSender(c *fiber.Ctx) error {
	ctx, cancel := h.ctx(c)
	defer cancel()
	id, err := h.svc.RegisterSenderAddress(ctx)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	return utils.SuccessResponse(c, fiber.Map{
		"sender_address_id": id,
		"message":           "Gönderici adresi Aras Kargo'ya kaydedildi",
	})
}

// TestConnection POST /admin/settings/aras/test — mevcut creds ile dummy SaveAddress denemesi.
func (h *ArasHandler) TestConnection(c *fiber.Ctx) error {
	type testReq struct {
		UserName     string `json:"username"`
		Password     string `json:"password"`
		CustomerCode string `json:"customer_code"`
		TestMode     *bool  `json:"test_mode"`
	}
	var req testReq
	_ = c.BodyParser(&req)

	cfg, err := h.settings.ArasConfig()
	if err != nil {
		return utils.InternalError(c)
	}
	// Override (kaydedilmemiş değerleri test için)
	if s := strings.TrimSpace(req.UserName); s != "" {
		cfg.UserName = s
	}
	if s := strings.TrimSpace(req.Password); s != "" && s != "********" {
		cfg.Password = s
	}
	if s := strings.TrimSpace(req.CustomerCode); s != "" {
		cfg.CustomerCode = s
	}
	if req.TestMode != nil {
		cfg.TestMode = *req.TestMode
	}
	if cfg.UserName == "" || cfg.Password == "" {
		return utils.BadRequest(c, "Aras kullanıcı adı ve şifresi zorunlu")
	}
	cfg.Enabled = true

	client := aras.NewClient(cfg)
	ctx, cancel := h.ctx(c)
	defer cancel()
	// SaveAddress ping — gerçekten kayıt oluşturur, ama "TEST-" prefix ile etiketliyoruz.
	dummy := aras.SaveAddressRequest{
		CustomerAddressID: "TEST-CONN-" + strconv.FormatInt(time.Now().Unix(), 10),
		Name:              "Test Bağlantı",
		CompleteAddress:   "Test adres",
		PhoneNumber:       "02164158766", // 11 hane, Aras formatı
		EMail:             "test@test.com",
		CityName:          "İSTANBUL",
		TownName:          "BEYKOZ",
	}
	id, _, err := client.SaveAddress(ctx, dummy)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"ok":      false,
			"error":   err.Error(),
			"message": "Aras Kargo bağlantısı kurulamadı: " + err.Error(),
		})
	}
	return utils.SuccessResponse(c, fiber.Map{
		"ok":                true,
		"message":           "Aras Kargo bağlantısı başarılı",
		"sample_address_id": id,
	})
}
