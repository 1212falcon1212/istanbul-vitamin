package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/integrations/firebase"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm/clause"
	"os"
	"regexp"
	"time"
)

type PushHandler struct{}

func deviceHash(value string) (string, bool) {
	if !regexp.MustCompile(`^[a-f0-9]{64}$`).MatchString(value) {
		return "", false
	}
	h := sha256.Sum256([]byte(value))
	return hex.EncodeToString(h[:]), true
}
func (h *PushHandler) Config(c *fiber.Ctx) error {
	cfg := firebase.FromEnv()
	cfg.Enabled = cfg.Ready()
	return utils.SuccessResponse(c, cfg)
}
func (h *PushHandler) Subscribe(c *fiber.Ctx) error {
	if !firebase.FromEnv().Ready() {
		return c.Status(409).JSON(fiber.Map{"error": "Firebase projesi henüz yapılandırılmadı"})
	}
	var req struct {
		Device    string `json:"device"`
		Token     string `json:"token"`
		Marketing bool   `json:"marketing"`
	}
	if c.BodyParser(&req) != nil {
		return utils.BadRequest(c, "Geçersiz istek")
	}
	hash, ok := deviceHash(req.Device)
	if !ok || len(req.Token) < 20 || len(req.Token) > 4096 {
		return utils.BadRequest(c, "Geçersiz cihaz kaydı")
	}
	var userID *uint64
	var accountExpiresAt *time.Time
	if id, ok := c.Locals("userID").(uint64); ok && id > 0 {
		userID = &id
		expires := time.Now().Add(24 * time.Hour)
		accountExpiresAt = &expires
	}
	row := models.PushSubscription{DeviceHash: hash, Token: req.Token, UserID: userID, AccountExpiresAt: accountExpiresAt, Marketing: req.Marketing, UpdatedAt: time.Now()}
	if database.DB.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "device_hash"}}, DoUpdates: clause.AssignmentColumns([]string{"token", "updated_at", "user_id", "marketing", "account_expires_at"})}).Create(&row).Error != nil {
		return utils.InternalError(c)
	}
	return utils.SuccessMessageResponse(c, "Bildirimler açıldı")
}
func (h *PushHandler) Unsubscribe(c *fiber.Ctx) error {
	var req struct {
		Device string `json:"device"`
	}
	if c.BodyParser(&req) != nil {
		return utils.BadRequest(c, "Geçersiz istek")
	}
	hash, ok := deviceHash(req.Device)
	if !ok {
		return utils.BadRequest(c, "Geçersiz cihaz")
	}
	if database.DB.Where("device_hash = ?", hash).Delete(&models.PushSubscription{}).Error != nil {
		return utils.InternalError(c)
	}
	return utils.SuccessMessageResponse(c, "Bildirimler kapatıldı")
}
func (h *PushHandler) Status(c *fiber.Ctx) error {
	var count int64
	ready := database.DB.Migrator().HasTable(&models.PushSubscription{})
	if ready {
		database.DB.Model(&models.PushSubscription{}).Where("updated_at > ?", time.Now().Add(-90*24*time.Hour)).Count(&count)
	}
	_, e := os.Stat(os.Getenv("FIREBASE_SERVICE_ACCOUNT_FILE"))
	return utils.SuccessResponse(c, fiber.Map{"configured": firebase.FromEnv().Ready(), "network_enabled": os.Getenv("FIREBASE_ALLOW_NETWORK") == "true", "credential_present": e == nil, "storage_ready": ready, "active_devices": count, "verification": "Gerçek cihaz doğrulaması bekliyor"})
}
func (h *PushHandler) Test(c *fiber.Ctx) error {
	if os.Getenv("FIREBASE_ALLOW_NETWORK") != "true" {
		return c.Status(409).JSON(fiber.Map{"error": "Firebase ağ erişimi kapalı"})
	}
	var req struct {
		Device string `json:"device"`
		firebase.Message
	}
	if c.BodyParser(&req) != nil {
		return utils.BadRequest(c, "Geçersiz istek")
	}
	hash, ok := deviceHash(req.Device)
	if !ok {
		return utils.BadRequest(c, "Bu tarayıcıda önce bildirimleri açın")
	}
	if e := req.Message.Validate(); e != nil {
		return utils.BadRequest(c, e.Error())
	}
	var row models.PushSubscription
	if database.DB.Where("device_hash = ? AND updated_at > ?", hash, time.Now().Add(-90*24*time.Hour)).First(&row).Error != nil {
		return utils.BadRequest(c, "Aktif cihaz kaydı bulunamadı")
	}
	client := firebase.Client{Config: firebase.FromEnv(), CredentialPath: os.Getenv("FIREBASE_SERVICE_ACCOUNT_FILE"), AllowNetwork: true}
	if e := client.Send(c.UserContext(), row.Token, req.Message); e != nil {
		return utils.BadRequest(c, e.Error())
	}
	return utils.SuccessMessageResponse(c, "Firebase bildirimi kabul etti; cihazda teslimi kontrol edin")
}
