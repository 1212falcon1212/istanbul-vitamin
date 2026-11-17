package handlers

import (
	"errors"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"io"
	"net/http"
	"strconv"
	"time"
)

func ownedReceiptOrder(c *fiber.Ctx, admin bool) (*models.Order, error) {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return nil, err
	}
	query := database.DB.Where("id = ?", id)
	if !admin {
		uid, _ := c.Locals("userID").(uint64)
		if uid == 0 {
			return nil, errors.New("unauthorized")
		}
		query = query.Where("user_id = ?", uid)
	}
	var order models.Order
	err = query.First(&order).Error
	return &order, err
}

func (h *OrderHandler) UploadReceipt(c *fiber.Ctx) error {
	order, err := ownedReceiptOrder(c, false)
	if err != nil {
		return utils.NotFound(c, "Sipariş")
	}
	file, err := c.FormFile("file")
	if err != nil || file.Size <= 0 || file.Size > 5*1024*1024 {
		return utils.BadRequest(c, "En fazla 5 MB PDF, JPEG veya PNG dekont yükleyin")
	}
	f, err := file.Open()
	if err != nil {
		return utils.BadRequest(c, "Dosya okunamadı")
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, 5*1024*1024+1))
	if err != nil || len(data) > 5*1024*1024 {
		return utils.BadRequest(c, "Dosya okunamadı veya çok büyük")
	}
	mime := http.DetectContentType(data)
	if mime != "application/pdf" && mime != "image/jpeg" && mime != "image/png" {
		return utils.BadRequest(c, "Yalnızca PDF, JPEG veya PNG dekont kabul edilir")
	}
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(order, order.ID).Error; err != nil {
			return err
		}
		if order.PaymentMethod != "bank_transfer" || order.PaymentStatus == "paid" || order.Status == "cancelled" || order.Status == "refunded" {
			return errors.New("Bu siparişe dekont yüklenemez")
		}
		receipt := models.OrderReceipt{OrderID: order.ID, Data: data, ContentType: mime, UpdatedAt: time.Now()}
		if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(&receipt).Error; err != nil {
			return err
		}
		return tx.Model(order).Updates(map[string]interface{}{"payment_status": "review", "receipt_submitted_at": time.Now()}).Error
	})
	if err != nil {
		return utils.BadRequest(c, "Dekont kaydedilemedi veya sipariş durumu uygun değil")
	}
	return utils.SuccessMessageResponse(c, "Dekont alındı. Ödemeniz kontrol edilecek.")
}

func receiptDownload(c *fiber.Ctx, admin bool) error {
	order, err := ownedReceiptOrder(c, admin)
	if err != nil {
		return utils.NotFound(c, "Sipariş")
	}
	var receipt models.OrderReceipt
	if database.DB.First(&receipt, "order_id = ?", order.ID).Error != nil {
		return utils.NotFound(c, "Dekont")
	}
	ext := map[string]string{"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}[receipt.ContentType]
	c.Set("Content-Type", receipt.ContentType)
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("Cache-Control", "no-store")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=dekont-%d.%s", order.ID, ext))
	return c.Send(receipt.Data)
}
func (h *OrderHandler) DownloadReceipt(c *fiber.Ctx) error      { return receiptDownload(c, false) }
func (h *OrderHandler) AdminDownloadReceipt(c *fiber.Ctx) error { return receiptDownload(c, true) }
func (h *OrderHandler) ConfirmTransfer(c *fiber.Ctx) error {
	order, err := ownedReceiptOrder(c, true)
	if err != nil {
		return utils.NotFound(c, "Sipariş")
	}
	adminID, _ := c.Locals("userID").(uint64)
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(order, order.ID).Error; err != nil {
			return err
		}
		if order.PaymentMethod != "bank_transfer" || order.Status == "cancelled" || order.Status == "refunded" {
			return errors.New("Havale onayı bu siparişe uygulanamaz")
		}
		if order.PaymentStatus == "paid" {
			return nil
		}
		if err := tx.Model(order).Updates(map[string]interface{}{"payment_status": "paid", "payment_confirmed_at": time.Now()}).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.OrderStatusHistory{OrderID: order.ID, OldStatus: order.Status, NewStatus: order.Status, Note: "Havale tahsilatı yönetici tarafından onaylandı", ChangedBy: fmt.Sprintf("admin:%d", adminID)}).Error; err != nil {
			return err
		}
		return models.QueueNotification(tx, fmt.Sprintf("order:%d:payment_confirmed", order.ID), "payment_confirmed", order.ID, 0)
	})
	if err != nil {
		return utils.BadRequest(c, "Ödeme onaylanamadı")
	}
	return utils.SuccessMessageResponse(c, "Havale ödemesi onaylandı")
}
