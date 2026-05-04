package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/integrations/aras"
	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

// CancellationService müşteri-tetiklenen iptal/iade taleplerinin orchestrator'ı.
//
// Akış:
//   - pending sipariş + type=cancel → otomatik onay (Aras çağrısı yok), refund tetikle, stok iade.
//   - shipped sipariş + type=cancel → "requested" durumda admin kuyruğuna gir; onayda Aras CancelDispatch dene.
//   - delivered sipariş + type=return → "requested" durumda admin kuyruğuna gir; onayda iade kargosu oluştur.
type CancellationService struct {
	db       *gorm.DB
	orderSvc *OrderService
	arasSvc  *aras.Service
	payment  *PaymentService
}

// NewCancellationService yeni bir cancellation orchestrator'ı oluşturur.
func NewCancellationService(db *gorm.DB, orderSvc *OrderService, arasSvc *aras.Service, payment *PaymentService) *CancellationService {
	return &CancellationService{db: db, orderSvc: orderSvc, arasSvc: arasSvc, payment: payment}
}

// validReasons müşteri formundan kabul edilen neden kodları.
var validReasons = map[string]bool{
	"wrong_item":        true,
	"damaged":           true,
	"no_longer_needed":  true,
	"size_color":        true,
	"late_delivery":     true,
	"other":             true,
}

// RequestByCustomer müşterinin yeni iptal/iade talebi açar.
//
// Otomatik onay: pending + cancel (Aras'a gidilmedi → güvenli geri al).
// Admin onayı şart: shipped/delivered için her şey.
func (s *CancellationService) RequestByCustomer(userID, orderID uint64, ctype, reason, note string) (*models.OrderCancellation, error) {
	if ctype != "cancel" && ctype != "return" {
		return nil, errors.New("geçersiz talep tipi")
	}
	if !validReasons[reason] {
		return nil, errors.New("geçersiz iptal/iade nedeni")
	}

	var order models.Order
	if err := s.db.First(&order, orderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("sipariş bulunamadı")
		}
		return nil, errors.New("sipariş bilgisi alınamadı")
	}
	if order.UserID == nil || *order.UserID != userID {
		return nil, errors.New("bu sipariş size ait değil")
	}

	// Mevcut açık talep var mı?
	var openCount int64
	s.db.Model(&models.OrderCancellation{}).
		Where("order_id = ? AND status IN ?", orderID, []string{"requested", "approved"}).
		Count(&openCount)
	if openCount > 0 {
		return nil, errors.New("bu sipariş için açık bir iptal/iade talebi zaten var")
	}

	// İş kuralları:
	// - cancel sadece pending veya shipped iken anlamlı
	// - return sadece delivered iken anlamlı
	switch order.Status {
	case "pending":
		if ctype != "cancel" {
			return nil, errors.New("bekleyen sipariş için sadece iptal talebi açılabilir")
		}
	case "shipped":
		if ctype != "cancel" {
			return nil, errors.New("kargolanmış sipariş için iptal talebi açılabilir; teslim sonrası iade için 'iade' kullanın")
		}
	case "delivered":
		if ctype != "return" {
			return nil, errors.New("teslim edilmiş sipariş için iade talebi açılabilir")
		}
	default:
		return nil, errors.New("bu siparişin mevcut durumu için iptal/iade açılamaz")
	}

	cancellation := &models.OrderCancellation{
		OrderID:           orderID,
		Type:              ctype,
		Status:            "requested",
		Reason:            reason,
		Note:              strings.TrimSpace(note),
		RequestedByUserID: &userID,
	}
	refundAmount := order.Total
	cancellation.RefundAmount = &refundAmount

	if err := s.db.Create(cancellation).Error; err != nil {
		return nil, errors.New("talep kaydedilemedi")
	}

	// Pending + cancel → otomatik onay yolu (Aras yok, refund tetikle, stok iade et).
	if order.Status == "pending" && ctype == "cancel" {
		if err := s.autoApprovePendingCancel(cancellation, &order); err != nil {
			// hata: talep "requested" kalır, admin manuel kapatabilir
			return cancellation, fmt.Errorf("otomatik iptal akışı başarısız (talep oluşturuldu): %w", err)
		}
	}

	return cancellation, nil
}

// autoApprovePendingCancel pending bir sipariş için tam akışı çalıştırır.
func (s *CancellationService) autoApprovePendingCancel(cancellation *models.OrderCancellation, order *models.Order) error {
	if err := s.orderSvc.CancelByCustomer(order.ID, "Müşteri talebi: "+cancellation.Reason); err != nil {
		return err
	}
	now := time.Now()
	updates := map[string]interface{}{
		"status":      "completed",
		"decided_at":  &now,
	}
	// Refund yalnızca PaymentID set ise (yani PayTR ödemesi tamamlanmışsa).
	if strings.TrimSpace(order.PaymentID) != "" && order.Total > 0 {
		refundRef := fmt.Sprintf("CANCEL-%d", cancellation.ID)
		processing := "processing"
		updates["refund_status"] = processing
		_ = s.db.Model(cancellation).Updates(updates).Error

		res, refErr := s.payment.RefundPayment(order.ID, order.Total, refundRef)
		finalUpdates := map[string]interface{}{}
		if refErr != nil {
			finalUpdates["refund_status"] = "failed"
		} else {
			finalUpdates["refund_status"] = "completed"
			finalUpdates["paytr_refund_id"] = res.ReferenceNo
		}
		return s.db.Model(cancellation).Updates(finalUpdates).Error
	}
	// Ödeme yok / dev mode — sadece status completed.
	return s.db.Model(cancellation).Updates(updates).Error
}

// ApproveByAdmin admin onayı ile akışı tamamlar.
//   - cancel + shipped     → Aras CancelDispatch dene; başarılıysa status=cancelled, refund tetikle.
//                            Başarısız (999) ise status="completed" ama aras_cancel_succeeded=false; refund yine yap.
//   - return + delivered  → Aras iade gönderimi oluştur (CreateReturnShipment), refund tetikle, status=refunded.
func (s *CancellationService) ApproveByAdmin(adminID, cancellationID uint64) error {
	var cancellation models.OrderCancellation
	if err := s.db.Preload("Order").First(&cancellation, cancellationID).Error; err != nil {
		return errors.New("talep bulunamadı")
	}
	if cancellation.Status != "requested" {
		return errors.New("sadece bekleyen talepler onaylanabilir")
	}
	if cancellation.Order == nil {
		return errors.New("sipariş bağlantısı bozuk")
	}
	order := cancellation.Order

	now := time.Now()
	approveUpdates := map[string]interface{}{
		"status":              "approved",
		"decided_by_admin_id": &adminID,
		"decided_at":          &now,
	}
	if err := s.db.Model(&cancellation).Updates(approveUpdates).Error; err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Aras tarafı
	switch {
	case cancellation.Type == "cancel" && order.Status == "shipped":
		// CancelDispatch dene; 999 (irsaliye kesildi) — yine de iade akışına dön.
		if err := s.arasSvc.CancelShipment(ctx, order.ID); err != nil {
			if !errors.Is(err, aras.ErrCannotCancel) {
				// gerçek hata — taleple birlikte log'la, devam etme
				_ = s.db.Model(&cancellation).Update("refund_status", "failed").Error
				return fmt.Errorf("aras cancel hatası: %w", err)
			}
			// 999 — kargo yola çıktı, iadeye dönüştür
			if err := s.arasSvc.CreateReturnShipment(ctx, cancellation.ID); err != nil {
				return fmt.Errorf("aras iade kargosu oluşturulamadı: %w", err)
			}
		}
		// Sipariş statüsünü cancelled yap
		_ = s.orderSvc.UpdateStatus(order.ID, "cancelled", "İptal: "+cancellation.Reason, fmt.Sprintf("admin:%d", adminID))
	case cancellation.Type == "return" && order.Status == "delivered":
		if err := s.arasSvc.CreateReturnShipment(ctx, cancellation.ID); err != nil {
			return fmt.Errorf("aras iade kargosu oluşturulamadı: %w", err)
		}
		_ = s.orderSvc.MarkRefunded(order.ID, "İade: "+cancellation.Reason, fmt.Sprintf("admin:%d", adminID))
	default:
		return errors.New("talep tipi/sipariş durumu uyumsuz")
	}

	// PayTR refund
	if cancellation.RefundAmount != nil && *cancellation.RefundAmount > 0 && strings.TrimSpace(order.PaymentID) != "" {
		_ = s.db.Model(&cancellation).Update("refund_status", "processing").Error
		refundRef := fmt.Sprintf("CANCEL-%d", cancellation.ID)
		res, refErr := s.payment.RefundPayment(order.ID, *cancellation.RefundAmount, refundRef)
		final := map[string]interface{}{
			"status": "completed",
		}
		if refErr != nil {
			final["refund_status"] = "failed"
			_ = s.db.Model(&cancellation).Updates(final).Error
			return fmt.Errorf("refund hatası: %w", refErr)
		}
		final["refund_status"] = "completed"
		final["paytr_refund_id"] = res.ReferenceNo
		return s.db.Model(&cancellation).Updates(final).Error
	}

	// Refund tetiklenmediyse direkt completed
	return s.db.Model(&cancellation).Update("status", "completed").Error
}

// RejectByAdmin admin talebi reddeder.
func (s *CancellationService) RejectByAdmin(adminID, cancellationID uint64, reason string) error {
	var cancellation models.OrderCancellation
	if err := s.db.First(&cancellation, cancellationID).Error; err != nil {
		return errors.New("talep bulunamadı")
	}
	if cancellation.Status != "requested" {
		return errors.New("sadece bekleyen talepler reddedilebilir")
	}
	now := time.Now()
	return s.db.Model(&cancellation).Updates(map[string]interface{}{
		"status":              "rejected",
		"decided_by_admin_id": &adminID,
		"decided_at":          &now,
		"note":                strings.TrimSpace(cancellation.Note + "\n\nRed nedeni: " + reason),
	}).Error
}

// ListByCustomer müşterinin tüm iptal/iade taleplerini döner.
func (s *CancellationService) ListByCustomer(userID uint64) ([]models.OrderCancellation, error) {
	var rows []models.OrderCancellation
	err := s.db.
		Preload("Order", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, order_number, status, total, created_at")
		}).
		Where("requested_by_user_id = ?", userID).
		Order("created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, errors.New("talepler getirilemedi")
	}
	return rows, nil
}

// ListPending admin kuyruğu — requested + approved durumdakileri döndürür.
// statusFilter "all" ise tümü; aksi halde tek status.
func (s *CancellationService) ListPending(statusFilter string, page, perPage int) ([]models.OrderCancellation, int64, error) {
	if perPage <= 0 || perPage > 100 {
		perPage = 20
	}
	if page <= 0 {
		page = 1
	}
	q := s.db.Model(&models.OrderCancellation{})
	if statusFilter != "" && statusFilter != "all" {
		q = q.Where("status = ?", statusFilter)
	} else {
		q = q.Where("status IN ?", []string{"requested", "approved"})
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, errors.New("talepler sayılamadı")
	}
	var rows []models.OrderCancellation
	err := q.
		Preload("Order", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, order_number, user_id, status, total, shipping_first_name, shipping_last_name, created_at")
		}).
		Order("created_at DESC").
		Offset((page - 1) * perPage).
		Limit(perPage).
		Find(&rows).Error
	if err != nil {
		return nil, 0, errors.New("talepler getirilemedi")
	}
	return rows, total, nil
}
