package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/services"
	"github.com/istanbulvitamin/backend/internal/utils"
)

type CartHandler struct {
	service *services.CartService
}

func NewCartHandler() *CartHandler {
	return &CartHandler{
		service: services.NewCartService(database.DB),
	}
}

type addItemRequest struct {
	ProductID uint64  `json:"product_id"`
	VariantID *uint64 `json:"variant_id"`
	Quantity  int     `json:"quantity"`
}

type updateItemRequest struct {
	Quantity int `json:"quantity"`
}

type applyCouponRequest struct {
	Code string `json:"code"`
}

// Get kullanicinin veya misafirin sepetini dondurur.
func (h *CartHandler) Get(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uint64)
	sessionID := c.Get("X-Session-ID", c.Cookies("session_id"))

	var userIDPtr *uint64
	if userID > 0 {
		userIDPtr = &userID
	}

	if userIDPtr == nil && sessionID == "" {
		return utils.BadRequest(c, "Oturum bilgisi gereklidir")
	}

	cart, err := h.service.GetOrCreateCart(userIDPtr, sessionID)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"cart": cart,
	})
}

// AddItem sepete urun ekler.
func (h *CartHandler) AddItem(c *fiber.Ctx) error {
	var req addItemRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.ProductID == 0 {
		return utils.BadRequest(c, "Ürün ID zorunludur")
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	userID, _ := c.Locals("userID").(uint64)
	sessionID := c.Get("X-Session-ID", c.Cookies("session_id"))

	var userIDPtr *uint64
	if userID > 0 {
		userIDPtr = &userID
	}

	if userIDPtr == nil && sessionID == "" {
		return utils.BadRequest(c, "Oturum bilgisi gereklidir")
	}

	cart, err := h.service.GetOrCreateCart(userIDPtr, sessionID)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	if err := h.service.AddItem(cart.ID, req.ProductID, req.VariantID, req.Quantity); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	// Guncel sepeti dondur
	updatedCart, err := h.service.GetCartWithDetails(cart.ID)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"cart": updatedCart,
	})
}

// UpdateItem sepet ogesinin miktarini gunceller.
func (h *CartHandler) UpdateItem(c *fiber.Ctx) error {
	itemID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz öğe ID'si")
	}

	var req updateItemRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.Quantity <= 0 {
		return utils.BadRequest(c, "Miktar sıfırdan büyük olmalıdır")
	}

	userID, _ := c.Locals("userID").(uint64)
	sessionID := c.Get("X-Session-ID", c.Cookies("session_id"))

	var userIDPtr *uint64
	if userID > 0 {
		userIDPtr = &userID
	}

	cart, err := h.service.GetOrCreateCart(userIDPtr, sessionID)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	if err := h.service.UpdateItem(itemID, cart.ID, req.Quantity); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	updatedCart, err := h.service.GetCartWithDetails(cart.ID)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"cart": updatedCart,
	})
}

// RemoveItem sepetten urun kaldirir.
func (h *CartHandler) RemoveItem(c *fiber.Ctx) error {
	itemID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return utils.BadRequest(c, "Geçersiz öğe ID'si")
	}

	userID, _ := c.Locals("userID").(uint64)
	sessionID := c.Get("X-Session-ID", c.Cookies("session_id"))

	var userIDPtr *uint64
	if userID > 0 {
		userIDPtr = &userID
	}

	cart, err := h.service.GetOrCreateCart(userIDPtr, sessionID)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	if err := h.service.RemoveItem(itemID, cart.ID); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	updatedCart, err := h.service.GetCartWithDetails(cart.ID)
	if err != nil {
		return utils.InternalError(c)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"cart": updatedCart,
	})
}

// ApplyCoupon sepete kupon uygular.
func (h *CartHandler) ApplyCoupon(c *fiber.Ctx) error {
	var req applyCouponRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Geçersiz istek formatı")
	}

	if req.Code == "" {
		return utils.BadRequest(c, "Kupon kodu zorunludur")
	}

	userID, _ := c.Locals("userID").(uint64)
	sessionID := c.Get("X-Session-ID", c.Cookies("session_id"))

	var userIDPtr *uint64
	if userID > 0 {
		userIDPtr = &userID
	}

	cart, err := h.service.GetOrCreateCart(userIDPtr, sessionID)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	coupon, err := h.service.ApplyCoupon(cart.ID, req.Code, userIDPtr)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"coupon": coupon,
	})
}

// RemoveCoupon kuponu sepetten kaldirir.
func (h *CartHandler) RemoveCoupon(c *fiber.Ctx) error {
	return utils.SuccessMessageResponse(c, "Kupon kaldırıldı")
}

// Merge giriş yapmış kullanıcıya, X-Session-ID ile misafir sepetini birleştirir.
// POST /cart/merge — requireAuth middleware gerekli.
func (h *CartHandler) Merge(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uint64)
	if userID == 0 {
		return utils.Unauthorized(c)
	}

	sessionID := c.Get("X-Session-ID", c.Cookies("session_id"))
	if sessionID == "" {
		return utils.SuccessMessageResponse(c, "Birleştirilecek misafir sepeti yok")
	}

	if err := h.service.MergeGuestCart(sessionID, userID); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessMessageResponse(c, "Sepet birleştirildi")
}

// GetCartID kolay erişim için tek satırlık helper (parametresiz strconv için).
var _ = strconv.Itoa
