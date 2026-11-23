package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"gorm.io/gorm/clause"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

type CardPaymentData struct {
	UserIP   string
	LastFour string
}

type PaymentResult struct {
	Status string            `json:"status"`
	Fields map[string]string `json:"fields,omitempty"`
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

// payTRCredentials reads the current admin settings for every operation.
func (s *PaymentService) payTRCredentials() (id, key, salt string, err error) {
	var rows []models.Setting
	if err = s.db.Select("key", "value").Where("`key` IN ?", []string{
		"paytr.merchant_id", "paytr.merchant_key", "paytr.merchant_salt",
	}).Find(&rows).Error; err != nil {
		return "", "", "", errors.New("PayTR ayarları okunamadı")
	}
	id, key, salt = s.cfg.PayTRMerchantID, s.cfg.PayTRMerchantKey, s.cfg.PayTRMerchantSalt
	for _, row := range rows {
		switch row.Key {
		case "paytr.merchant_id":
			id = strings.TrimSpace(row.Value)
		case "paytr.merchant_key":
			key = strings.TrimSpace(row.Value)
		case "paytr.merchant_salt":
			salt = strings.TrimSpace(row.Value)
		}
	}
	return id, key, salt, nil
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

	if order.PaymentMethod != "credit_card" {
		return nil, errors.New("bu sipariş için kart ödemesi kullanılamaz")
	}

	if order.Status != "pending" || order.PaymentStatus == "paid" || order.PaymentStatus == "test" {
		return nil, errors.New("bu sipariş için ödeme yapılamaz")
	}

	merchantID, merchantKey, merchantSalt, err := s.payTRCredentials()
	if err != nil {
		return nil, err
	}

	// DEV BYPASS — PayTR config yok ise (geliştirme ortamı için)
	// Gerçek ödeme çağrısı atmadan siparişe sahte bir payment_id yaz ve başarılı dön.
	// Müşteri kart bilgisi girmeden de siparişi tamamlayabilsin diye.
	// Prod'da PayTR credentials zorunlu olduğu için bu dal çalışmaz.
	if strings.TrimSpace(merchantID) == "" || strings.TrimSpace(merchantKey) == "" || strings.TrimSpace(merchantSalt) == "" {
		if s.cfg.AppEnv == "production" || os.Getenv("PAYMENT_MOCK_ENABLED") != "true" {
			return nil, errors.New("ödeme sağlayıcısı yapılandırılmamış")
		}
		devPaymentID := fmt.Sprintf("DEV-%d", time.Now().Unix())
		err := s.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&order).Updates(map[string]interface{}{"payment_id": devPaymentID, "payment_status": "test"}).Error; err != nil {
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
		return &PaymentResult{Status: "success"}, nil
	}

	if len(cardData.LastFour) != 4 || strings.Trim(cardData.LastFour, "0123456789") != "" {
		return nil, errors.New("kartın son dört hanesi gereklidir")
	}
	var user models.User
	if order.UserID == nil || s.db.Select("email").First(&user, *order.UserID).Error != nil || user.Email == "" {
		return nil, errors.New("ödeme için müşteri e-postası gereklidir")
	}
	var settings []models.Setting
	if err := s.db.Where("`key` = ?", "paytr.test_mode").Find(&settings).Error; err != nil {
		return nil, errors.New("PayTR test modu okunamadı")
	}
	test := s.cfg.AppEnv != "production" || (len(settings) > 0 && settings[0].Value == "true")
	fields, err := directFields(order, user.Email, cardData.UserIP, s.cfg.FrontendURL, merchantID, merchantKey, merchantSalt, test)
	if err != nil {
		return nil, err
	}
	if err := s.db.Model(&order).Update("payment_card_last_four", cardData.LastFour).Error; err != nil {
		return nil, err
	}
	return &PaymentResult{Status: "direct", Fields: fields}, nil
}

func directFields(order models.Order, email, ip, frontend, id, key, salt string, test bool) (map[string]string, error) {
	basket := make([][3]any, 0, len(order.Items))
	for _, item := range order.Items {
		basket = append(basket, [3]any{item.ProductName, fmt.Sprintf("%.2f", item.UnitPrice), item.Quantity})
	}
	raw, err := json.Marshal(basket)
	if err != nil {
		return nil, err
	}
	mode, prefix := "0", "IVP"
	if test {
		mode, prefix = "1", "IVT"
	}
	oid := prefix + strconv.FormatUint(order.ID, 10)
	amount := fmt.Sprintf("%.2f", order.Total)
	hash := id + ip + oid + email + amount + "card" + "0" + "TL" + mode + "0"
	signature := generateHash(hash, key, salt)
	return map[string]string{
		"merchant_id": id, "user_ip": ip, "merchant_oid": oid, "email": email,
		"payment_amount": amount, "payment_type": "card", "installment_count": "0", "currency": "TL",
		"non_3d": "0", "test_mode": mode, "paytr_token": signature, "client_lang": "tr",
		"user_name":  strings.TrimSpace(order.ShippingFirstName + " " + order.ShippingLastName),
		"user_phone": order.ShippingPhone, "user_address": order.ShippingAddress, "user_basket": string(raw),
		"merchant_ok_url":   strings.TrimRight(frontend, "/") + "/odeme/basarili?order=" + url.QueryEscape(order.OrderNumber),
		"merchant_fail_url": strings.TrimRight(frontend, "/") + "/odeme/basarisiz",
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
	id, key, salt, err := s.payTRCredentials()
	if err != nil {
		return err
	}
	if id == "" || key == "" || salt == "" {
		return errors.New("PayTR bilgileri eksik")
	}
	hashStr := merchantOID + salt + status + totalAmount
	expectedHash := generateHash(hashStr, key, "")

	if !hmac.Equal([]byte(hash), []byte(expectedHash)) {
		return errors.New("geçersiz callback hash değeri")
	}

	if status != "success" && status != "failed" {
		return errors.New("geçersiz ödeme durumu")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		q := tx.Clauses(clause.Locking{Strength: "UPDATE"})
		direct := strings.HasPrefix(merchantOID, "IVP") || strings.HasPrefix(merchantOID, "IVT")
		if direct {
			n, err := strconv.ParseUint(merchantOID[3:], 10, 64)
			if err != nil || n == 0 {
				return errors.New("geçersiz ödeme numarası")
			}
			q = q.Where("id = ?", n)
		} else {
			q = q.Where("order_number = ?", merchantOID)
		}
		if err := q.First(&order).Error; err != nil {
			return err
		}
		if order.PaymentMethod != "credit_card" {
			return errors.New("geçersiz ödeme yöntemi")
		}
		if order.PaymentStatus == "paid" || order.PaymentStatus == "test" || order.PaymentStatus == "failed" {
			return nil
		}
		if order.Status == "cancelled" || order.Status == "refunded" {
			if status == "success" {
				return errors.New("iptal edilmiş sipariş için ödeme bildirimi")
			}
			return nil
		}
		if status == "failed" {
			if err := NewOrderService(tx).cancelPending(order.ID, "PayTR ödeme başarısız", "system:paytr"); err != nil {
				return err
			}
			return tx.Model(&order).Update("payment_status", "failed").Error
		}
		expected := fmt.Sprintf("%.0f", order.Total*100)
		if totalAmount != expected {
			return errors.New("ödeme tutarı siparişle eşleşmiyor")
		}
		paymentStatus, note := "paid", "PayTR ödeme onayı alındı"
		updates := map[string]any{"payment_id": merchantOID, "payment_confirmed_at": time.Now()}
		if strings.HasPrefix(merchantOID, "IVT") || data["test_mode"] == "1" {
			paymentStatus, note = "test", "PayTR test ödemesi onaylandı"
			delete(updates, "payment_id")
			delete(updates, "payment_confirmed_at")
		}
		updates["payment_status"] = paymentStatus
		if err := tx.Model(&order).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.OrderStatusHistory{OrderID: order.ID, OldStatus: order.Status, NewStatus: order.Status, Note: note, ChangedBy: "system:paytr"}).Error; err != nil {
			return err
		}
		if paymentStatus == "paid" {
			return models.QueueNotification(tx, fmt.Sprintf("order:%d:payment_confirmed", order.ID), "payment_confirmed", order.ID, 0)
		}
		return nil
	})
}

// GetInstallments PayTR uzerinden taksit seceneklerini sorgular.
func (s *PaymentService) GetInstallments(binNumber string, amount float64) ([]InstallmentOption, error) {
	if len(binNumber) < 6 {
		return nil, errors.New("BIN numarası en az 6 karakter olmalıdır")
	}
	binNumber = binNumber[:6]

	merchantID, merchantKey, merchantSalt, err := s.payTRCredentials()
	if err != nil {
		return nil, err
	}

	paymentAmount := fmt.Sprintf("%.0f", amount*100)

	hashStr := merchantID + binNumber + paymentAmount
	paytrToken := generateHash(hashStr, merchantKey, merchantSalt)

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

// RefundResult PayTR iade çağrısı sonucu.
type RefundResult struct {
	Status      string  `json:"status"`
	ReferenceNo string  `json:"reference_no"`
	Amount      float64 `json:"amount"`
	Message     string  `json:"message,omitempty"`
}

// RefundPayment PayTR /odeme/iade endpoint'ini çağırır.
// referenceNo iadeyi iz sürebilmek için bizim ürettiğimiz benzersiz string (örn cancellation.id).
// PayTR config tanımsızsa dev mode: sahte refund_id döner ve gerçek tahsilat iadesi yapılmaz.
func (s *PaymentService) RefundPayment(orderID uint64, amount float64, referenceNo string) (*RefundResult, error) {
	if amount <= 0 {
		return nil, errors.New("iade tutarı sıfırdan büyük olmalı")
	}
	var order models.Order
	if err := s.db.First(&order, orderID).Error; err != nil {
		return nil, errors.New("sipariş bulunamadı")
	}

	merchantID, merchantKey, merchantSalt, err := s.payTRCredentials()
	if err != nil {
		return nil, err
	}

	if s.cfg.AppEnv == "production" && (merchantID == "" || merchantKey == "" || merchantSalt == "") {
		return nil, errors.New("PayTR bilgileri eksik")
	}
	// Dev mode — PayTR creds yoksa veya order DEV-payment_id ile geldiyse fake refund.
	if strings.TrimSpace(merchantID) == "" || strings.HasPrefix(order.PaymentID, "DEV-") {
		fakeID := fmt.Sprintf("DEV-REFUND-%d-%d", orderID, time.Now().Unix())
		return &RefundResult{
			Status:      "success",
			ReferenceNo: fakeID,
			Amount:      amount,
			Message:     "Dev mode iade (gerçek tahsilat iade edilmedi)",
		}, nil
	}

	merchantOID := order.OrderNumber
	if strings.HasPrefix(order.PaymentID, "IVP") {
		merchantOID = order.PaymentID
	}
	returnAmount := fmt.Sprintf("%.2f", amount)

	// Hash: merchant_id + merchant_oid + return_amount + merchant_salt
	hashStr := merchantID + merchantOID + returnAmount
	token := generateHash(hashStr, merchantKey, merchantSalt)

	resp, err := s.client.R().
		SetFormData(map[string]string{
			"merchant_id":   merchantID,
			"merchant_oid":  merchantOID,
			"return_amount": returnAmount,
			"reference_no":  referenceNo,
			"paytr_token":   token,
		}).
		SetResult(map[string]interface{}{}).
		Post("/odeme/iade")
	if err != nil {
		return nil, errors.New("iade servisi ile iletişim kurulamadı")
	}
	result, ok := resp.Result().(*map[string]interface{})
	if !ok || result == nil {
		return nil, errors.New("iade servisi geçersiz yanıt döndü")
	}
	respMap := *result
	status, _ := respMap["status"].(string)
	if status != "success" {
		errMsg, _ := respMap["err_msg"].(string)
		if errMsg == "" {
			errMsg = "iade başarısız"
		}
		return &RefundResult{Status: "error", Message: errMsg}, errors.New(errMsg)
	}
	return &RefundResult{
		Status:      "success",
		ReferenceNo: referenceNo,
		Amount:      amount,
	}, nil
}

// generateHash PayTR HMAC-SHA256 hash olusturur.
func generateHash(data, key, salt string) string {
	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte(data + salt))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}
