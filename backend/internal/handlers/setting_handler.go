package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/integrations/bizimhesap"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type SettingHandler struct {
	service *services.SettingService
}

func NewSettingHandler() *SettingHandler {
	return &SettingHandler{
		service: services.NewSettingService(database.DB),
	}
}

// Service altta yatan SettingService'i döndürür (orchestrator'a ConfigProvider olarak geçirilir).
func (h *SettingHandler) Service() *services.SettingService {
	return h.service
}

type updateSettingItem struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	Group string `json:"group"`
}

type updateSettingsRequest struct {
	Settings []updateSettingItem `json:"settings"`
}

// GetAll tum ayarlari key-value map olarak dondurur (public).
func (h *SettingHandler) GetAll(c *fiber.Ctx) error {
	settings, err := h.service.GetAll()
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"settings": settings,
	})
}

// GetByGroup belirli gruptaki ayarlari dondurur (public).
func (h *SettingHandler) GetByGroup(c *fiber.Ctx) error {
	group := strings.TrimSpace(c.Params("group"))
	if group == "" {
		return utils.BadRequest(c, "Grup adı zorunludur")
	}

	settings, err := h.service.GetByGroup(group)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"settings": settings,
	})
}

// Update ayarlari toplu olarak gunceller (admin).
func (h *SettingHandler) Update(c *fiber.Ctx) error {
	var req updateSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if len(req.Settings) == 0 {
		return utils.BadRequest(c, "En az bir ayar gereklidir")
	}

	var settings []models.Setting
	for _, item := range req.Settings {
		key := strings.TrimSpace(item.Key)
		if key == "" {
			continue
		}

		group := strings.TrimSpace(item.Group)
		if group == "" {
			group = "general"
		}

		settings = append(settings, models.Setting{
			Key:   key,
			Value: item.Value,
			Group: group,
		})
	}

	if len(settings) == 0 {
		return utils.BadRequest(c, "Geçerli ayar bulunamadı")
	}

	if err := h.service.Update(settings); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Ayarlar başarıyla güncellendi")
}

// TestBizimhesap mevcut bizimhesap ayarlarıyla test çağrısı yapar.
// Kaydet butonuna basmadan önce bağlantıyı doğrulamak için kullanılır — payload
// request body'den override edilebilir (henüz kaydedilmemiş değerleri sınamak için).
func (h *SettingHandler) TestBizimhesap(c *fiber.Ctx) error {
	type testReq struct {
		FirmID  string `json:"firm_id"`
		BaseURL string `json:"base_url"`
	}
	var req testReq
	_ = c.BodyParser(&req) // body opsiyonel

	cfg, err := h.service.BizimhesapConfig()
	if err != nil {
		return utils.InternalError(c)
	}
	// İstek gövdesi varsa override et (kaydedilmeden önce test için).
	if s := strings.TrimSpace(req.FirmID); s != "" {
		cfg.FirmID = s
	}
	if s := strings.TrimSpace(req.BaseURL); s != "" {
		cfg.BaseURL = s
	}
	if strings.TrimSpace(cfg.FirmID) == "" {
		return utils.BadRequest(c, "firmId tanımlı değil")
	}
	// Test sırasında enabled kontrolünü atla — test edebilmek için istek açıkça yapılıyor.
	cfg.Enabled = true

	client := bizimhesap.NewClient(cfg)
	resp, callErr := client.TestConnection(c.UserContext())
	if callErr != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"ok":    false,
			"error": callErr.Error(),
		})
	}
	// Bizimhesap test payload'u "Test" gibi dummy veri içerdiğinden hata dönmesi normal;
	// önemli olan HTTP başarısı ve hata mesajının firm/auth kaynaklı olup olmadığı.
	ok := resp.Error == "" || !looksLikeAuthError(resp.Error)
	return utils.SuccessResponse(c, fiber.Map{
		"ok":      ok,
		"error":   resp.Error,
		"guid":    resp.GUID,
		"url":     resp.URL,
		"message": describeTestResult(ok, resp.Error),
	})
}

func looksLikeAuthError(msg string) bool {
	m := strings.ToLower(msg)
	return strings.Contains(m, "firm") || strings.Contains(m, "auth") || strings.Contains(m, "yetki") || strings.Contains(m, "unauthorized")
}

func describeTestResult(ok bool, errMsg string) string {
	if ok {
		if errMsg == "" {
			return "Bağlantı başarılı."
		}
		return "Bağlantı kuruldu; Bizimhesap validasyon mesajı: " + errMsg
	}
	return "Bağlantı reddedildi: " + errMsg
}
