package bizimhesap

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

// MaxRetryAttempts fatura oluşturma için azami deneme sayısı.
const MaxRetryAttempts = 5

// ConfigProvider Bizimhesap konfigürasyonunu settings katmanından okur.
// SettingService'e import döngüsüne girmemek için interface olarak tutulur.
type ConfigProvider interface {
	BizimhesapConfig() (Config, error)
}

// GenerateInvoiceForOrder verilen siparişi Bizimhesap'a fatura olarak gönderir.
// Settings kapalıysa veya firmId yoksa sessiz çıkar. Başarı/başarısızlıkta
// Order kayıtlarını günceller. Bu fonksiyon goroutine içinden çağrılabilir.
func GenerateInvoiceForOrder(db *gorm.DB, cfgProvider ConfigProvider, orderID uint64) {
	log.Printf("[bizimhesap] ➜ fatura oluşturma başladı order=%d", orderID)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg, err := cfgProvider.BizimhesapConfig()
	if err != nil {
		log.Printf("[bizimhesap] ✗ config okunamadı: order=%d err=%v", orderID, err)
		persistInvoiceError(db, orderID, "config okunamadı: "+err.Error())
		return
	}
	log.Printf("[bizimhesap]   config: enabled=%t firmId=%q baseUrl=%q", cfg.Enabled, maskFirmID(cfg.FirmID), cfg.BaseURL)
	if !cfg.Enabled {
		log.Printf("[bizimhesap] ✗ entegrasyon kapalı — order=%d", orderID)
		persistInvoiceError(db, orderID, "bizimhesap entegrasyonu kapalı (ayarlardan aktifleştirin)")
		return
	}
	if strings.TrimSpace(cfg.FirmID) == "" {
		log.Printf("[bizimhesap] ✗ firmId boş — order=%d", orderID)
		persistInvoiceError(db, orderID, "firmId tanımlı değil")
		return
	}

	var order models.Order
	if err := db.Preload("Items").First(&order, orderID).Error; err != nil {
		log.Printf("[bizimhesap] ✗ sipariş getirilemedi: order=%d err=%v", orderID, err)
		return
	}
	log.Printf("[bizimhesap]   sipariş yüklendi: #%s (%d kalem)", order.OrderNumber, len(order.Items))

	// Zaten başarıyla fatura oluşturulmuş — tekrarlama.
	if strings.TrimSpace(order.BizimHesapInvoiceID) != "" {
		log.Printf("[bizimhesap] ⊘ zaten fatura var: order=%d guid=%s", orderID, order.BizimHesapInvoiceID)
		return
	}

	client := NewClient(cfg)
	resp, callErr := client.CreateInvoice(ctx, &order)
	if callErr != nil {
		log.Printf("[bizimhesap] ✗ HTTP hatası: order=%d err=%v", orderID, callErr)
		recordFailure(db, &order, callErr.Error())
		return
	}
	log.Printf("[bizimhesap]   yanıt: error=%q guid=%q url=%q", resp.Error, resp.GUID, resp.URL)
	if resp.Error != "" {
		recordFailure(db, &order, resp.Error)
		return
	}
	if strings.TrimSpace(resp.GUID) == "" {
		recordFailure(db, &order, "Bizimhesap boş GUID döndü (yanıt: "+resp.Error+")")
		return
	}

	updates := map[string]interface{}{
		"bizim_hesap_invoice_id": resp.GUID,
		"invoice_url":            resp.URL,
		"last_invoice_error":     "",
	}
	// invoiceNo olarak bizim order_number gönderildiğinden InvoiceNumber'ı da doldur.
	updates["invoice_number"] = order.OrderNumber
	if err := db.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
		log.Printf("[bizimhesap] ✗ başarı kaydedilemedi: order=%d err=%v", order.ID, err)
		return
	}
	log.Printf("[bizimhesap] ✓ fatura oluşturuldu: order=%d guid=%s url=%s", order.ID, resp.GUID, resp.URL)
}

// maskFirmID log'larda firmId'nin tamamını göstermemek için.
func maskFirmID(s string) string {
	if len(s) <= 6 {
		return s
	}
	return s[:3] + "…" + s[len(s)-3:]
}

// RetryPendingInvoices shipped olup fatura oluşturulamamış siparişleri yeniden dener.
// Saatlik cron'dan çağrılır. MaxRetryAttempts'e ulaşmış satırları atlar.
func RetryPendingInvoices(db *gorm.DB, cfgProvider ConfigProvider) {
	cfg, err := cfgProvider.BizimhesapConfig()
	if err != nil || !cfg.Enabled || strings.TrimSpace(cfg.FirmID) == "" {
		return
	}

	var orders []models.Order
	err = db.
		Where("status IN ?", []string{"shipped", "delivered"}).
		Where("bizim_hesap_invoice_id = '' OR bizim_hesap_invoice_id IS NULL").
		Where("invoice_retry_count < ?", MaxRetryAttempts).
		Limit(20).
		Find(&orders).Error
	if err != nil {
		log.Printf("[bizimhesap] retry query başarısız: %v", err)
		return
	}
	for i := range orders {
		GenerateInvoiceForOrder(db, cfgProvider, orders[i].ID)
	}
}

// RegenerateInvoice admin "yeniden oluştur" butonu için — retry sayacını sıfırlayıp tekrar dener.
// Mevcut BizimHesapInvoiceID doluysa yeniden oluşturmaz (duplicate fatura riskine karşı);
// bu durumda hata döner.
func RegenerateInvoice(db *gorm.DB, cfgProvider ConfigProvider, orderID uint64) error {
	log.Printf("[bizimhesap] ➜ manuel fatura tetiklendi order=%d", orderID)

	var order models.Order
	if err := db.First(&order, orderID).Error; err != nil {
		log.Printf("[bizimhesap] ✗ sipariş yok: order=%d err=%v", orderID, err)
		return fmt.Errorf("sipariş bulunamadı: %w", err)
	}
	if strings.TrimSpace(order.BizimHesapInvoiceID) != "" {
		log.Printf("[bizimhesap] ⊘ order=%d zaten faturalı (guid=%s)", orderID, order.BizimHesapInvoiceID)
		return errors.New("bu siparişin zaten faturası var")
	}

	// Sayaç sıfırlanır ki deneme limitine takılmadan çalışsın.
	if err := db.Model(&order).Updates(map[string]interface{}{
		"invoice_retry_count": 0,
		"last_invoice_error":  "",
	}).Error; err != nil {
		return fmt.Errorf("sayaç sıfırlanamadı: %w", err)
	}

	GenerateInvoiceForOrder(db, cfgProvider, orderID)

	// Güncel hali al — orchestrator DB'ye yazdı mı kontrol.
	if err := db.First(&order, orderID).Error; err != nil {
		log.Printf("[bizimhesap] ✗ sipariş yeniden okunamadı: order=%d err=%v", orderID, err)
		return nil
	}
	if strings.TrimSpace(order.BizimHesapInvoiceID) == "" {
		if order.LastInvoiceError != "" {
			return errors.New(order.LastInvoiceError)
		}
		return errors.New("fatura oluşturulamadı (bilinmeyen sebep)")
	}
	return nil
}

func recordFailure(db *gorm.DB, order *models.Order, msg string) {
	log.Printf("[bizimhesap] ✗ fatura başarısız: order=%d err=%s", order.ID, msg)
	trimmed := msg
	if len(trimmed) > 500 {
		trimmed = trimmed[:500]
	}
	if err := db.Model(&models.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
		"invoice_retry_count": gorm.Expr("invoice_retry_count + ?", 1),
		"last_invoice_error":  trimmed,
	}).Error; err != nil {
		log.Printf("[bizimhesap] ✗ hata kaydedilemedi (DB): order=%d err=%v", order.ID, err)
	}
}

func persistInvoiceError(db *gorm.DB, orderID uint64, msg string) {
	log.Printf("[bizimhesap] ✗ order=%d msg=%s", orderID, msg)
	if err := db.Model(&models.Order{}).Where("id = ?", orderID).Update("last_invoice_error", msg).Error; err != nil {
		log.Printf("[bizimhesap] ✗ error persist failed: order=%d err=%v", orderID, err)
	}
}
