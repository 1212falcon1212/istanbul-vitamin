package services

import (
	"context"
	"crypto/sha256"
	"fmt"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/integrations"
	"github.com/istanbulvitamin/backend/internal/integrations/firebase"
	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"os"
	"strings"
	"time"
)

type NotificationService struct {
	DB     *gorm.DB
	Config *config.Config
}

func (s *NotificationService) Run(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.Tick(ctx)
		}
	}
}
func (s *NotificationService) Tick(ctx context.Context) {
	allEnabled := os.Getenv("NOTIFICATION_WORKER_ENABLED") == "true"
	authEnabled := os.Getenv("NOTIFICATION_AUTH_EMAIL_ENABLED") == "true"
	if !allEnabled && !authEnabled {
		return
	}
	if allEnabled {
		var events []models.NotificationEvent
		if s.DB.Where("expanded = ?", false).Order("id").Limit(50).Find(&events).Error != nil {
			return
		}
		for _, event := range events {
			if ctx.Err() != nil {
				return
			}
			_ = s.expand(event)
		}
	}
	// A process crash after claiming has an uncertain delivery outcome. Do NOT automatically resend it.
	s.DB.Model(&models.NotificationDelivery{}).Where("status = ? AND updated_at < ?", "sending", time.Now().Add(-10*time.Minute)).Updates(map[string]any{"status": "uncertain", "last_error": "Gönderim sonucu belirsiz; elle kontrol gerekli"})
	var jobs []models.NotificationDelivery
	pending := s.DB.Where("status = ? AND available_at <= ?", "pending", time.Now())
	if !allEnabled {
		pending = pending.Where("`key` LIKE ?", "auth:%")
	}
	if pending.Order("id").Limit(25).Find(&jobs).Error != nil {
		return
	}
	for _, job := range jobs {
		if ctx.Err() != nil {
			return
		}
		if job.Channel == "email" && strings.TrimSpace(s.Config.SMTPHost) == "" {
			continue
		}
		if job.Channel == "push" && (!firebase.FromEnv().Ready() || os.Getenv("FIREBASE_ALLOW_NETWORK") != "true") {
			continue
		}
		claim := s.DB.Model(&models.NotificationDelivery{}).Where("id = ? AND status = ?", job.ID, "pending").Updates(map[string]any{"status": "sending", "attempts": gorm.Expr("attempts + 1")})
		if claim.Error != nil || claim.RowsAffected != 1 {
			continue
		}
		err, skipped := s.deliver(ctx, job)
		status, msg := "sent", ""
		updates := map[string]any{}
		if skipped {
			status = "skipped"
		} else if err != nil {
			status = "pending"
			msg = "Sağlayıcı gönderimi başarısız"
			if job.Attempts+1 >= 5 {
				status = "failed"
			}
			updates["available_at"] = time.Now().Add(time.Duration(1<<uint(job.Attempts+1)) * time.Minute)
		}
		updates["status"] = status
		updates["last_error"] = msg
		s.DB.Model(&models.NotificationDelivery{}).Where("id = ?", job.ID).Updates(updates)
	}
}
func (s *NotificationService) expand(e models.NotificationEvent) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var locked models.NotificationEvent
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, e.ID).Error; err != nil {
			return err
		}
		if locked.Expanded {
			return nil
		}
		var order models.Order
		if err := tx.Preload("User").First(&order, e.OrderID).Error; err != nil {
			return err
		}
		title, body := integrations.EventCopy(e.Kind)
		// Marketplace buyers are not site notification recipients. Guest orders lack a verified email field.
		if title != "" && order.Source == "web" && order.UserID != nil && order.User != nil && order.User.IsActive {
			path := fmt.Sprintf("/hesabim/siparisler/%d", order.ID)
			subject, markup := integrations.OrderEventEmail(e.Kind, integrations.OrderMail{Number: order.OrderNumber, Name: order.ShippingFirstName, Company: order.CargoCompany, Tracking: order.TrackingNumber, Total: order.Total, URL: strings.TrimRight(s.Config.SiteURL, "/") + path})
			if e.Kind == "refund_completed" {
				var c models.OrderCancellation
				if err := tx.First(&c, e.ReferenceID).Error; err != nil {
					return err
				}
				if strings.HasPrefix(c.PayTRRefundID, "DEV-") {
					return tx.Model(&locked).Update("expanded", true).Error
				}
			}
			add := func(channel, recipient, title, body string) error {
				return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.NotificationDelivery{Key: fmt.Sprintf("%d:%s:%x", e.ID, channel, sha256.Sum256([]byte(recipient))), EventID: e.ID, Channel: channel, Recipient: recipient, UserID: order.UserID, Title: title, Body: body, Path: path, Status: "pending", AvailableAt: time.Now()}).Error
			}
			if order.User.Email != "" {
				if err := add("email", order.User.Email, subject, markup); err != nil {
					return err
				}
			}
			var devices []models.PushSubscription
			if err := tx.Where("user_id = ? AND updated_at > ?", *order.UserID, time.Now().Add(-90*24*time.Hour)).Find(&devices).Error; err != nil {
				return err
			}
			// Push previews deliberately contain no order number, amount or personal details.
			for _, d := range devices {
				if err := add("push", d.DeviceHash, title, body); err != nil {
					return err
				}
			}
		}
		return tx.Model(&locked).Update("expanded", true).Error
	})
}
func (s *NotificationService) deliver(ctx context.Context, d models.NotificationDelivery) (error, bool) {
	if d.ExpiresAt != nil && d.ExpiresAt.Before(time.Now()) {
		return nil, true
	}
	if d.Channel == "email" {
		if d.Marketing {
			var count int64
			if err := s.DB.Model(&models.NewsletterSubscriber{}).Where("email = ? AND is_active = ?", d.Recipient, true).Count(&count).Error; err != nil {
				return err, false
			}
			if count == 0 {
				return nil, true
			}
		}
		return integrations.NewMailer(s.Config).Send(d.Recipient, d.Title, d.Body), false
	}
	var sub models.PushSubscription
	q := s.DB.Where("device_hash = ? AND updated_at > ?", d.Recipient, time.Now().Add(-90*24*time.Hour))
	if d.Marketing {
		q = q.Where("marketing = ?", true)
	} else if d.UserID != nil {
		q = q.Where("user_id = ? AND account_expires_at > ?", *d.UserID, time.Now())
	} else {
		return nil, true
	}
	if err := q.First(&sub).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, true
		}
		return err, false
	}
	client := firebase.Client{Config: firebase.FromEnv(), CredentialPath: os.Getenv("FIREBASE_SERVICE_ACCOUNT_FILE"), AllowNetwork: true}
	return client.Send(ctx, sub.Token, firebase.Message{Title: d.Title, Body: d.Body, Path: d.Path}), false
}
