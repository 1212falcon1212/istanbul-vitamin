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
	UserID uint64 `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"` // "user", "super_admin", "admin", "editor"
	// PwdAt token üretildiği andaki password_changed_at epoch saniyesi.
	// Kullanıcı şifresini değiştirince PasswordChangedAt güncellenir ve bu değer ile
	// DB'deki değer eşleşmezse token reddedilir (stale session).
	PwdAt int64 `json:"pwd_at,omitempty"`
	jwt.RegisteredClaims
}

// Authenticate kullanıcı oturumlarını doğrular — `auth_token` cookie veya
// Authorization: Bearer header üzerinden.
func (m *AuthMiddleware) Authenticate(c *fiber.Ctx) error {
	if err := m.parseAndSetClaims(c, "auth_token"); err != nil {
		return err
	}
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
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Yetkilendirme başlığı eksik",
		})
	}

	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Geçersiz veya süresi dolmuş token",
		})
	}

	if !passwordTokenStillValid(claims) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Şifreniz değiştirildiği için oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.",
		})
	}

	c.Locals("userID", claims.UserID)
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

// passwordTokenStillValid token'da kayıtlı pwd_at, DB'deki password_changed_at ile eşleşiyor mu.
// DB hit tek indexli (PK) sorgudur; minimal maliyet.
func passwordTokenStillValid(claims *JWTClaims) bool {
	if claims.PwdAt == 0 {
		// Eski token (alan set edilmeden üretilmiş) — geriye dönük uyumluluk için izin ver
		return true
	}
	db := database.DB
	if db == nil {
		return true
	}
	switch claims.Role {
	case "super_admin", "admin", "editor":
		var admin models.Admin
		if err := db.Select("id, password_changed_at").First(&admin, claims.UserID).Error; err != nil {
			return false
		}
		if admin.PasswordChangedAt == nil {
			return true
		}
		return admin.PasswordChangedAt.Unix() <= claims.PwdAt
	default:
		var user models.User
		if err := db.Select("id, password_changed_at").First(&user, claims.UserID).Error; err != nil {
			return false
		}
		if user.PasswordChangedAt == nil {
			return true
		}
		return user.PasswordChangedAt.Unix() <= claims.PwdAt
	}
}

func GenerateToken(cfg *config.Config, userID uint64, email, role string, pwdAt int64) (string, error) {
	expiry, err := time.ParseDuration(cfg.JWTExpiry)
	if err != nil {
		expiry = 24 * time.Hour
	}

	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		PwdAt:  pwdAt,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}
