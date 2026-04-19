package middleware

import (
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// OriginCheck CSRF koruması için Origin/Referer header doğrulaması.
// Cookie tabanlı auth'da cross-site formların state değiştirme saldırısını engeller.
//
// Mantık:
//   - Safe method'larda (GET/HEAD/OPTIONS) kontrol yok
//   - POST/PUT/PATCH/DELETE'te Origin veya Referer header izin verilen origin
//     listesine uymalı
//   - Origin yoksa (tool'lar, Postman, server-to-server) bypass edilir —
//     bu, Bearer token'la authenticate olan request'lerle uyumluluk için.
//     Tarayıcı her zaman Origin header gönderir (POST'ta), bu yüzden gerçek
//     saldırıya karşı koruma bozulmaz.
func OriginCheck(allowedOrigins []string) fiber.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.TrimRight(o, "/")] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		m := c.Method()
		if m == fiber.MethodGet || m == fiber.MethodHead || m == fiber.MethodOptions {
			return c.Next()
		}

		origin := c.Get("Origin")
		if origin == "" {
			// Referer'dan origin çıkar
			if ref := c.Get("Referer"); ref != "" {
				if u, err := url.Parse(ref); err == nil {
					origin = u.Scheme + "://" + u.Host
				}
			}
		}

		// Header yoksa: non-browser client (curl, Postman, mobile) — bypass.
		// Bu, SameSite=Lax cookie zaten tarayıcı CSRF'ini engellediği için güvenli.
		if origin == "" {
			return c.Next()
		}

		origin = strings.TrimRight(origin, "/")
		if _, ok := allowed[origin]; !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "Geçersiz istek kaynağı (CSRF korunması)",
			})
		}
		return c.Next()
	}
}
