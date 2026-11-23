package bizimhesap

import (
	"testing"

	"github.com/istanbulvitamin/backend/internal/models"
)

func invoiceItem(price, rate float64, quantity int) models.OrderItem {
	return models.OrderItem{UnitPrice: price, Quantity: quantity, TotalPrice: round2(price * float64(quantity)), TaxRate: &rate}
}

func TestInvoiceAmounts(t *testing.T) {
	c := NewClient(Config{})
	tests := []struct {
		name  string
		order models.Order
		tax   float64
	}{
		{"recorded order", models.Order{Items: []models.OrderItem{invoiceItem(387.06, 20, 1)}, Subtotal: 387.06, TaxAmount: 77.41, Total: 464.47}, 77.41},
		{"mixed rates and shipping", models.Order{Items: []models.OrderItem{invoiceItem(50, 10, 2), invoiceItem(30, 0, 1)}, Subtotal: 130, TaxAmount: 10, ShippingCost: 12, Total: 152}, 12},
		{"duplicate coupon fields", models.Order{Items: []models.OrderItem{invoiceItem(100, 20, 1)}, Subtotal: 100, DiscountAmount: 10, CouponDiscount: 10, TaxAmount: 18, Total: 108}, 18},
		{"coupon deducted after VAT", models.Order{Items: []models.OrderItem{invoiceItem(100, 20, 1)}, Subtotal: 100, TaxAmount: 20, CouponDiscount: 12, Total: 108}, 18},
		{"aggregate rounding", models.Order{Items: []models.OrderItem{invoiceItem(.05, 10, 1), invoiceItem(.05, 10, 1)}, Subtotal: .10, TaxAmount: .01, Total: .11}, .01},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p, err := c.BuildPayload(&tt.order)
			if err != nil {
				t.Fatal(err)
			}
			var total, net, tax int64
			for _, l := range p.Details {
				net += cents(l.Net)
				tax += cents(l.Tax)
				total += cents(l.Total)
				if cents(l.Net)+cents(l.Tax) != cents(l.Total) {
					t.Fatal("unbalanced line", l)
				}
			}
			if total != cents(tt.order.Total) || total != cents(p.Amounts.Total) || tax != cents(tt.tax) || tax != cents(p.Amounts.Tax) || net != cents(p.Amounts.Net) {
				t.Fatal(p.Amounts)
			}
		})
	}
}

func TestInvoiceRejectsMismatch(t *testing.T) {
	order := models.Order{Items: []models.OrderItem{invoiceItem(100, 20, 1)}, Subtotal: 100, TaxAmount: 10, Total: 110}
	if _, err := NewClient(Config{}).BuildPayload(&order); err == nil {
		t.Fatal("expected tax mismatch")
	}
	order.TaxAmount = 20
	if _, err := NewClient(Config{}).BuildPayload(&order); err == nil {
		t.Fatal("expected unexplained difference")
	}
}
