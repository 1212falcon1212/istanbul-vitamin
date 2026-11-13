package integrations

import (
	"fmt"
	"html"
	"strings"
)

// brandPrimary marka birincil rengi (İstanbul Vitamin).
const brandPrimary = "#7c3aed"

// baseLayout tek bir HTML iskeleti uretir. innerHTML body icerigidir.
// Public HTTPS logo already used by the storefront. Never use a localhost asset in email.
const emailLogoURL = "https://istanbulvitamin.com/uploads/2026/04/1776618321883813252-61e5397263e2a0f0.png"

func baseLayout(title, innerHTML string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><title>%s</title>
<style>@media only screen and (max-width:620px){.outer{padding:20px 10px!important}.content{padding:28px 22px!important}.brand{padding:24px 18px!important}.heading{font-size:27px!important}.summary-cell{display:block!important;width:auto!important;padding:16px 20px!important}.mail-logo{width:260px!important;height:auto!important}}</style></head>
<body style="margin:0;padding:0;background:#f5f3f8;color:#1f1b16;font-family:Inter,Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%%">
<div style="display:none;font-size:1px;color:#f5f3f8;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">%s — İstanbul Vitamin</div>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3f8"><tr><td class="outer" align="center" style="padding:40px 16px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e8e2ee;border-radius:16px;overflow:hidden">
<tr><td height="5" style="height:5px;background:#7c3aed;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="brand" align="center" style="padding:30px 32px 24px;background:#ffffff;border-bottom:1px solid #eee9f3"><a href="https://istanbulvitamin.com" style="text-decoration:none"><img class="mail-logo" src="%s" width="300" alt="İstanbul Vitamin" border="0" style="display:block;width:300px;max-width:100%%;height:auto;color:#1f1b16;font-size:20px"></a><p style="margin:10px 0 0;color:#796d86;font-size:12px;line-height:18px;letter-spacing:1px">BAKIMINA İYİ GELEN SEÇİMLER</p></td></tr>
<tr><td class="content" style="padding:36px 36px 32px;font-size:15px;line-height:25px;color:#51465d">%s</td></tr>
<tr><td style="padding:22px 26px;background:#faf8fd;border-top:1px solid #eee9f3;text-align:center"><p style="margin:0 0 7px;font-size:14px;font-weight:bold;color:#362047">Bir sorunuz mu var?</p><a href="mailto:info@istanbulvitamin.com" style="color:#6d28d9;font-size:13px;text-decoration:none">info@istanbulvitamin.com</a></td></tr>
</table>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px"><tr><td align="center" style="padding:24px 20px;color:#8a8093;font-size:11px;line-height:19px"><a href="https://istanbulvitamin.com" style="color:#71627f;text-decoration:none;font-weight:bold">istanbulvitamin.com</a><br>Bu e-posta size İstanbul Vitamin tarafından otomatik gönderilmiştir.<br>&copy; İstanbul Vitamin</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`, html.EscapeString(title), html.EscapeString(title), html.EscapeString(emailLogoURL), innerHTML)
}

func button(url, label string) string {
	return fmt.Sprintf(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr><td align="center" bgcolor="#7c3aed" style="border-radius:8px;mso-padding-alt:15px 26px"><a href="%s" style="display:inline-block;padding:15px 26px;border:1px solid #7c3aed;border-radius:8px;color:#ffffff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:bold;text-decoration:none">%s &nbsp; &#8594;</a></td></tr></table>`, html.EscapeString(url), html.EscapeString(label))
}

// PasswordResetEmail sifre sifirlama e-postasi icin subject + HTML body doner.
func PasswordResetEmail(resetURL string) (string, string) {
	subject := "Şifre Sıfırlama — İstanbul Vitamin"
	inner := `
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Şifrenizi sıfırlayın</h1>
              <p style="margin:0 0 16px;">Hesabınız için şifre sıfırlama talebi aldık. Aşağıdaki butona tıklayarak yeni şifrenizi oluşturabilirsiniz.</p>` +
		button(resetURL, "Şifremi Sıfırla") +
		`<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Bu bağlantı 60 dakika boyunca geçerlidir.</p>
              <p style="margin:0;color:#6b7280;font-size:13px;">Bu isteği siz yapmadıysanız bu e-postayı göz ardı edebilirsiniz.</p>
              <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">Buton çalışmazsa: ` +
		html.EscapeString(resetURL) + `</p>`
	return subject, baseLayout(subject, inner)
}

// OrderConfirmationEmail siparis onay e-postasi icin subject + HTML body doner.
func OrderConfirmationEmail(orderNumber string, total float64) (string, string) {
	subject := fmt.Sprintf("Siparisiniz alindi — #%s", orderNumber)
	inner := fmt.Sprintf(`
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Siparisiniz alindi!</h1>
              <p style="margin:0 0 16px;">Tesekkur ederiz, siparisiniz basariyla olusturuldu.</p>
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin:20px 0;">
                <tr>
                  <td style="padding:16px;">
                    <div style="color:#6b7280;font-size:13px;margin-bottom:4px;">Siparis numarasi</div>
                    <div style="font-weight:700;font-size:18px;color:#111827;margin-bottom:12px;">#%s</div>
                    <div style="color:#6b7280;font-size:13px;margin-bottom:4px;">Toplam tutar</div>
                    <div style="font-weight:700;font-size:18px;color:%s;">%.2f TL</div>
                  </td>
                </tr>
              </table>
              <p style="margin:0;">Siparisinizin durumu hakkinda sizi e-posta ile bilgilendirecegiz. Iyi alisverisler!</p>`,
		html.EscapeString(orderNumber), brandPrimary, total,
	)
	return subject, baseLayout(subject, inner)
}

// WelcomeEmail hos geldin e-postasi icin subject + HTML body doner.
func WelcomeEmail(firstName string) (string, string) {
	name := strings.TrimSpace(firstName)
	if name == "" {
		name = "hos geldin"
	}
	subject := fmt.Sprintf("Aramıza hoş geldin, %s!", name)
	inner := fmt.Sprintf(`
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Aramıza hoş geldin, %s!</h1>
              <p style="margin:0 0 16px;">İstanbul Vitamin ailesine katıldığınız için teşekkür ederiz. Ürünleri keşfedebilir, siparişlerinizi hesabınızdan takip edebilirsiniz.</p>
              <p style="margin:0 0 8px;">Hesabınızdan yapabilecekleriniz:</p>
              <ul style="margin:0 0 16px 18px;padding:0;color:#374151;">
                <li>Güncel kampanyaları inceleme</li>
                <li>Sipariş durumunu takip etme</li>
                <li>Favori ürünlerinizi kaydetme</li>
              </ul>`,
		html.EscapeString(name),
	)
	return subject, baseLayout(subject, inner)
}

// VerifyEmail e-posta dogrulama icin subject + HTML body doner.
func VerifyEmail(verifyURL string) (string, string) {
	subject := "E-posta adresinizi doğrulayın"
	inner := `
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">E-posta adresinizi doğrulayın</h1>
              <p style="margin:0 0 16px;">E-posta adresinizi doğrulamak için aşağıdaki butona tıklayın. Bu bağlantı 24 saat geçerlidir.</p>` +
		button(verifyURL, "E-postamı doğrula") +
		`<p style="margin:0;color:#6b7280;font-size:13px;">Bu hesabı siz oluşturmadıysanız bu e-postayı göz ardı edebilirsiniz.</p>
              <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">Buton çalışmazsa: ` +
		html.EscapeString(verifyURL) + `</p>`
	return subject, baseLayout(subject, inner)
}
