package integrations

import (
	"fmt"
	"html"
	"strings"
)

type OrderMail struct {
	Number, Name, Tracking, Company, URL string
	Total                                float64
}

func EventCopy(kind string) (string, string) {
	switch kind {
	case "order_received":
		return "Siparişiniz alındı", "Siparişinizi aldık. Ödeme durumunu ve siparişinizin güncel aşamasını hesabınızdan takip edebilirsiniz."
	case "payment_confirmed":
		return "Ödemeniz onaylandı", "Siparişinizin ödeme onayı alındı. Hazırlık ve kargo aşamalarında sizi bilgilendireceğiz."
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
	if kind == "shipped" && d.Tracking != "" {
		content += fmt.Sprintf(`<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #eee9f3;border-radius:10px"><tr><td style="padding:18px 22px"><span style="font-size:11px;letter-spacing:0.8px;color:#8a729f">KARGO BİLGİLERİ</span><p style="margin:6px 0 0;color:#32164b;font-weight:bold">%s</p><p style="margin:3px 0 0;font-size:13px">Takip numarası: <strong>%s</strong></p></td></tr></table>`, html.EscapeString(d.Company), html.EscapeString(d.Tracking))
	}
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
