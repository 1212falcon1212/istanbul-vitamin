package utils

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

// JSON response helpers

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type PaginatedResponse struct {
	Success    bool        `json:"success"`
	Data       interface{} `json:"data"`
	Pagination *Pagination `json:"pagination"`
}

func SuccessResponse(c *fiber.Ctx, data interface{}) error {
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
	})
}

func SuccessMessageResponse(c *fiber.Ctx, message string) error {
	return c.JSON(APIResponse{
		Success: true,
		Message: message,
	})
}

func CreatedResponse(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(APIResponse{
		Success: true,
		Data:    data,
	})
}

func PaginatedSuccessResponse(c *fiber.Ctx, data interface{}, pagination *Pagination) error {
	return c.JSON(PaginatedResponse{
		Success:    true,
		Data:       data,
		Pagination: pagination,
	})
}

func ErrorResponse(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

func BadRequest(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusBadRequest, message)
}

func Unauthorized(c *fiber.Ctx) error {
	return ErrorResponse(c, fiber.StatusUnauthorized, "Yetkilendirme hatası")
}

func Forbidden(c *fiber.Ctx) error {
	return ErrorResponse(c, fiber.StatusForbidden, "Bu işlem için yetkiniz yok")
}

func NotFound(c *fiber.Ctx, resource string) error {
	return ErrorResponse(c, fiber.StatusNotFound, fmt.Sprintf("%s bulunamadı", resource))
}

func InternalError(c *fiber.Ctx) error {
	return ErrorResponse(c, fiber.StatusInternalServerError, "Sunucu hatası oluştu")
}

// GenerateOrderNumber generates an order number like "DE-20260001"
func GenerateOrderNumber(lastID uint) string {
	year := time.Now().Year()
	return fmt.Sprintf("DE-%d%04d", year, lastID)
}
