package integrations

import (
	"fmt"
	"github.com/istanbulvitamin/backend/internal/models"
	"html"
	"net"
	"net/url"
	"strings"
)

type OrderMail struct {
	Number, Name, Tracking, Company, URL                                              string
	Total                                                                             float64
	Items                                                                             []OrderMailItem
	Subtotal, Shipping, Discount, Tax                                                 float64
	PaymentMethod, PaymentStatus, CardLastFour, Address, Recipient, City, InvoiceType string
}

func EventCopy(kind string) (string, string) {
	switch kind {
	case "order_received":
		return "Siparişiniz alındı", "Siparişinizi aldık. Ödeme durumunu ve siparişinizin güncel aşamasını hesabınızdan takip edebilirsiniz."
	case "payment_confirmed":
		return "Ödemeniz onaylandı", "Siparişinizin ödeme onayı alındı. Hazırlık ve kargo aşamalarında sizi bilgilendireceğiz."
	case "tracking_available":
		return "Kargo takip numaranız hazır", "Kargonuzun takip numarasını sipariş detayında görebilirsiniz."
	case "shipped":
		return "Siparişiniz kargoya verildi", "Kargo bilgilerinizi ve güncel sipariş durumunu hesabınızdan takip edebilirsiniz."
	case "delivered":
		return "Siparişiniz teslim edildi", "Kargo firmasından teslim bilgisi alındı. Bizi tercih ettiğiniz için teşekkür ederiz."
	case "cancelled":
		return "Siparişiniz iptal edildi", "Siparişiniz iptal edildi. Ücret iadesi gerekiyorsa, ödeme kuruluşunun iade onayını ayrıca bildireceğiz."
	case "refunded":
		return "Siparişiniz iade durumuna alındı", "Siparişinizin iade kaydı güncellendi. Bu mesaj ücretin hesabınıza geçtiği anlamına gelmez."
	case "refund_completed":
		return "Ücret iadeniz işleme alındı", "Ödeme kuruluşu ücret iadesini onayladı. Hesabınıza yansıma süresi bankanıza bağlıdır."
	case "return_requested":
		return "İade talebiniz alındı", "İade talebiniz incelemeye alındı. Sonucu ve iade kargosu bilgilerini hesabınızdan takip edebilirsiniz."
	case "return_approved":
		return "İade talebiniz onaylandı", "İade talebiniz onaylandı. İade gönderimi bilgileri için hesabınızdaki talep detayını kontrol edin."
	case "return_rejected":
		return "İade talebiniz sonuçlandı", "İade talebiniz onaylanmadı. Açıklamayı hesabınızdaki talep detayından inceleyebilirsiniz."
	case "return_completed":
		return "İade işleminiz güncellendi", "İade işleminizin durumu güncellendi. Ücret iadesinin durumunu ayrıca takip edebilirsiniz."
	case "cancel_requested":
		return "İptal talebiniz alındı", "İptal talebiniz kaydedildi. İnceleme sonucunu ayrıca bildireceğiz."
	case "cancel_approved":
		return "İptal talebiniz onaylandı", "İptal talebiniz onaylandı ve işleme alındı."
	case "cancel_rejected":
		return "İptal talebiniz sonuçlandı", "İptal talebiniz onaylanmadı. Açıklamayı hesabınızdan inceleyebilirsiniz."
	case "cancel_completed":
		return "İptal işleminiz güncellendi", "İptal işleminiz güncellendi. Ücret iadesi durumunu hesabınızdan takip edebilirsiniz."
	}
	return "", ""
}
func OrderEventEmail(kind string, d OrderMail) (string, string) {
	title, body := EventCopy(kind)
	if title == "" {
		return "", ""
	}
	content := fmt.Sprintf(`<p style="margin:0 0 12px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#7c3aed">SİPARİŞ BİLGİLENDİRMESİ</p><h1 class="heading" style="font-size:30px;line-height:38px;letter-spacing:-0.6px;color:#32164b;margin:0 0 24px;font-weight:700">%s</h1><p style="margin:0 0 12px;color:#32164b">Merhaba %s,</p><p style="margin:0 0 26px">%s</p><table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f6f2fc;border:1px solid #eae0f6;border-radius:10px"><tr><td class="summary-cell" width="55%%" valign="top" style="padding:20px 22px"><span style="font-size:11px;letter-spacing:0.8px;color:#8a729f">SİPARİŞ NUMARASI</span><br><strong style="font-size:16px;color:#3c2154">%s</strong></td><td class="summary-cell" valign="top" style="padding:20px 22px"><span style="font-size:11px;letter-spacing:0.8px;color:#8a729f">SİPARİŞ TUTARI</span><br><strong style="font-size:19px;color:#5b21b6">%s TL</strong></td></tr></table>`, html.EscapeString(title), html.EscapeString(d.Name), html.EscapeString(body), html.EscapeString(d.Number), formatTRY(d.Total))
	if (kind == "shipped" || kind == "tracking_available") && d.Tracking != "" {
		content += fmt.Sprintf(`<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #eee9f3;border-radius:10px"><tr><td style="padding:18px 22px"><span style="font-size:11px;letter-spacing:0.8px;color:#8a729f">KARGO BİLGİLERİ</span><p style="margin:6px 0 0;color:#32164b;font-weight:bold">%s</p><p style="margin:3px 0 0;font-size:13px">Takip numarası: <strong>%s</strong></p></td></tr></table>`, html.EscapeString(d.Company), html.EscapeString(d.Tracking))
	}
	content += orderDetails(d)
	content += button(d.URL, "Siparişimi görüntüle")
	return title + " — #" + d.Number, baseLayout(title, content)
}
func CampaignEmail(title, body, url, unsubscribe string) (string, string) {
	content := fmt.Sprintf(`<p style="margin:0 0 12px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#7c3aed">SİZİN İÇİN SEÇTİK</p><h1 class="heading" style="font-size:32px;line-height:40px;letter-spacing:-0.7px;color:#32164b;margin:0 0 22px">%s</h1><p style="margin:0 0 24px">%s</p>`, html.EscapeString(title), strings.ReplaceAll(html.EscapeString(body), "\n", "<br>")) + button(url, "Kampanyayı incele")
	content += `<p style="font-size:12px">Bu e-postayı bülten aboneliğiniz nedeniyle alıyorsunuz. <a href="` + html.EscapeString(unsubscribe) + `">Abonelikten çık</a></p>`
	return title, baseLayout(title, content)
}

func formatTRY(amount float64) string {
	parts := strings.Split(fmt.Sprintf("%.2f", amount), ".")
	whole := parts[0]
	for i := len(whole) - 3; i > 0; i -= 3 {
		whole = whole[:i] + "." + whole[i:]
	}
	return whole + "," + parts[1]
}

// Order snapshots keep email product names, quantities and prices independent of later catalog edits.
type OrderMailItem struct {
	Name, Image, SKU string
	Quantity         int
	UnitPrice, Total float64
}

func OrderMailFromOrder(o models.Order, siteURL string) OrderMail {
	d := OrderMail{Number: o.OrderNumber, Name: o.ShippingFirstName, Tracking: o.TrackingNumber, Company: o.CargoCompany, URL: strings.TrimRight(siteURL, "/") + fmt.Sprintf("/hesabim/siparisler/%d", o.ID), Total: o.Total, Subtotal: o.Subtotal, Shipping: o.ShippingCost, Discount: o.DiscountAmount + o.CouponDiscount, Tax: o.TaxAmount, PaymentMethod: o.PaymentMethod, PaymentStatus: o.PaymentStatus, CardLastFour: o.PaymentCardLastFour, Address: o.ShippingAddress, Recipient: strings.TrimSpace(o.ShippingFirstName + " " + o.ShippingLastName), City: strings.TrimSpace(o.ShippingDistrict + " / " + o.ShippingCity), InvoiceType: o.InvoiceType}
	for _, item := range o.Items {
		d.Items = append(d.Items, OrderMailItem{Name: item.ProductName, Image: mailImageURL(item.ProductImage, siteURL), SKU: item.ProductSKU, Quantity: item.Quantity, UnitPrice: item.UnitPrice, Total: item.TotalPrice})
	}
	return d
}
func mailImageURL(raw, siteURL string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || raw == "" {
		return ""
	}
	if u.Scheme == "" && u.Host == "" {
		base, err := url.Parse(siteURL)
		if err != nil {
			return ""
		}
		if base.Scheme != "https" || base.Hostname() == "localhost" || net.ParseIP(base.Hostname()) != nil {
			base, _ = url.Parse("https://istanbulvitamin.com")
		}
		u = base.ResolveReference(u)
	}
	if u.Scheme != "https" || u.Hostname() == "" || u.Hostname() == "localhost" || u.User != nil {
		return ""
	}
	if ip := net.ParseIP(u.Hostname()); ip != nil && (ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() || ip.IsLinkLocalUnicast()) {
		return ""
	}
	return u.String()
}
func orderDetails(d OrderMail) string {
	if len(d.Items) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString(`<h2 style="font-size:18px;color:#32164b;margin:28px 0 12px">Siparişinizdeki ürünler</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee9f3;table-layout:fixed">`)
	for _, item := range d.Items {
		image := `<span style="font-size:10px;color:#8a729f">Görsel yok</span>`
		if src := mailImageURL(item.Image, ""); src != "" {
			image = fmt.Sprintf(`<img src="%s" alt="%s" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;border:0">`, html.EscapeString(src), html.EscapeString(item.Name))
		}
		fmt.Fprintf(&b, `<tr><td width="76" valign="top" style="padding:16px 8px 16px 0;border-bottom:1px solid #eee9f3">%s</td><td valign="top" style="padding:16px 0;border-bottom:1px solid #eee9f3;word-break:break-word"><p style="margin:0 0 5px;font-size:14px;font-weight:bold;color:#32164b;line-height:20px">%s</p><p style="margin:0;font-size:12px;color:#796d86">%d adet × %s TL</p><p style="margin:7px 0 0;font-size:14px;font-weight:bold;color:#5b21b6">%s TL</p></td></tr>`, image, html.EscapeString(item.Name), item.Quantity, formatTRY(item.UnitPrice), formatTRY(item.Total))
	}
	b.WriteString(`</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;font-size:13px">`)
	row := func(label, value string) {
		fmt.Fprintf(&b, `<tr><td style="padding:5px 0;color:#796d86">%s</td><td align="right" style="padding:5px 0;color:#32164b">%s</td></tr>`, label, value)
	}
	row("Ara toplam", formatTRY(d.Subtotal)+" TL")
	if d.Discount > 0 {
		row("İndirim", "−"+formatTRY(d.Discount)+" TL")
	}
	if d.Shipping == 0 {
		row("Kargo", "Ücretsiz")
	} else {
		row("Kargo", formatTRY(d.Shipping)+" TL")
	}
	if d.Tax > 0 {
		row("Vergi", formatTRY(d.Tax)+" TL")
	}
	row("<strong>Genel toplam</strong>", "<strong>"+formatTRY(d.Total)+" TL</strong>")
	b.WriteString(`</table>`)
	method := "Kredi / Banka Kartı"
	if d.PaymentMethod == "bank_transfer" {
		method = "Havale / EFT"
	}
	status := map[string]string{"paid": "Ödeme onaylandı", "review": "Dekont alındı, kontrol bekliyor", "test": "Test işlemi — gerçek tahsilat yok"}[d.PaymentStatus]
	if status == "" {
		status = "Ödeme bekleniyor"
	}
	fmt.Fprintf(&b, `<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#faf8fd;border:1px solid #eee9f3;border-radius:10px"><tr><td style="padding:18px 20px"><h2 style="font-size:15px;margin:0 0 8px;color:#32164b">Ödeme bilgileri</h2><p style="margin:0;font-size:13px">%s<br>%s</p>`, method, status)
	if d.PaymentMethod == "credit_card" && len(d.CardLastFour) == 4 {
		fmt.Fprintf(&b, `<p style="margin:6px 0 0;font-size:13px">Kart: •••• %s</p>`, html.EscapeString(d.CardLastFour))
	}
	b.WriteString(`</td></tr>`)
	if d.Address != "" {
		fmt.Fprintf(&b, `<tr><td style="padding:18px 20px;border-top:1px solid #eee9f3"><h2 style="font-size:15px;margin:0 0 8px;color:#32164b">Teslimat adresi</h2><p style="margin:0;font-size:13px;line-height:21px">%s<br>%s<br>%s</p></td></tr>`, html.EscapeString(d.Recipient), strings.ReplaceAll(html.EscapeString(d.Address), "\n", "<br>"), html.EscapeString(d.City))
	}
	b.WriteString(`</table>`)
	return b.String()
}
