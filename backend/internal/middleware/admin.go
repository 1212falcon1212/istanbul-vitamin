package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
)

type AdminMiddleware struct {
	cfg *config.Config
}

func NewAdminMiddleware(cfg *config.Config) *AdminMiddleware {
	return &AdminMiddleware{cfg: cfg}
}

func (m *AdminMiddleware) RequireAdmin(c *fiber.Ctx) error {
	role, ok := c.Locals("role").(string)
	if !ok {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Bu işlem için yetkiniz yok",
		})
	}

	switch role {
	case "super_admin", "admin", "editor":
		return c.Next()
	default:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Bu işlem için yetkiniz yok",
		})
	}
}

func (m *AdminMiddleware) RequireSuperAdmin(c *fiber.Ctx) error {
	role, ok := c.Locals("role").(string)
	if !ok || role != "super_admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Bu işlem sadece süper admin tarafından yapılabilir",
		})
	}
	return c.Next()
}
