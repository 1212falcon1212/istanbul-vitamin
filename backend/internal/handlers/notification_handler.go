package handlers

import (
	"crypto/sha256"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/integrations"
	"github.com/istanbulvitamin/backend/internal/integrations/firebase"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"net/url"
	"os"
	"strings"
	"time"
)

type NotificationHandler struct{ Config *config.Config }

func (h *NotificationHandler) List(c *fiber.Ctx) error {
	var rows []models.NotificationDelivery
	if err := database.DB.Order("id DESC").Limit(100).Find(&rows).Error; err != nil {
		return utils.InternalError(c)
	}
	var email, push int64
	database.DB.Model(&models.NewsletterSubscriber{}).Where("is_active = ?", true).Count(&email)
	database.DB.Model(&models.PushSubscription{}).Where("marketing = ? AND updated_at > ?", true, time.Now().Add(-90*24*time.Hour)).Count(&push)
	return utils.SuccessResponse(c, fiber.Map{"deliveries": rows, "email_audience": email, "push_audience": push, "smtp_ready": h.Config.SMTPHost != "", "worker_enabled": os.Getenv("NOTIFICATION_WORKER_ENABLED") == "true"})
}
func (h *NotificationHandler) Campaign(c *fiber.Ctx) error {
	var req struct {
		Key         string    `json:"key"`
		Title       string    `json:"title"`
		Body        string    `json:"body"`
		Path        string    `json:"path"`
		Email       bool      `json:"email"`
		Push        bool      `json:"push"`
		ScheduledAt time.Time `json:"scheduled_at"`
	}
	if c.BodyParser(&req) != nil {
		return utils.BadRequest(c, "Geçersiz istek")
	}
	if len(req.Key) != 36 || (!req.Email && !req.Push) || len(req.Path) > 500 {
		return utils.BadRequest(c, "Kanal ve gönderim kimliği gerekli")
	}
	if err := (firebase.Message{Title: req.Title, Body: req.Body, Path: req.Path}).Validate(); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	if req.ScheduledAt.IsZero() {
		req.ScheduledAt = time.Now()
	}
	if req.ScheduledAt.After(time.Now().Add(365 * 24 * time.Hour)) {
		return utils.BadRequest(c, "Tarih en fazla bir yıl sonrası olabilir")
	}
	var queued int64
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		add := func(channel, recipient, title, body string) error {
			sum := sha256.Sum256([]byte(recipient))
			row := models.NotificationDelivery{Key: fmt.Sprintf("campaign:%s:%s:%x", req.Key, channel, sum), Channel: channel, Recipient: recipient, Marketing: true, Title: title, Body: body, Path: req.Path, Status: "pending", AvailableAt: req.ScheduledAt}
			result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&row)
			queued += result.RowsAffected
			return result.Error
		}
		if req.Email {
			var subs []models.NewsletterSubscriber
			if err := tx.Where("is_active = ?", true).Find(&subs).Error; err != nil {
				return err
			}
			for _, sub := range subs {
				unsubscribe := strings.TrimRight(h.Config.SiteURL, "/") + "/bulten-iptal?token=" + url.QueryEscape(sub.UnsubscribeToken)
				title, body := integrations.CampaignEmail(req.Title, req.Body, strings.TrimRight(h.Config.SiteURL, "/")+req.Path, unsubscribe)
				if err := add("email", sub.Email, title, body); err != nil {
					return err
				}
			}
		}
		if req.Push {
			var subs []models.PushSubscription
			if err := tx.Where("marketing = ? AND updated_at > ?", true, time.Now().Add(-90*24*time.Hour)).Find(&subs).Error; err != nil {
				return err
			}
			for _, sub := range subs {
				if err := add("push", sub.DeviceHash, req.Title, req.Body); err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return utils.InternalError(c)
	}
	return utils.SuccessResponse(c, fiber.Map{"queued": queued})
}
