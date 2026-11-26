package middleware

import (
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/database"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"net/http/httptest"
	"testing"
	"time"
)

func TestAuthStopsHandler(t *testing.T) {
	cfg := &config.Config{JWTSecret: "local-unit-test-secret", JWTExpiry: "1h"}
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	old := database.DB
	defer func() { database.DB = old }()
	database.DB, err = gorm.Open(mysql.New(mysql.Config{Conn: conn, SkipInitializeWithVersion: true}), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	m := NewAuthMiddleware(cfg)
	adminToken, _ := GenerateToken(cfg, 1, "admin@example.invalid", "super_admin", 1)
	valid, _ := GenerateToken(cfg, 1, "test@example.invalid", "user", 1)
	expired, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, JWTClaims{UserID: 1, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour))}}).SignedString([]byte(cfg.JWTSecret))
	wrongAlg, _ := jwt.NewWithClaims(jwt.SigningMethodHS384, JWTClaims{UserID: 1, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte(cfg.JWTSecret))
	revoked, _ := GenerateToken(cfg, 1, "user@example.invalid", "user", 2)
	for _, tc := range []struct {
		name, token string
		admin       bool
		want        int
	}{{"admin cannot impersonate user", adminToken, false, 403}, {"valid admin", adminToken, true, 200}, {"missing", "", false, 401}, {"invalid", "bad", false, 401}, {"expired", expired, false, 401}, {"algorithm", wrongAlg, false, 401}, {"user", valid, false, 200}, {"user cannot admin", valid, true, 403}, {"missing admin", "", true, 401}, {"revoked version", revoked, false, 401}} {
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
			if tc.token == valid || tc.token == adminToken || tc.token == revoked {
				table := "users"
				count := 1
				if tc.token == adminToken {
					table = "admins"
				}
				if tc.token == revoked {
					count = 0
				}
				mock.ExpectQuery("SELECT count.*FROM `" + table + "`.*is_active.*session_version").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(count))
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

func TestOperationsRole(t *testing.T) {
	for _, role := range []string{"editor", "admin", "super_admin"} {
		app := fiber.New()
		app.Get("/", func(c *fiber.Ctx) error { c.Locals("role", role); return c.Next() }, NewAdminMiddleware(nil).RequireAdmin, func(c *fiber.Ctx) error { return c.SendStatus(200) })
		res, err := app.Test(httptest.NewRequest("GET", "/", nil))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if (res.StatusCode == 200) != (role != "editor") {
			t.Fatalf("%s: %d", role, res.StatusCode)
		}
	}
}
