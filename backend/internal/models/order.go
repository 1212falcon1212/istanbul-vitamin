package models

import "time"

type Order struct {
	ID                 uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderNumber        string     `gorm:"type:varchar(20);uniqueIndex;not null" json:"order_number"`
	UserID             *uint64    `gorm:"index" json:"user_id"`
	Source             string     `gorm:"type:enum('web','trendyol','hepsiburada');default:'web';index" json:"source"`
	MarketplaceOrderID string     `gorm:"type:varchar(100)" json:"marketplace_order_id,omitempty"`
	Status             string     `gorm:"type:enum('pending','shipped','delivered','cancelled','refunded');default:'pending';index" json:"status"`

	// Prices
	Subtotal       float64 `gorm:"type:decimal(10,2);not null" json:"subtotal"`
	ShippingCost   float64 `gorm:"type:decimal(10,2);default:0" json:"shipping_cost"`
	ShippingMethod string  `gorm:"type:varchar(50);default:'standard'" json:"shipping_method"`
	DiscountAmount float64 `gorm:"type:decimal(10,2);default:0" json:"discount_amount"`
	TaxAmount      float64 `gorm:"type:decimal(10,2);default:0" json:"tax_amount"`
	Total          float64 `gorm:"type:decimal(10,2);not null" json:"total"`

	// Coupon
	CouponCode     string  `gorm:"type:varchar(50)" json:"coupon_code,omitempty"`
	CouponDiscount float64 `gorm:"type:decimal(10,2);default:0" json:"coupon_discount"`

	// Shipping info
	ShippingFirstName  string `gorm:"type:varchar(100)" json:"shipping_first_name"`
	ShippingLastName   string `gorm:"type:varchar(100)" json:"shipping_last_name"`
	ShippingPhone      string `gorm:"type:varchar(20)" json:"shipping_phone"`
	ShippingCity       string `gorm:"type:varchar(100)" json:"shipping_city"`
	ShippingDistrict   string `gorm:"type:varchar(100)" json:"shipping_district"`
	ShippingAddress    string `gorm:"type:text" json:"shipping_address"`
	ShippingPostalCode string `gorm:"type:varchar(10)" json:"shipping_postal_code,omitempty"`

	// Billing info
	BillingFirstName   string `gorm:"type:varchar(100)" json:"billing_first_name"`
	BillingLastName    string `gorm:"type:varchar(100)" json:"billing_last_name"`
	BillingPhone       string `gorm:"type:varchar(20)" json:"billing_phone"`
	BillingCity        string `gorm:"type:varchar(100)" json:"billing_city"`
	BillingDistrict    string `gorm:"type:varchar(100)" json:"billing_district"`
	BillingAddress     string `gorm:"type:text" json:"billing_address"`
	BillingTaxOffice   string `gorm:"type:varchar(150)" json:"billing_tax_office,omitempty"`
	BillingTaxNumber   string `gorm:"type:varchar(20)" json:"billing_tax_number,omitempty"`
	BillingCompanyName string `gorm:"type:varchar(200)" json:"billing_company_name,omitempty"`
	InvoiceType        string `gorm:"type:enum('individual','corporate');default:'individual'" json:"invoice_type"`

	// Cargo
	CargoCompany   string     `gorm:"type:varchar(100)" json:"cargo_company,omitempty"`
	TrackingNumber string     `gorm:"type:varchar(100)" json:"tracking_number,omitempty"`
	ShippedAt      *time.Time `json:"shipped_at,omitempty"`
	DeliveredAt    *time.Time `json:"delivered_at,omitempty"`

	// Payment
	PaymentMethod string `gorm:"type:enum('credit_card','bank_transfer');default:'credit_card'" json:"payment_method"`
	PaymentID     string `gorm:"type:varchar(100)" json:"payment_id,omitempty"`

	// Invoice
	BizimHesapInvoiceID string `gorm:"type:varchar(100)" json:"bizimhesap_invoice_id,omitempty"`
	InvoiceNumber       string `gorm:"type:varchar(50)" json:"invoice_number,omitempty"`
	InvoiceURL          string `gorm:"type:varchar(500)" json:"invoice_url,omitempty"`
	InvoiceRetryCount   int    `gorm:"default:0" json:"invoice_retry_count"`
	LastInvoiceError    string `gorm:"type:varchar(500)" json:"last_invoice_error,omitempty"`

	// Notes
	CustomerNote string `gorm:"type:text" json:"customer_note,omitempty"`
	AdminNote    string `gorm:"type:text" json:"admin_note,omitempty"`

	CreatedAt time.Time `gorm:"index" json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	User          *User              `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Items         []OrderItem        `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	StatusHistory []OrderStatusHistory `gorm:"foreignKey:OrderID" json:"status_history,omitempty"`
}

func (Order) TableName() string {
	return "orders"
}

type OrderItem struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID      uint64    `gorm:"not null;index" json:"order_id"`
	ProductID    *uint64   `json:"product_id"`
	VariantID    *uint64   `json:"variant_id,omitempty"`
	ProductName  string    `gorm:"type:varchar(500);not null" json:"product_name"`
	ProductSKU   string    `gorm:"type:varchar(100)" json:"product_sku,omitempty"`
	ProductImage string    `gorm:"type:varchar(500)" json:"product_image,omitempty"`
	Quantity     int       `gorm:"not null" json:"quantity"`
	UnitPrice    float64   `gorm:"type:decimal(10,2);not null" json:"unit_price"`
	TotalPrice   float64   `gorm:"type:decimal(10,2);not null" json:"total_price"`
	TaxRate      *float64  `gorm:"type:decimal(5,2)" json:"tax_rate,omitempty"`
	CreatedAt    time.Time `json:"created_at"`

	// Relations
	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (OrderItem) TableName() string {
	return "order_items"
}

type OrderStatusHistory struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID   uint64    `gorm:"not null;index" json:"order_id"`
	OldStatus string    `gorm:"type:varchar(20)" json:"old_status"`
	NewStatus string    `gorm:"type:varchar(20);not null" json:"new_status"`
	Note      string    `gorm:"type:text" json:"note,omitempty"`
	ChangedBy string    `gorm:"type:varchar(100)" json:"changed_by"`
	CreatedAt time.Time `json:"created_at"`
}

func (OrderStatusHistory) TableName() string {
	return "order_status_history"
}
