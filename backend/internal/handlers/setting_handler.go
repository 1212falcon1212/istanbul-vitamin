package handlers

import (
	"encoding/json"
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
		"settings": publicSettings(settings),
	})
}

// GetByGroup belirli gruptaki ayarlari dondurur (public).
// aras.password gibi secretKeys redakte edilir; admin form alanı boş gelirse
// mevcut DB değeri korunur (UpdatePreservingSecrets).
func (h *SettingHandler) GetByGroup(c *fiber.Ctx) error {
	group := strings.TrimSpace(c.Params("group"))
	if group == "" {
		return utils.BadRequest(c, "Grup adı zorunludur")
	}

	settings, err := h.service.GetByGroupRedacted(group)
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

		if key == "homepage_content" && item.Value != "" && (len(item.Value) > 65536 || !json.Valid([]byte(item.Value))) {
			return utils.BadRequest(c, "Ana sayfa içeriği geçerli JSON olmalı ve 64 KB sınırını aşmamalı")
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

	if err := h.service.UpdatePreservingSecrets(settings); err != nil {
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

// Public settings are explicitly allowlisted; new integration keys stay private.
func publicSettings(all map[string]string) map[string]string {
	out := map[string]string{}
	for _, key := range strings.Fields("homepage_content top_header_mode top_header_image top_header_image_mobile top_header_image_alt site_name site_description site_logo_url site_logo_url_dark site_favicon_url top_header_enabled top_header_text top_header_link phone email address city town whatsapp_number instagram facebook twitter youtube meta_title meta_description shipping_fee free_shipping_threshold min_free_shipping google_analytics_id google_ads_id google_ads_conversion_label google_tracking_enabled") {
		if value, ok := all[key]; ok {
			out[key] = value
		}
	}
	return out
}
func (h *SettingHandler) AdminGetAll(c *fiber.Ctx) error {
	all, err := h.service.GetAll()
	if err != nil {
		return utils.InternalError(c)
	}
	out := map[string]string{}
	for key, value := range all {
		if services.IsSecretSetting(key) && value != "" {
			value = "********"
		}
		out[key] = value
	}
	return utils.SuccessResponse(c, fiber.Map{"settings": out})
}
