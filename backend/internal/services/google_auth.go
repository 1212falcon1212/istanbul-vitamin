package services

import (
	"context"
	"errors"
	"github.com/istanbulvitamin/backend/internal/middleware"
	"github.com/istanbulvitamin/backend/internal/models"
	"google.golang.org/api/idtoken"
	"gorm.io/gorm"
	"strings"
	"time"
)

func (s *AuthService) GoogleLogin(ctx context.Context, credential, clientID string) (string, *models.User, error) {
	if clientID == "" || credential == "" {
		return "", nil, errors.New("Google girişi yapılandırılmamış")
	}
	payload, err := idtoken.Validate(ctx, credential, clientID)
	if err != nil {
		return "", nil, errors.New("Google kimliği doğrulanamadı")
	}
	email, _ := payload.Claims["email"].(string)
	verified, _ := payload.Claims["email_verified"].(bool)
	if payload.Subject == "" || email == "" || !verified || (payload.Issuer != "https://accounts.google.com" && payload.Issuer != "accounts.google.com") {
		return "", nil, errors.New("Doğrulanmış Google hesabı gerekli")
	}
	email = strings.ToLower(strings.TrimSpace(email))
	var user models.User
	err = s.db.Transaction(func(tx *gorm.DB) error {
		e := tx.Where("google_subject = ?", payload.Subject).First(&user).Error
		if errors.Is(e, gorm.ErrRecordNotFound) {
			// Existing accounts must be explicitly linked after password authentication.
			var count int64
			if err := tx.Model(&models.User{}).Where("email = ?", email).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return errors.New("Bu e-posta ile hesabınız var. Mevcut şifrenizle giriş yapın.")
			}
			first, _ := payload.Claims["given_name"].(string)
			last, _ := payload.Claims["family_name"].(string)
			now := time.Now()
			user = models.User{Email: email, GoogleSubject: &payload.Subject, PasswordHash: "!google-only", FirstName: first, LastName: last, IsActive: true, EmailVerifiedAt: &now}
			return tx.Create(&user).Error
		}
		return e
	})
	if err != nil {
		return "", nil, err
	}
	if !user.IsActive {
		return "", nil, errors.New("Hesabınız devre dışı")
	}
	token, err := middleware.GenerateToken(s.cfg, user.ID, user.Email, "user", user.SessionVersion)
	return token, &user, err
}
