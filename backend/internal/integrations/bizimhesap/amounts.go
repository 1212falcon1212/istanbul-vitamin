package bizimhesap

import (
	"errors"
	"fmt"
	"math"
	"strconv"

	"github.com/istanbulvitamin/backend/internal/models"
)

func cents(amount float64) int64 { return int64(math.Round(amount * 100)) }
func lira(amount int64) float64  { return float64(amount) / 100 }

// Order item prices exclude VAT. Allocate discounts and VAT in kuruş so that
// both the detail sums and the invoice footer reproduce the stored order.
func (c *Client) invoiceLines(o *models.Order) ([]invoiceDetail, invoiceAmounts, error) {
	var subtotal, fullTaxUnits int64
	lines := make([]invoiceDetail, 0, len(o.Items)+1)
	for _, item := range o.Items {
		rate := c.cfg.DefaultTaxRate
		if item.TaxRate != nil {
			rate = *item.TaxRate
		}
		gross := cents(item.UnitPrice) * int64(item.Quantity)
		if item.Quantity <= 0 || item.UnitPrice < 0 || rate < 0 || rate > 100 || gross != cents(item.TotalPrice) {
			return nil, invoiceAmounts{}, errors.New("sipariş kaleminin miktar, fiyat veya KDV bilgileri tutarsız")
		}
		id := ""
		if item.ProductID != nil {
			id = strconv.FormatUint(*item.ProductID, 10)
		}
		lines = append(lines, invoiceDetail{ProductID: id, ProductName: item.ProductName, Barcode: item.ProductSKU,
			Quantity: float64(item.Quantity), UnitPrice: item.UnitPrice, GrossPrice: lira(gross), TaxRate: rate})
		subtotal += gross
		fullTaxUnits += gross * cents(rate)
	}
	if subtotal != cents(o.Subtotal) {
		return nil, invoiceAmounts{}, errors.New("ürün satırları sipariş ara toplamıyla eşleşmiyor")
	}

	// Historical orders can store the same coupon in both discount fields.
	// Use the deduction actually reflected in the order, cross-checked against
	// the recorded discounts. Never use an unexplained difference as a discount.
	shipping := cents(o.ShippingCost)
	discount := subtotal + cents(o.TaxAmount) + shipping - cents(o.Total)
	promotion, coupon := cents(o.DiscountAmount), cents(o.CouponDiscount)
	if discount < 0 || discount > subtotal+cents(o.TaxAmount) || shipping < 0 ||
		(discount != promotion+coupon && !(promotion == coupon && discount == coupon)) {
		return nil, invoiceAmounts{}, errors.New("sipariş toplamı, kayıtlı indirim ve KDV ile eşleşmiyor")
	}

	// Checkout can deduct a coupon after computing VAT. In that case its face
	// value is a tax-inclusive reduction. Split each reduced selling amount at
	// the item's original rate; do not deduct the full coupon from net as well.
	fullVAT := (fullTaxUnits + 5000) / 10000
	inclusiveDiscount := discount > 0 && fullVAT == cents(o.TaxAmount)
	base := subtotal
	if inclusiveDiscount {
		base += fullVAT
	}
	if discount > base {
		return nil, invoiceAmounts{}, errors.New("indirim ürün tutarını aşıyor")
	}
	var weight, allocatedDiscount, taxUnits, allocatedTax, netDiscount, lineTax int64
	for i := range lines {
		line := &lines[i]
		gross, rate := cents(line.GrossPrice), cents(line.TaxRate)
		weight += gross
		var beforeTax int64
		if inclusiveDiscount {
			taxUnits += gross * rate
			nextTax := (taxUnits + 5000) / 10000
			beforeTax = nextTax - allocatedTax
			allocatedTax = nextTax
			weight += beforeTax
		}
		nextDiscount := int64(0)
		if discount > 0 {
			nextDiscount = int64(math.Round(float64(discount) * float64(weight) / float64(base)))
		}
		share := nextDiscount - allocatedDiscount
		allocatedDiscount = nextDiscount
		net := gross - share
		var tax int64
		if inclusiveDiscount {
			final := gross + beforeTax - share
			// Split the discount itself so a line with no allocated discount
			// retains its original tax and net even at a rounding boundary.
			net = gross - int64(math.Round(float64(share)*10000/float64(10000+rate)))
			if net > final {
				net = final
			}
			tax = final - net
		} else {
			taxUnits += net * rate
			nextTax := (taxUnits + 5000) / 10000
			tax = nextTax - allocatedTax
			allocatedTax = nextTax
		}
		lineTax += tax
		netDiscount += gross - net
		line.Tax, line.Net, line.Total = lira(tax), lira(net), lira(net+tax)
		if net < gross {
			line.Discount = fmt.Sprintf("%.2f", lira(gross-net))
		}
	}
	if allocatedTax != cents(o.TaxAmount) {
		return nil, invoiceAmounts{}, fmt.Errorf("hesaplanan ürün KDV'si %.2f TL, siparişteki KDV %.2f TL; fatura gönderilmedi", lira(allocatedTax), o.TaxAmount)
	}

	// ShippingCost is the final shipping charge. Use the integration's default
	// service VAT rate to split it without adding a second charge to the order.
	grossTotal := subtotal
	invoiceTax := lineTax
	if shipping > 0 {
		net := int64(math.Round(float64(shipping) / (1 + c.cfg.DefaultTaxRate/100)))
		lines = append(lines, invoiceDetail{ProductID: "shipping", ProductName: "Kargo bedeli",
			Quantity: 1, UnitPrice: lira(net), GrossPrice: lira(net), TaxRate: c.cfg.DefaultTaxRate,
			Net: lira(net), Tax: lira(shipping - net), Total: lira(shipping)})
		grossTotal += net
		invoiceTax += shipping - net
	}
	netTotal := grossTotal - netDiscount
	total := netTotal + invoiceTax
	if total != cents(o.Total) {
		return nil, invoiceAmounts{}, errors.New("fatura toplamı sipariş toplamıyla eşleşmiyor")
	}
	return lines, invoiceAmounts{Currency: "TL", Gross: lira(grossTotal), Discount: lira(netDiscount),
		Net: lira(netTotal), Tax: lira(invoiceTax), Total: lira(total)}, nil
}
