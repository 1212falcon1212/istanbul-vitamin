package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/istanbulvitamin/backend/internal/config"
	"net/http/httptest"
	"testing"
	"time"
)

func TestAuthStopsHandler(t *testing.T) {
	cfg := &config.Config{JWTSecret: "local-unit-test-secret", JWTExpiry: "1h"}
	m := NewAuthMiddleware(cfg)
	adminToken, _ := GenerateToken(cfg, 1, "admin@example.invalid", "super_admin", 0)
	valid, _ := GenerateToken(cfg, 1, "test@example.invalid", "user", 0)
	expired, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, JWTClaims{UserID: 1, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour))}}).SignedString([]byte(cfg.JWTSecret))
	wrongAlg, _ := jwt.NewWithClaims(jwt.SigningMethodHS384, JWTClaims{UserID: 1, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte(cfg.JWTSecret))
	for _, tc := range []struct {
		name, token string
		admin       bool
		want        int
	}{{"admin cannot impersonate user", adminToken, false, 403}, {"valid admin", adminToken, true, 200}, {"missing", "", false, 401}, {"invalid", "bad", false, 401}, {"expired", expired, false, 401}, {"algorithm", wrongAlg, false, 401}, {"user", valid, false, 200}, {"user cannot admin", valid, true, 403}, {"missing admin", "", true, 401}} {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			called := false
			auth := m.Authenticate
			if tc.admin {
				auth = m.AdminAuthenticate
			}
			app.Get("/", auth, func(c *fiber.Ctx) error { called = true; return c.SendStatus(200) })
			req := httptest.NewRequest("GET", "/", nil)
			if tc.token != "" {
				req.Header.Set("Authorization", "Bearer "+tc.token)
			}
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			if res.StatusCode != tc.want || called != (tc.want == 200) {
				t.Fatalf("status=%d handlerCalled=%v", res.StatusCode, called)
			}
		})
	}
}
func TestOriginCheck(t *testing.T) {
	for _, tc := range []struct {
		origin string
		want   int
	}{{"https://evil.invalid", 403}, {"http://localhost:3000", 200}, {"null", 403}} {
		app := fiber.New()
		app.Use(OriginCheck([]string{"http://localhost:3000"}))
		app.Post("/", func(c *fiber.Ctx) error { return c.SendStatus(200) })
		req := httptest.NewRequest("POST", "/", nil)
		req.Header.Set("Origin", tc.origin)
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != tc.want {
			t.Fatalf("%s: %d", tc.origin, res.StatusCode)
		}
	}
}
