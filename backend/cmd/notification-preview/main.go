// Generates local, clearly fictional previews; never sends mail.
package main

import (
	"fmt"
	"github.com/istanbulvitamin/backend/internal/integrations"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	dir := "../output/notification-templates"
	if len(os.Args) > 1 {
		dir = os.Args[1]
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
	}
	var links strings.Builder
	write := func(name, title, body string) {
		if err := os.WriteFile(filepath.Join(dir, name+".html"), []byte(body), 0644); err != nil {
			panic(err)
		}
		fmt.Fprintf(&links, `<li><a href="%s.html">%s</a></li>`, name, title)
	}
	for _, kind := range []string{"order_received", "payment_confirmed", "shipped", "delivered", "cancelled", "refunded", "refund_completed", "return_requested", "return_approved", "return_rejected", "return_completed", "cancel_requested", "cancel_approved", "cancel_rejected", "cancel_completed"} {
		title, body := integrations.OrderEventEmail(kind, integrations.OrderMail{Number: "ÖRNEK-1001", Name: "Örnek Müşteri", Total: 1234.50, Company: "Örnek Kargo", Tracking: "ÖRNEK-TAKİP", URL: "http://localhost:3000/hesabim/siparisler"})
		write(kind, title, body)
	}
	title, body := integrations.CampaignEmail("Bakım rutinine iyi gelen seçimler", "Sevdiğiniz markaları ve güncel kampanyaları keşfedin. Bu bir şablon önizlemesidir.", "http://localhost:3000/magaza", "http://localhost:3000/bulten-iptal?token=ornek")
	write("campaign", title, body)
	title, body = integrations.WelcomeEmail("Örnek Müşteri")
	write("welcome", title, body)
	title, body = integrations.VerifyEmail("http://localhost:3000/e-posta-dogrula?token=ornek")
	write("verification", title, body)
	title, body = integrations.PasswordResetEmail("http://localhost:3000/sifremi-sifirla?token=ornek")
	write("password-reset", title, body)
	os.WriteFile(filepath.Join(dir, "index.html"), []byte(`<!doctype html><meta charset="utf-8"><title>İstanbul Vitamin e-posta şablonları</title><style>body{font:16px system-ui;max-width:800px;margin:40px auto;padding:20px}li{margin:12px}a{color:#7c3aed}</style><h1>E-posta şablonları</h1><p>Önizleme — örnek bilgiler. E-posta gönderilmez.</p><ul>`+links.String()+`</ul>`), 0644)
	fmt.Println("19 previews generated:", dir)
}
