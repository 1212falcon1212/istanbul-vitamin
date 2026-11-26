package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
)

type AuthMiddleware struct {
	cfg *config.Config
}

func NewAuthMiddleware(cfg *config.Config) *AuthMiddleware {
	return &AuthMiddleware{cfg: cfg}
}

type JWTClaims struct {
	UserID         uint64 `json:"user_id"`
	Email          string `json:"email"`
	Role           string `json:"role"` // "user", "super_admin", "admin", "editor"
	SessionVersion uint64 `json:"session_version"`
	jwt.RegisteredClaims
}

// Authenticate kullanıcı oturumlarını doğrular — `auth_token` cookie veya
// Authorization: Bearer header üzerinden.
func (m *AuthMiddleware) Authenticate(c *fiber.Ctx) error {
	if err := m.parseAndSetClaims(c, "auth_token"); err != nil {
		return err
	}
	if c.Locals("role") != "user" {
		return fiber.NewError(fiber.StatusForbidden, "Müşteri oturumu gerekli")
	}
	return c.Next()
}

// OptionalAuthenticate token varsa parse edip locals'a yerleştirir, yoksa
// hata döndürmeden devam eder. /cart, /search gibi guest+user ortak akışlarda
// kullanılır — handler kendi içinde userID/sessionID kontrolü yapar.
func (m *AuthMiddleware) OptionalAuthenticate(c *fiber.Ctx) error {
	tokenString := extractTokenFrom(c, "auth_token")
	if tokenString == "" {
		return c.Next()
	}
	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.cfg.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil || !token.Valid || claims.UserID == 0 || claims.Role != "user" {
		return c.Next()
	}
	if !sessionStillValid(claims) {
		return c.Next()
	}
	c.Locals("userID", claims.UserID)
	c.Locals("sessionVersion", claims.SessionVersion)
	c.Locals("email", claims.Email)
	c.Locals("role", claims.Role)
	return c.Next()
}

// AdminAuthenticate admin panel oturumlarını doğrular — `admin_token` cookie veya
// Authorization: Bearer header üzerinden. Rol super_admin/admin/editor değilse reddeder.
func (m *AuthMiddleware) AdminAuthenticate(c *fiber.Ctx) error {
	if err := m.parseAndSetClaims(c, "admin_token"); err != nil {
		return err
	}
	role, _ := c.Locals("role").(string)
	switch role {
	case "super_admin", "admin", "editor":
		return c.Next()
	default:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Admin paneline erişim yetkiniz yok",
		})
	}
}

// parseAndSetClaims verilen cookie adından veya Authorization header'dan token
// çıkarıp doğrular, locals'a kimlik bilgilerini yerleştirir. Hata olursa response
// yazıp o hatayı döner. Başarıyla tamamlanırsa nil döner; caller c.Next() çağırmalı.
func (m *AuthMiddleware) parseAndSetClaims(c *fiber.Ctx, cookieName string) error {
	tokenString := extractTokenFrom(c, cookieName)
	if tokenString == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "Yetkilendirme başlığı eksik")
	}

	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.cfg.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil || !token.Valid || claims.UserID == 0 {
		return fiber.NewError(fiber.StatusUnauthorized, "Geçersiz veya süresi dolmuş token")
	}

	if !sessionStillValid(claims) {
		return fiber.NewError(fiber.StatusUnauthorized, "Oturum sonlandırıldı. Lütfen tekrar giriş yapın.")
	}

	c.Locals("userID", claims.UserID)
	c.Locals("sessionVersion", claims.SessionVersion)
	c.Locals("email", claims.Email)
	c.Locals("role", claims.Role)
	return nil
}

// extractTokenFrom Authorization: Bearer <token> veya verilen cookie adından okur.
func extractTokenFrom(c *fiber.Ctx, cookieName string) string {
	if h := c.Get("Authorization"); h != "" {
		if strings.HasPrefix(h, "Bearer ") {
			return strings.TrimPrefix(h, "Bearer ")
		}
	}
	if ck := c.Cookies(cookieName); ck != "" {
		return ck
	}
	return ""
}

func sessionStillValid(claims *JWTClaims) bool {
	db := database.DB
	if db == nil || claims.SessionVersion == 0 {
		return false
	}
	var count int64
	query := db.Model(&models.User{})
	switch claims.Role {
	case "user":
	case "super_admin", "admin", "editor":
		query = db.Model(&models.Admin{}).Where("role = ?", claims.Role)
	default:
		return false
	}
	return query.Where("id = ? AND is_active = ? AND session_version = ?", claims.UserID, true, claims.SessionVersion).Count(&count).Error == nil && count == 1
}

func GenerateToken(cfg *config.Config, userID uint64, email, role string, version uint64) (string, error) {
	expiry, err := time.ParseDuration(cfg.JWTExpiry)
	if err != nil {
		expiry = 24 * time.Hour
	}

	claims := JWTClaims{
		UserID:         userID,
		Email:          email,
		Role:           role,
		SessionVersion: version,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}
