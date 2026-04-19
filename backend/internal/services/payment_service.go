package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

type CardPaymentData struct {
	CardNumber     string `json:"card_number"`
	ExpMonth       string `json:"exp_month"`
	ExpYear        string `json:"exp_year"`
	CVV            string `json:"cvv"`
	CardHolderName string `json:"card_holder_name"`
	Installment    int    `json:"installment"`
	SaveCard       bool   `json:"save_card"`
	CardToken      string `json:"card_token"`
}

type PaymentResult struct {
	Status      string `json:"status"`
	PaymentID   string `json:"payment_id"`
	RedirectURL string `json:"redirect_url"`
}

type InstallmentOption struct {
	Count         int     `json:"count"`
	TotalAmount   float64 `json:"total_amount"`
	MonthlyAmount float64 `json:"monthly_amount"`
	InterestRate  float64 `json:"interest_rate"`
}

type PaymentService struct {
	db     *gorm.DB
	cfg    *config.Config
	client *resty.Client
}

func NewPaymentService(db *gorm.DB, cfg *config.Config) *PaymentService {
	client := resty.New().
		SetBaseURL(cfg.PayTRBaseURL).
		SetTimeout(30 * time.Second)

	return &PaymentService{
		db:     db,
		cfg:    cfg,
		client: client,
	}
}

// StartPayment PayTR odeme istegi olusturur ve 3D Secure yonlendirme URL'i dondurur.
func (s *PaymentService) StartPayment(orderID uint64, cardData CardPaymentData) (*PaymentResult, error) {
	var order models.Order
	if err := s.db.Preload("Items").First(&order, orderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("sipariş bulunamadı")
		}
		return nil, errors.New("sipariş bilgileri alınırken bir hata oluştu")
	}

	if order.Status != "pending" {
		return nil, errors.New("bu sipariş için ödeme yapılamaz")
	}

	merchantID := s.cfg.PayTRMerchantID
	merchantKey := s.cfg.PayTRMerchantKey
	merchantSalt := s.cfg.PayTRMerchantSalt

	// DEV BYPASS — PayTR config yok ise (geliştirme ortamı için)
	// Gerçek ödeme çağrısı atmadan siparişe sahte bir payment_id yaz ve başarılı dön.
	// Müşteri kart bilgisi girmeden de siparişi tamamlayabilsin diye.
	// Prod'da PayTR credentials zorunlu olduğu için bu dal çalışmaz.
	if strings.TrimSpace(merchantID) == "" || strings.TrimSpace(merchantKey) == "" || strings.TrimSpace(merchantSalt) == "" {
		devPaymentID := fmt.Sprintf("DEV-%d", time.Now().Unix())
		err := s.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&order).Update("payment_id", devPaymentID).Error; err != nil {
				return err
			}
			history := models.OrderStatusHistory{
				OrderID:   order.ID,
				OldStatus: order.Status,
				NewStatus: order.Status,
				Note:      "Dev mode ödeme (PayTR config tanımsız — gerçek tahsilat yapılmadı)",
				ChangedBy: "system",
			}
			return tx.Create(&history).Error
		})
		if err != nil {
			return nil, errors.New("dev mode ödeme kaydedilemedi")
		}
		return &PaymentResult{
			Status:      "success",
			PaymentID:   devPaymentID,
			RedirectURL: "",
		}, nil
	}

	// PayTR tutar kurus cinsinden (integer)
	paymentAmount := fmt.Sprintf("%.0f", order.Total*100)

	// Sepet icerigi (basket JSON)
	var basketItems []string
	for _, item := range order.Items {
		itemTotal := fmt.Sprintf("%.0f", item.TotalPrice*100)
		basketItems = append(basketItems, fmt.Sprintf(`["%s","%s",%d]`, item.ProductName, itemTotal, item.Quantity))
	}
	basketJSON := "[" + strings.Join(basketItems, ",") + "]"
	userBasket := base64.StdEncoding.EncodeToString([]byte(basketJSON))

	// Installment
	installment := cardData.Installment
	if installment < 1 {
		installment = 0 // Tek cekim
	}

	// Hash olustur: merchantID + userIP + merchantOid + email + paymentAmount + userBasket + noInstallment + maxInstallment + currency + testMode
	merchantOID := order.OrderNumber
	userIP := "127.0.0.1" // Handler tarafindan set edilebilir
	email := ""
	if order.UserID != nil {
		var user models.User
		if err := s.db.First(&user, *order.UserID).Error; err == nil {
			email = user.Email
		}
	}

	noInstallment := "0"
	maxInstallment := "0"
	if installment == 0 {
		noInstallment = "1"
	} else {
		maxInstallment = fmt.Sprintf("%d", installment)
	}

	currency := "TL"
	testMode := "0"
	if s.cfg.AppEnv == "development" {
		testMode = "1"
	}

	// PayTR HMAC hash: merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode
	hashStr := merchantID + userIP + merchantOID + email + paymentAmount + userBasket + noInstallment + maxInstallment + currency + testMode
	paytrToken := s.generateHash(hashStr, merchantKey, merchantSalt)

	// PayTR API cagrisi
	resp, err := s.client.R().
		SetFormData(map[string]string{
			"merchant_id":    merchantID,
			"user_ip":        userIP,
			"merchant_oid":   merchantOID,
			"email":          email,
			"payment_amount": paymentAmount,
			"paytr_token":    paytrToken,
			"user_basket":    userBasket,
			"debug_on":       testMode,
			"no_installment": noInstallment,
			"max_installment": maxInstallment,
			"user_name":      cardData.CardHolderName,
			"user_phone":     order.ShippingPhone,
			"merchant_ok_url": s.cfg.FrontendURL + "/odeme/basarili",
			"merchant_fail_url": s.cfg.FrontendURL + "/odeme/basarisiz",
			"currency":       currency,
			"test_mode":      testMode,
			"cc_owner":       cardData.CardHolderName,
			"card_number":    cardData.CardNumber,
			"expiry_month":   cardData.ExpMonth,
			"expiry_year":    cardData.ExpYear,
			"cvv":            cardData.CVV,
			"installment_count": fmt.Sprintf("%d", installment),
		}).
		SetResult(map[string]interface{}{}).
		Post("/odeme/api/get-token")

	if err != nil {
		return nil, errors.New("ödeme servisi ile iletişim kurulamadı")
	}

	result, ok := resp.Result().(*map[string]interface{})
	if !ok || result == nil {
		return nil, errors.New("ödeme servisi geçersiz yanıt döndü")
	}

	respMap := *result
	status, _ := respMap["status"].(string)
	if status != "success" {
		reason, _ := respMap["reason"].(string)
		if reason == "" {
			reason = "ödeme başlatılırken bir hata oluştu"
		}
		return nil, errors.New(reason)
	}

	token, _ := respMap["token"].(string)

	return &PaymentResult{
		Status:      "redirect",
		PaymentID:   merchantOID,
		RedirectURL: s.cfg.PayTRBaseURL + "/odeme/guvenli/" + token,
	}, nil
}

// HandleCallback PayTR callback'ini isler, hash dogrular ve siparis durumunu gunceller.
func (s *PaymentService) HandleCallback(data map[string]string) error {
	merchantOID := data["merchant_oid"]
	status := data["status"]
	totalAmount := data["total_amount"]
	hash := data["hash"]

	if merchantOID == "" || status == "" || hash == "" {
		return errors.New("eksik callback parametreleri")
	}

	// Hash dogrulamasi: merchant_oid + merchant_salt + status + total_amount
	hashStr := merchantOID + s.cfg.PayTRMerchantSalt + status + totalAmount
	expectedHash := s.generateHash(hashStr, s.cfg.PayTRMerchantKey, s.cfg.PayTRMerchantSalt)

	if hash != expectedHash {
		return errors.New("geçersiz callback hash değeri")
	}

	var order models.Order
	if err := s.db.Where("order_number = ?", merchantOID).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("sipariş bulunamadı")
		}
		return errors.New("sipariş bilgileri alınırken bir hata oluştu")
	}

	// Idempotency: PayTR retry veya çift-tetiklemeye karşı
	// - PaymentID doluysa başarı zaten işlenmiş
	// - Sipariş cancelled/refunded terminal durumundaysa dokunma
	if order.PaymentID != "" || order.Status == "cancelled" || order.Status == "refunded" {
		return nil
	}

	if status == "success" {
		return s.db.Transaction(func(tx *gorm.DB) error {
			// Status değiştirmiyoruz; sipariş pending kalır, admin kargoya verince
			// 'shipped'e geçer. Sadece PaymentID ve history kaydı ekleriz.
			if err := tx.Model(&order).Update("payment_id", data["payment_id"]).Error; err != nil {
				return errors.New("ödeme bilgisi kaydedilirken bir hata oluştu")
			}

			history := models.OrderStatusHistory{
				OrderID:   order.ID,
				OldStatus: order.Status,
				NewStatus: order.Status,
				Note:      "PayTR ödeme onayı alındı",
				ChangedBy: "system",
			}
			if err := tx.Create(&history).Error; err != nil {
				return errors.New("sipariş durum geçmişi oluşturulurken bir hata oluştu")
			}

			return nil
		})
	}

	// Başarısız ödeme — sipariş pending ise iptal et.
	if order.Status == "pending" {
		return s.db.Transaction(func(tx *gorm.DB) error {
			oldStatus := order.Status
			if err := tx.Model(&order).Update("status", "cancelled").Error; err != nil {
				return errors.New("sipariş durumu güncellenirken bir hata oluştu")
			}
			history := models.OrderStatusHistory{
				OrderID:   order.ID,
				OldStatus: oldStatus,
				NewStatus: "cancelled",
				Note:      "PayTR ödeme başarısız",
				ChangedBy: "system",
			}
			if err := tx.Create(&history).Error; err != nil {
				return errors.New("sipariş durum geçmişi oluşturulurken bir hata oluştu")
			}
			return nil
		})
	}

	return nil
}

// GetInstallments PayTR uzerinden taksit seceneklerini sorgular.
func (s *PaymentService) GetInstallments(binNumber string, amount float64) ([]InstallmentOption, error) {
	if len(binNumber) < 6 {
		return nil, errors.New("BIN numarası en az 6 karakter olmalıdır")
	}
	binNumber = binNumber[:6]

	merchantID := s.cfg.PayTRMerchantID
	merchantKey := s.cfg.PayTRMerchantKey
	merchantSalt := s.cfg.PayTRMerchantSalt

	paymentAmount := fmt.Sprintf("%.0f", amount*100)

	hashStr := merchantID + binNumber + paymentAmount
	paytrToken := s.generateHash(hashStr, merchantKey, merchantSalt)

	resp, err := s.client.R().
		SetFormData(map[string]string{
			"merchant_id":    merchantID,
			"bin_number":     binNumber,
			"payment_amount": paymentAmount,
			"paytr_token":    paytrToken,
		}).
		SetResult(map[string]interface{}{}).
		Post("/odeme/api/installments")

	if err != nil {
		return nil, errors.New("taksit bilgileri alınırken bir hata oluştu")
	}

	result, ok := resp.Result().(*map[string]interface{})
	if !ok || result == nil {
		return nil, errors.New("taksit servisi geçersiz yanıt döndü")
	}

	respMap := *result
	status, _ := respMap["status"].(string)
	if status != "success" {
		return nil, errors.New("taksit bilgileri alınamadı")
	}

	var options []InstallmentOption

	// Tek cekim her zaman mevcut
	options = append(options, InstallmentOption{
		Count:         1,
		TotalAmount:   amount,
		MonthlyAmount: amount,
		InterestRate:  0,
	})

	// PayTR'dan gelen taksit seceneklerini isle
	if installments, ok := respMap["installments"].([]interface{}); ok {
		for _, inst := range installments {
			if instMap, ok := inst.(map[string]interface{}); ok {
				count := int(instMap["installment_count"].(float64))
				total := instMap["total_amount"].(float64) / 100
				rate := instMap["interest_rate"].(float64)

				options = append(options, InstallmentOption{
					Count:         count,
					TotalAmount:   total,
					MonthlyAmount: total / float64(count),
					InterestRate:  rate,
				})
			}
		}
	}

	return options, nil
}

// generateHash PayTR HMAC-SHA256 hash olusturur.
func (s *PaymentService) generateHash(data, key, salt string) string {
	mac := hmac.New(sha256.New, []byte(key+salt))
	mac.Write([]byte(data))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}
