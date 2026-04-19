package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type NewsletterService struct {
	db *gorm.DB
}

func NewNewsletterService(db *gorm.DB) *NewsletterService {
	return &NewsletterService{db: db}
}

// generateUnsubscribeToken crypto/rand ile 32 byte rastgele token üretir (hex → 64 karakter).
func generateUnsubscribeToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", errors.New("token oluşturulamadı")
	}
	return hex.EncodeToString(b), nil
}

// Subscribe bir e-posta adresini bültene kaydeder. Varsa reaktive eder, yoksa yeni satır oluşturur.
func (s *NewsletterService) Subscribe(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || !utils.IsValidEmail(email) {
		return errors.New("geçerli bir e-posta adresi giriniz")
	}

	token, err := generateUnsubscribeToken()
	if err != nil {
		return err
	}

	var existing models.NewsletterSubscriber
	err = s.db.Where("email = ?", email).First(&existing).Error
	if err == nil {
		// Reaktive et — yeni token üret, aktif bayrağını aç.
		updates := map[string]interface{}{
			"is_active":         true,
			"unsubscribe_token": token,
			"subscribed_at":     time.Now(),
			"unsubscribed_at":   nil,
		}
		if err := s.db.Model(&existing).Updates(updates).Error; err != nil {
			return errors.New("abonelik güncellenirken bir hata oluştu")
		}
		return nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New("abonelik işlemi sırasında bir hata oluştu")
	}

	sub := &models.NewsletterSubscriber{
		Email:            email,
		UnsubscribeToken: token,
		IsActive:         true,
		SubscribedAt:     time.Now(),
	}
	if err := s.db.Create(sub).Error; err != nil {
		return errors.New("abonelik kaydedilirken bir hata oluştu")
	}
	return nil
}

// Unsubscribe token üzerinden aboneliği kapatır.
func (s *NewsletterService) Unsubscribe(token string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return errors.New("geçersiz bağlantı")
	}

	var sub models.NewsletterSubscriber
	if err := s.db.Where("unsubscribe_token = ?", token).First(&sub).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("geçersiz veya kullanılmış bağlantı")
		}
		return errors.New("abonelik iptali sırasında bir hata oluştu")
	}

	if !sub.IsActive {
		return nil // idempotent
	}

	now := time.Now()
	if err := s.db.Model(&sub).Updates(map[string]interface{}{
		"is_active":       false,
		"unsubscribed_at": now,
	}).Error; err != nil {
		return errors.New("abonelik iptali sırasında bir hata oluştu")
	}
	return nil
}
