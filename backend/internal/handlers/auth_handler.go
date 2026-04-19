package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/middleware"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

// Cookie adları — kullanıcı ve admin oturumları ayrı cookie'lerde tutulur
// ki aynı tarayıcıda her iki oturum eş zamanlı açık kalabilsin.
const (
	authCookieName  = "auth_token"  // kullanıcı oturumu
	adminCookieName = "admin_token" // admin panel oturumu
)

// setCookieNamed HttpOnly, SameSite=Lax cookie yazar — ad parametrik.
func setCookieNamed(c *fiber.Ctx, name, token string, prod bool, expiryHours int) {
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    token,
		HTTPOnly: true,
		Secure:   prod,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   expiryHours * 3600,
	})
}

// clearCookieNamed cookie'yi geçmiş tarihle silmek için.
func clearCookieNamed(c *fiber.Ctx, name string, prod bool) {
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    "",
		HTTPOnly: true,
		Secure:   prod,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   -1,
	})
}

// setAuthCookie kullanıcı oturum cookie'si.
func setAuthCookie(c *fiber.Ctx, token string, prod bool, expiryHours int) {
	setCookieNamed(c, authCookieName, token, prod, expiryHours)
}

// setAdminCookie admin panel oturum cookie'si (user'dan ayrı tutulur).
func setAdminCookie(c *fiber.Ctx, token string, prod bool, expiryHours int) {
	setCookieNamed(c, adminCookieName, token, prod, expiryHours)
}

// clearAuthCookie sadece user cookie'sini siler.
func clearAuthCookie(c *fiber.Ctx, prod bool) {
	clearCookieNamed(c, authCookieName, prod)
}

// clearAdminCookie sadece admin cookie'sini siler.
func clearAdminCookie(c *fiber.Ctx, prod bool) {
	clearCookieNamed(c, adminCookieName, prod)
}

type AuthHandler struct {
	service *services.AuthService
	cfg     *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		service: services.NewAuthService(database.DB, cfg),
		cfg:     cfg,
	}
}

type registerRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type changePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type updateProfileRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

// Register yeni kullanici kaydeder.
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Phone = strings.TrimSpace(req.Phone)

	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" {
		return utils.BadRequest(c, "E-posta, şifre, ad ve soyad alanları zorunludur")
	}

	if err := utils.ValidatePasswordStrength(req.Password); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	user, err := h.service.Register(req.Email, req.Password, req.FirstName, req.LastName, req.Phone)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	pwdAt := int64(0)
	if user.PasswordChangedAt != nil {
		pwdAt = user.PasswordChangedAt.Unix()
	}
	token, err := middleware.GenerateToken(h.cfg, user.ID, user.Email, "user", pwdAt)
	if err != nil {
		return utils.InternalError(c)
	}

	setAuthCookie(c, token, h.cfg.AppEnv == "production", 24)
	return utils.CreatedResponse(c, fiber.Map{
		"token": token,
		"user":  user,
	})
}

// Login kullanici girisi yapar.
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Email == "" || req.Password == "" {
		return utils.BadRequest(c, "E-posta ve şifre alanları zorunludur")
	}

	token, user, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		return utils.Unauthorized(c)
	}

	setAuthCookie(c, token, h.cfg.AppEnv == "production", 24)
	return utils.SuccessResponse(c, fiber.Map{
		"token": token,
		"user":  user,
	})
}

// AdminLogin admin girisi yapar.
func (h *AuthHandler) AdminLogin(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Email == "" || req.Password == "" {
		return utils.BadRequest(c, "E-posta ve şifre alanları zorunludur")
	}

	token, admin, err := h.service.AdminLogin(req.Email, req.Password)
	if err != nil {
		return utils.Unauthorized(c)
	}

	// Admin panel oturumu için ayrı cookie — kullanıcı oturumu ile çakışmaz.
	setAdminCookie(c, token, h.cfg.AppEnv == "production", 24)
	return utils.SuccessResponse(c, fiber.Map{
		"token": token,
		"admin": admin,
	})
}

// RefreshToken mevcut token ile yeni token olusturur.
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	email, _ := c.Locals("email").(string)
	role, _ := c.Locals("role").(string)

	// Refresh sırasında güncel password_changed_at'i DB'den oku
	var pwdAt int64
	if role == "super_admin" || role == "admin" || role == "editor" {
		var a struct{ PasswordChangedAt *time.Time }
		_ = database.DB.Table("admins").Select("password_changed_at").Where("id = ?", userID).Scan(&a).Error
		if a.PasswordChangedAt != nil {
			pwdAt = a.PasswordChangedAt.Unix()
		}
	} else {
		var u struct{ PasswordChangedAt *time.Time }
		_ = database.DB.Table("users").Select("password_changed_at").Where("id = ?", userID).Scan(&u).Error
		if u.PasswordChangedAt != nil {
			pwdAt = u.PasswordChangedAt.Unix()
		}
	}
	token, err := middleware.GenerateToken(h.cfg, userID, email, role, pwdAt)
	if err != nil {
		return utils.InternalError(c)
	}

	// Role'e göre uygun cookie — admin paneli user oturumuna dokunmaz.
	if role == "super_admin" || role == "admin" || role == "editor" {
		setAdminCookie(c, token, h.cfg.AppEnv == "production", 24)
	} else {
		setAuthCookie(c, token, h.cfg.AppEnv == "production", 24)
	}
	return utils.SuccessResponse(c, fiber.Map{
		"token": token,
	})
}

// GetMe oturum acmis kullanicinin bilgilerini dondurur.
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	user, err := h.service.GetUserByID(userID)
	if err != nil {
		return utils.NotFound(c, "Kullanıcı")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"user": user,
	})
}

// AdminGetMe admin panel oturumunun kimlik bilgilerini döndürür.
func (h *AuthHandler) AdminGetMe(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	admin, err := h.service.GetAdminByID(userID)
	if err != nil {
		return utils.NotFound(c, "Admin")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"user": admin,
	})
}

// UpdateProfile kullanici profil bilgilerini gunceller.
func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	var req updateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Phone = strings.TrimSpace(req.Phone)

	if req.FirstName == "" || req.LastName == "" {
		return utils.BadRequest(c, "Ad ve soyad alanları zorunludur")
	}

	user, err := h.service.GetUserByID(userID)
	if err != nil {
		return utils.NotFound(c, "Kullanıcı")
	}

	user.FirstName = req.FirstName
	user.LastName = req.LastName
	user.Phone = req.Phone

	if err := h.service.UpdateUser(user); err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"user": user,
	})
}

// ChangePassword kullanicinin sifresini degistirir.
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	var req changePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.OldPassword == "" || req.NewPassword == "" {
		return utils.BadRequest(c, "Mevcut şifre ve yeni şifre alanları zorunludur")
	}

	if err := utils.ValidatePasswordStrength(req.NewPassword); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	if err := h.service.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Şifreniz başarıyla güncellendi")
}

// Logout oturumu kapatir. Role'e göre ilgili cookie temizlenir —
// diğer oturuma dokunulmaz (user çıkışı admin oturumunu kapatmaz).
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	role, _ := c.Locals("role").(string)
	prod := h.cfg.AppEnv == "production"
	if role == "super_admin" || role == "admin" || role == "editor" {
		clearAdminCookie(c, prod)
	} else {
		clearAuthCookie(c, prod)
	}
	return utils.SuccessMessageResponse(c, "Oturum başarıyla kapatıldı")
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

// ForgotPassword e-posta ile şifre sıfırlama tokeni üretir.
// Güvenlik için e-posta kayıtlı olmasa bile aynı başarılı yanıt döner.
// Dev ortamında token sunucu loglarına yazılır; prod'da mail servisiyle gönderilir.
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req forgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" {
		return utils.BadRequest(c, "E-posta gereklidir")
	}

	if err := h.service.RequestPasswordReset(email); err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessMessageResponse(c,
		"Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderilecektir.")
}

// ResetPassword token ile yeni şifre belirler.
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req resetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}
	if req.Token == "" {
		return utils.BadRequest(c, "Token gereklidir")
	}
	if err := utils.ValidatePasswordStrength(req.Password); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	if err := h.service.ResetPassword(req.Token, req.Password); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Şifreniz başarıyla güncellendi")
}

type verifyEmailRequest struct {
	Token string `json:"token"`
}

// VerifyEmail e-posta doğrulama token'ını onaylar.
// POST /auth/verify-email body: {"token":"..."}
// Alternatif GET /auth/verify-email?token=... frontend redirect için.
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var token string
	if c.Method() == fiber.MethodGet {
		token = strings.TrimSpace(c.Query("token"))
	} else {
		var req verifyEmailRequest
		if err := c.BodyParser(&req); err != nil {
			return utils.BadRequest(c, "Geçersiz istek formatı")
		}
		token = strings.TrimSpace(req.Token)
	}

	if token == "" {
		return utils.BadRequest(c, "Token gereklidir")
	}

	if err := h.service.VerifyEmail(token); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "E-posta adresiniz doğrulandı")
}

// ResendVerification: mevcut auth'lu kullanıcı için yeni verify maili.
func (h *AuthHandler) ResendVerification(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint64)
	if !ok {
		return utils.Unauthorized(c)
	}

	user, err := h.service.GetUserByID(userID)
	if err != nil {
		return utils.NotFound(c, "Kullanıcı")
	}
	if user.EmailVerifiedAt != nil {
		return utils.BadRequest(c, "E-posta zaten doğrulanmış")
	}

	if err := h.service.RequestEmailVerification(user); err != nil {
		return utils.InternalError(c)
	}
	return utils.SuccessMessageResponse(c, "Doğrulama e-postası gönderildi")
}
