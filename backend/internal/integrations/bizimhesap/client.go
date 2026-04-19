package bizimhesap

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
)

const (
	// InvoiceTypeSales satış faturası için kullanılan Bizimhesap kodudur.
	InvoiceTypeSales = 3
	// DefaultBaseURL varsayılan Bizimhesap API kök adresidir.
	DefaultBaseURL = "https://bizimhesap.com/api/b2b"
	// DefaultTimeout HTTP isteği için zaman aşımıdır.
	DefaultTimeout = 20 * time.Second
)

// Config Bizimhesap entegrasyonu için runtime ayarlardır (settings tablosundan gelir).
type Config struct {
	Enabled        bool
	FirmID         string
	BaseURL        string
	DefaultTaxRate float64
}

// Client Bizimhesap addinvoice endpoint'ine istek atan minimal HTTP istemcisidir.
type Client struct {
	cfg  Config
	http *http.Client
}

// NewClient hazır bir Client döndürür. Config.BaseURL boşsa DefaultBaseURL kullanılır.
func NewClient(cfg Config) *Client {
	if strings.TrimSpace(cfg.BaseURL) == "" {
		cfg.BaseURL = DefaultBaseURL
	}
	if cfg.DefaultTaxRate <= 0 {
		cfg.DefaultTaxRate = 20
	}
	return &Client{
		cfg:  cfg,
		http: &http.Client{Timeout: DefaultTimeout},
	}
}

// Config mevcut konfigürasyonu döndürür (test endpoint gibi yerler için).
func (c *Client) Config() Config {
	return c.cfg
}

// --- Payload modelleri -----------------------------------------------------

type invoiceDates struct {
	InvoiceDate  string `json:"invoiceDate"`
	DueDate      string `json:"dueDate"`
	DeliveryDate string `json:"deliveryDate,omitempty"`
}

type invoiceCustomer struct {
	CustomerID string `json:"customerId"`
	Title      string `json:"title"`
	Address    string `json:"address"`
	TaxOffice  string `json:"taxOffice,omitempty"`
	TaxNo      string `json:"taxNo,omitempty"`
	Email      string `json:"email,omitempty"`
	Phone      string `json:"phone,omitempty"`
}

type invoiceDetail struct {
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName"`
	Note        string  `json:"note,omitempty"`
	Barcode     string  `json:"barcode,omitempty"`
	TaxRate     float64 `json:"taxRate"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	GrossPrice  float64 `json:"grossPrice"`
	Discount    string  `json:"discount,omitempty"`
	Net         float64 `json:"net"`
	Tax         float64 `json:"tax"`
	Total       float64 `json:"total"`
}

type invoiceAmounts struct {
	Currency string  `json:"currency"`
	Gross    float64 `json:"gross"`
	Discount float64 `json:"discount"`
	Net      float64 `json:"net"`
	Tax      float64 `json:"tax"`
	Total    float64 `json:"total"`
}

type addInvoicePayload struct {
	FirmID      string          `json:"firmId"`
	InvoiceNo   string          `json:"invoiceNo,omitempty"`
	InvoiceType int             `json:"invoiceType"`
	Note        string          `json:"note,omitempty"`
	Dates       invoiceDates    `json:"dates"`
	Customer    invoiceCustomer `json:"customer"`
	Details     []invoiceDetail `json:"details"`
	Amounts     invoiceAmounts  `json:"amounts"`
}

// Response Bizimhesap addinvoice yanıtıdır. Başarıda GUID ve URL dolar, hatada Error dolar.
type Response struct {
	Error string `json:"error"`
	GUID  string `json:"guid"`
	URL   string `json:"url"`
}

// --- Mapping ---------------------------------------------------------------

// BuildPayload sipariş modelini Bizimhesap addinvoice gövdesine dönüştürür.
// Order.Items ön-yüklenmiş olmalı (services'den gelen full preload).
func (c *Client) BuildPayload(order *models.Order) (addInvoicePayload, error) {
	if order == nil {
		return addInvoicePayload{}, errors.New("sipariş boş")
	}
	if len(order.Items) == 0 {
		return addInvoicePayload{}, errors.New("sipariş kalemleri bulunamadı")
	}

	// Müşteri başlığı: kurumsal faturada firma adı, bireyselde ad-soyad.
	title := strings.TrimSpace(order.BillingCompanyName)
	if order.InvoiceType != "corporate" || title == "" {
		first := firstNonEmpty(order.BillingFirstName, order.ShippingFirstName)
		last := firstNonEmpty(order.BillingLastName, order.ShippingLastName)
		title = strings.TrimSpace(first + " " + last)
	}
	if title == "" {
		title = "Müşteri"
	}

	// Billing adresi boşsa shipping adresini kullan (checkout formu tek adres alıyor).
	billingAddr := firstNonEmpty(order.BillingAddress, order.ShippingAddress)
	billingDistrict := firstNonEmpty(order.BillingDistrict, order.ShippingDistrict)
	billingCity := firstNonEmpty(order.BillingCity, order.ShippingCity)

	addressParts := []string{
		strings.TrimSpace(billingAddr),
		strings.TrimSpace(billingDistrict),
		strings.TrimSpace(billingCity),
	}
	address := strings.Join(filterEmpty(addressParts), ", ")
	if address == "" {
		address = "Adres bilgisi alınamadı"
	}

	// Müşteri kimliği: kullanıcı varsa user_id, yoksa order_id (guest checkout).
	customerID := fmt.Sprintf("order-%d", order.ID)
	if order.UserID != nil {
		customerID = fmt.Sprintf("user-%d", *order.UserID)
	}

	details := make([]invoiceDetail, 0, len(order.Items))
	var sumGross, sumNet, sumTax float64

	for _, it := range order.Items {
		taxRate := c.cfg.DefaultTaxRate
		if it.TaxRate != nil && *it.TaxRate > 0 {
			taxRate = *it.TaxRate
		}
		qty := float64(it.Quantity)
		gross := round2(it.UnitPrice * qty)
		// Bizimhesap KDV dahil fiyat kabul ediyor; bizim unit_price KDV dahil olduğu için
		// net = gross / (1 + taxRate/100), tax = gross - net şeklinde ayrıştırıyoruz.
		net := round2(gross / (1 + taxRate/100))
		tax := round2(gross - net)
		total := round2(net + tax)

		productID := ""
		if it.ProductID != nil {
			productID = fmt.Sprintf("%d", *it.ProductID)
		}

		details = append(details, invoiceDetail{
			ProductID:   productID,
			ProductName: it.ProductName,
			Barcode:     it.ProductSKU,
			TaxRate:     taxRate,
			Quantity:    qty,
			UnitPrice:   round2(it.UnitPrice),
			GrossPrice:  gross,
			Net:         net,
			Tax:         tax,
			Total:       total,
		})

		sumGross += gross
		sumNet += net
		sumTax += tax
	}

	// Kargo ve kupon/indirim sipariş başına tutulduğu için
	// net toplamı mevcut kalemlerden hesaplanır; kargo ayrı bir detay olarak eklenmez
	// (isteyene göre genişletilebilir).
	discount := round2(order.DiscountAmount + order.CouponDiscount)
	amountNet := round2(sumNet - discount)
	if amountNet < 0 {
		amountNet = 0
	}
	amountTax := round2(sumTax)
	amountTotal := round2(amountNet + amountTax + order.ShippingCost)
	amountGross := round2(sumGross + order.ShippingCost)

	invoiceDate := order.CreatedAt
	if invoiceDate.IsZero() {
		invoiceDate = time.Now()
	}
	// Vade 7 gün (geç ödeme için tampon — peşin kabul ediliyor).
	due := invoiceDate.Add(7 * 24 * time.Hour)

	payload := addInvoicePayload{
		FirmID:      c.cfg.FirmID,
		InvoiceNo:   order.OrderNumber,
		InvoiceType: InvoiceTypeSales,
		Note:        strings.TrimSpace(order.CustomerNote),
		Dates: invoiceDates{
			InvoiceDate: invoiceDate.Format(time.RFC3339),
			DueDate:     due.Format(time.RFC3339),
		},
		Customer: invoiceCustomer{
			CustomerID: customerID,
			Title:      title,
			Address:    address,
			TaxOffice:  strings.TrimSpace(order.BillingTaxOffice),
			TaxNo:      strings.TrimSpace(order.BillingTaxNumber),
			Phone:      firstNonEmpty(order.BillingPhone, order.ShippingPhone),
		},
		Details: details,
		Amounts: invoiceAmounts{
			Currency: "TL",
			Gross:    amountGross,
			Discount: discount,
			Net:      amountNet,
			Tax:      amountTax,
			Total:    amountTotal,
		},
	}

	return payload, nil
}

// --- HTTP çağrıları --------------------------------------------------------

// CreateInvoice verilen siparişten addinvoice çağrısı yapar ve Bizimhesap yanıtını döner.
func (c *Client) CreateInvoice(ctx context.Context, order *models.Order) (*Response, error) {
	if !c.cfg.Enabled {
		return nil, errors.New("bizimhesap entegrasyonu kapalı")
	}
	if strings.TrimSpace(c.cfg.FirmID) == "" {
		return nil, errors.New("bizimhesap firmId tanımlı değil")
	}

	payload, err := c.BuildPayload(order)
	if err != nil {
		return nil, err
	}

	return c.postInvoice(ctx, payload)
}

// TestConnection minimal bir payload göndererek firmId geçerliliğini sınar.
// Bizimhesap addinvoice hatalı customer/detay için error döner — hata mesajı
// dönüyorsa bağlantı kurulmuş demektir; firmId geçersizse "firm" içeren bir hata beklenir.
func (c *Client) TestConnection(ctx context.Context) (*Response, error) {
	if strings.TrimSpace(c.cfg.FirmID) == "" {
		return nil, errors.New("firmId boş")
	}

	now := time.Now()
	payload := addInvoicePayload{
		FirmID:      c.cfg.FirmID,
		InvoiceType: InvoiceTypeSales,
		InvoiceNo:   "TEST-" + now.Format("20060102150405"),
		Note:        "Bağlantı testi — kalıcı olmamalıdır",
		Dates: invoiceDates{
			InvoiceDate: now.Format(time.RFC3339),
			DueDate:     now.Add(24 * time.Hour).Format(time.RFC3339),
		},
		Customer: invoiceCustomer{
			CustomerID: "test-customer",
			Title:      "Bağlantı Testi",
			Address:    "Test Adres",
		},
		Details: []invoiceDetail{{
			ProductID:   "test",
			ProductName: "Test Ürün",
			TaxRate:     c.cfg.DefaultTaxRate,
			Quantity:    1,
			UnitPrice:   1,
			GrossPrice:  1,
			Net:         round2(1 / (1 + c.cfg.DefaultTaxRate/100)),
			Tax:         round2(1 - 1/(1+c.cfg.DefaultTaxRate/100)),
			Total:       1,
		}},
		Amounts: invoiceAmounts{
			Currency: "TL",
			Gross:    1,
			Net:      round2(1 / (1 + c.cfg.DefaultTaxRate/100)),
			Tax:      round2(1 - 1/(1+c.cfg.DefaultTaxRate/100)),
			Total:    1,
		},
	}

	return c.postInvoice(ctx, payload)
}

func (c *Client) postInvoice(ctx context.Context, payload addInvoicePayload) (*Response, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("payload serileştirilemedi: %w", err)
	}

	url := strings.TrimRight(c.cfg.BaseURL, "/") + "/addinvoice"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("istek oluşturulamadı: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("bizimhesap çağrısı başarısız: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("yanıt okunamadı: %w", err)
	}

	if resp.StatusCode >= 500 {
		return nil, fmt.Errorf("bizimhesap sunucu hatası (HTTP %d): %s", resp.StatusCode, truncate(string(raw), 200))
	}

	var out Response
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("yanıt ayrıştırılamadı (HTTP %d): %s", resp.StatusCode, truncate(string(raw), 200))
	}
	return &out, nil
}

// --- Helpers ---------------------------------------------------------------

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func filterEmpty(in []string) []string {
	out := in[:0]
	for _, s := range in {
		if strings.TrimSpace(s) != "" {
			out = append(out, s)
		}
	}
	return out
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
