package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/integrations"
	"github.com/istanbulvitamin/backend/internal/middleware"
	"github.com/istanbulvitamin/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{
		db:  db,
		cfg: cfg,
	}
}

// Register yeni bir kullanici olusturur.
func (s *AuthService) Register(email, password, firstName, lastName, phone string) (*models.User, error) {
	// E-posta adresi kontrolu
	var existing models.User
	if err := s.db.Where("email = ?", email).First(&existing).Error; err == nil {
		return nil, errors.New("bu e-posta adresi zaten kayıtlı")
	}

	// Sifre hashleme
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("şifre işlenirken bir hata oluştu")
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		FirstName:    firstName,
		LastName:     lastName,
		Phone:        phone,
		IsActive:     true,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, errors.New("kullanıcı oluşturulurken bir hata oluştu")
	}

	// Hos geldin e-postasi (async, opsiyonel — SMTP yoksa sessizce gecer)
	if s.cfg.SMTPHost != "" {
		mailer := integrations.NewMailer(s.cfg)
		subject, htmlBody := integrations.WelcomeEmail(user.FirstName)
		mailer.SendAsync(user.Email, subject, htmlBody)
	}

	// E-posta doğrulama linki (async; hata ana akışı bozmaz)
	go func() {
		if err := s.RequestEmailVerification(user); err != nil {
			log.Printf("[email-verify] request failed for %s: %v", user.Email, err)
		}
	}()

	return user, nil
}

// Login kullaniciyi dogrular ve JWT token dondurur.
func (s *AuthService) Login(email, password string) (string, *models.User, error) {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, errors.New("e-posta adresi veya şifre hatalı")
		}
		return "", nil, errors.New("giriş işlemi sırasında bir hata oluştu")
	}

	if !user.IsActive {
		return "", nil, errors.New("hesabınız devre dışı bırakılmış")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, errors.New("e-posta adresi veya şifre hatalı")
	}

	token, err := middleware.GenerateToken(s.cfg, user.ID, user.Email, "user", passwordChangedAtUnix(user.PasswordChangedAt))
	if err != nil {
		return "", nil, errors.New("token oluşturulurken bir hata oluştu")
	}

	return token, &user, nil
}

// AdminLogin admin kullanicisini dogrular ve JWT token dondurur.
func (s *AuthService) AdminLogin(email, password string) (string, *models.Admin, error) {
	var admin models.Admin
	if err := s.db.Where("email = ?", email).First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, errors.New("e-posta adresi veya şifre hatalı")
		}
		return "", nil, errors.New("giriş işlemi sırasında bir hata oluştu")
	}

	if !admin.IsActive {
		return "", nil, errors.New("hesabınız devre dışı bırakılmış")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		return "", nil, errors.New("e-posta adresi veya şifre hatalı")
	}

	token, err := middleware.GenerateToken(s.cfg, admin.ID, admin.Email, admin.Role, passwordChangedAtUnix(admin.PasswordChangedAt))
	if err != nil {
		return "", nil, errors.New("token oluşturulurken bir hata oluştu")
	}

	return token, &admin, nil
}

// passwordChangedAtUnix JWT claim'i için pwd_at saniyesi. Nil ise 0 (geriye dönük uyum).
func passwordChangedAtUnix(t *time.Time) int64 {
	if t == nil {
		return 0
	}
	return t.Unix()
}

// GetUserByID kullaniciyi ID ile getirir.
func (s *AuthService) GetUserByID(id uint64) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("kullanıcı bulunamadı")
		}
		return nil, errors.New("kullanıcı bilgileri alınırken bir hata oluştu")
	}
	return &user, nil
}

// GetAdminByID admin'i ID ile getirir.
func (s *AuthService) GetAdminByID(id uint64) (*models.Admin, error) {
	var admin models.Admin
	if err := s.db.First(&admin, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("admin bulunamadı")
		}
		return nil, errors.New("admin bilgileri alınırken bir hata oluştu")
	}
	return &admin, nil
}

// UpdateUser kullanici bilgilerini gunceller.
func (s *AuthService) UpdateUser(user *models.User) error {
	if err := s.db.Save(user).Error; err != nil {
		return errors.New("kullanıcı bilgileri güncellenirken bir hata oluştu")
	}
	return nil
}

// ChangePassword kullanicinin sifresini degistirir.
func (s *AuthService) ChangePassword(userID uint64, oldPassword, newPassword string) error {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("kullanıcı bulunamadı")
		}
		return errors.New("kullanıcı bilgileri alınırken bir hata oluştu")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("mevcut şifreniz hatalı")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("yeni şifre işlenirken bir hata oluştu")
	}

	now := time.Now()
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"password_hash":       string(hashedPassword),
		"password_changed_at": now,
	}).Error; err != nil {
		return errors.New("şifre güncellenirken bir hata oluştu")
	}

	return nil
}

// RequestPasswordReset kullanıcıya şifre sıfırlama token'ı oluşturur.
// Güvenlik: kullanıcı bulunmasa bile hata dönmez (enumeration önleme).
func (s *AuthService) RequestPasswordReset(email string) error {
	var user models.User
	if err := s.db.Where("email = ? AND is_active = ?", email, true).First(&user).Error; err != nil {
		// Sessizce başarılı dön
		return nil
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	reset := &models.PasswordReset{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(60 * time.Minute),
	}
	if err := s.db.Create(reset).Error; err != nil {
		return err
	}

	// Dev: token'ı log'a yaz (mail servisi yok). Prod'da buradan e-posta gönder.
	resetURL := fmt.Sprintf("%s/sifremi-sifirla?token=%s",
		strings.TrimRight(s.cfg.SiteURL, "/"), token)
	log.Printf("[password-reset] user=%s url=%s", user.Email, resetURL)

	// SMTP konfigureyse gercek e-posta gonder (async)
	if s.cfg.SMTPHost != "" {
		mailer := integrations.NewMailer(s.cfg)
		subject, htmlBody := integrations.PasswordResetEmail(resetURL)
		mailer.SendAsync(user.Email, subject, htmlBody)
	}
	return nil
}

// ResetPassword token doğrular ve yeni şifreyi yazar.
func (s *AuthService) ResetPassword(token, newPassword string) error {
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	var reset models.PasswordReset
	if err := s.db.Where("token_hash = ?", tokenHash).First(&reset).Error; err != nil {
		return errors.New("geçersiz veya kullanılmış bağlantı")
	}
	if reset.UsedAt != nil {
		return errors.New("bu bağlantı zaten kullanılmış")
	}
	if time.Now().After(reset.ExpiresAt) {
		return errors.New("bağlantının süresi dolmuş, yeniden isteyin")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("şifre oluşturulamadı")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		// 1) Şifreyi güncelle + password_changed_at set et (eski JWT'leri invalidate)
		if err := tx.Model(&models.User{}).
			Where("id = ?", reset.UserID).
			Updates(map[string]interface{}{
				"password_hash":       string(hashedPassword),
				"password_changed_at": now,
			}).Error; err != nil {
			return err
		}
		// 2) Bu token + aynı user'ın aktif tüm reset token'larını used_at ile kapat
		if err := tx.Model(&models.PasswordReset{}).
			Where("user_id = ? AND used_at IS NULL", reset.UserID).
			Update("used_at", now).Error; err != nil {
			return err
		}
		return nil
	})
}

// RequestEmailVerification user için yeni verify token oluşturur ve e-posta gönderir.
// Register sonrası çağrılır.
func (s *AuthService) RequestEmailVerification(user *models.User) error {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	rec := &models.EmailVerification{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	if err := s.db.Create(rec).Error; err != nil {
		return err
	}

	verifyURL := fmt.Sprintf("%s/e-posta-dogrula?token=%s",
		strings.TrimRight(s.cfg.SiteURL, "/"), token)
	log.Printf("[email-verify] user=%s url=%s", user.Email, verifyURL)

	if s.cfg.SMTPHost != "" {
		mailer := integrations.NewMailer(s.cfg)
		subject, htmlBody := integrations.VerifyEmail(verifyURL)
		mailer.SendAsync(user.Email, subject, htmlBody)
	}
	return nil
}

// VerifyEmail verify token doğrulaması; başarılıysa user.email_verified_at = now.
func (s *AuthService) VerifyEmail(token string) error {
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	var rec models.EmailVerification
	if err := s.db.Where("token_hash = ?", tokenHash).First(&rec).Error; err != nil {
		return errors.New("geçersiz veya kullanılmış bağlantı")
	}
	if rec.VerifiedAt != nil {
		return errors.New("bu bağlantı zaten kullanılmış")
	}
	if time.Now().After(rec.ExpiresAt) {
		return errors.New("bağlantının süresi dolmuş, yeniden isteyin")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Model(&models.User{}).
			Where("id = ?", rec.UserID).
			Update("email_verified_at", now).Error; err != nil {
			return err
		}
		return tx.Model(&rec).Update("verified_at", now).Error
	})
}
