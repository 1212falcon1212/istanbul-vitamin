package integrations

import (
	"fmt"
	"html"
	"strings"
)

// brandPrimary marka birincil rengi (DermoEczane).
const brandPrimary = "#7c3aed"

// baseLayout tek bir HTML iskeleti uretir. innerHTML body icerigidir.
func baseLayout(title, innerHTML string) string {
	safeTitle := html.EscapeString(title)
	var b strings.Builder
	b.WriteString(`<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>`)
	b.WriteString(safeTitle)
	b.WriteString(`</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:`)
	b.WriteString(brandPrimary)
	b.WriteString(`;padding:24px 32px;text-align:left;">
              <div style="display:inline-block;background:#ffffff;color:`)
	b.WriteString(brandPrimary)
	b.WriteString(`;font-weight:700;font-size:18px;padding:8px 14px;border-radius:8px;letter-spacing:0.3px;">DermoEczane</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-size:15px;line-height:1.6;color:#1f2937;">`)
	b.WriteString(innerHTML)
	b.WriteString(`            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;color:#6b7280;font-size:12px;text-align:center;border-top:1px solid #eeeeee;">
              Bu e-posta size DermoEczane tarafindan otomatik gonderilmistir.<br>
              &copy; DermoEczane
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`)
	return b.String()
}

// button primary renkte buton HTML'i doner.
func button(url, label string) string {
	return fmt.Sprintf(
		`<p style="text-align:center;margin:28px 0;"><a href="%s" style="display:inline-block;background:%s;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">%s</a></p>`,
		html.EscapeString(url), brandPrimary, html.EscapeString(label),
	)
}

// PasswordResetEmail sifre sifirlama e-postasi icin subject + HTML body doner.
func PasswordResetEmail(resetURL string) (string, string) {
	subject := "Sifre Sifirlama — DermoEczane"
	inner := `
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Sifrenizi sifirlayin</h1>
              <p style="margin:0 0 16px;">Hesabiniz icin sifre sifirlama talebi aldik. Asagidaki butona tiklayarak yeni sifrenizi olusturabilirsiniz.</p>` +
		button(resetURL, "Sifremi Sifirla") +
		`<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Bu baglanti 60 dakika boyunca gecerlidir.</p>
              <p style="margin:0;color:#6b7280;font-size:13px;">Eger bu istegi siz yapmadiysaniz, bu e-postayi goz ardi edebilirsiniz.</p>
              <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">Buton calismazsa: ` +
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
	subject := fmt.Sprintf("Aramiza hos geldin, %s!", name)
	inner := fmt.Sprintf(`
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Aramiza hos geldin, %s!</h1>
              <p style="margin:0 0 16px;">DermoEczane ailesine katildigin icin tesekkur ederiz. Artik binlerce urune hizli ve guvenli sekilde ulasabilirsin.</p>
              <p style="margin:0 0 8px;">Senin icin hazirladiklarimiz:</p>
              <ul style="margin:0 0 16px 18px;padding:0;color:#374151;">
                <li>Ozel kampanya ve firsatlar</li>
                <li>Hizli teslimat ve guvenli odeme</li>
                <li>Kisiye ozel urun onerileri</li>
              </ul>`,
		html.EscapeString(name),
	)
	return subject, baseLayout(subject, inner)
}

// VerifyEmail e-posta dogrulama icin subject + HTML body doner.
func VerifyEmail(verifyURL string) (string, string) {
	subject := "E-posta adresini dogrula"
	inner := `
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">E-posta adresini dogrula</h1>
              <p style="margin:0 0 16px;">Hesabini aktiflestirmek icin asagidaki butona tiklayarak e-posta adresini dogrulayabilirsin.</p>` +
		button(verifyURL, "E-postami Dogrula") +
		`<p style="margin:0;color:#6b7280;font-size:13px;">Eger bu hesabi siz olusturmadiysaniz, bu e-postayi goz ardi edebilirsiniz.</p>
              <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">Buton calismazsa: ` +
		html.EscapeString(verifyURL) + `</p>`
	return subject, baseLayout(subject, inner)
}
