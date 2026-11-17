package main

import (
	"crypto/tls"
	"fmt"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/integrations"
	"github.com/joho/godotenv"
	"net"
	"net/smtp"
	"os"
	"time"
)

func main() {
	e, err := godotenv.Read(".env")
	if err != nil {
		fmt.Println("Env okunamadı")
		os.Exit(1)
	}
	if e["DB_HOST"] != "127.0.0.1" || e["DB_PORT"] != "33079" || e["DB_NAME"] != "istanbul_vitamin_local" {
		fmt.Println("Yerel ortam gerekli")
		os.Exit(1)
	}
	if e["SMTP_PASSWORD"] == "" {
		fmt.Println("SMTP_PASSWORD boş")
		os.Exit(1)
	}
	host := e["SMTP_HOST"]
	if host != "smtp.hostinger.com" || e["SMTP_PORT"] != "465" {
		fmt.Println("Beklenmeyen SMTP yapılandırması")
		os.Exit(1)
	}
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 15 * time.Second}, "tcp", host+":465", &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12})
	if err != nil {
		fmt.Println("SMTP TLS bağlantısı başarısız:", err)
		os.Exit(1)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(20 * time.Second))
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		fmt.Println("SMTP oturumu kurulamadı")
		os.Exit(1)
	}
	defer client.Close()
	if err = client.Auth(smtp.PlainAuth("", e["SMTP_USER"], e["SMTP_PASSWORD"], host)); err != nil {
		fmt.Println("SMTP kimlik doğrulaması başarısız:", err)
		os.Exit(1)
	}
	client.Quit()
	if len(os.Args) == 3 && os.Args[1] == "--send-test" {
		recipient := os.Args[2]
		mailer := integrations.NewMailer(&config.Config{SMTPHost: host, SMTPPort: e["SMTP_PORT"], SMTPUser: e["SMTP_USER"], SMTPPassword: e["SMTP_PASSWORD"], SMTPFrom: e["SMTP_FROM"]})
		body := `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#252525"><h1 style="color:#6d28d9">İstanbul Vitamin</h1><h2>E-posta gönderim testi</h2><p>Merhaba Şahin,</p><p>Bu e-posta, talebin üzerine İstanbul Vitamin sitesinin e-posta bağlantısını kontrol etmek için gönderildi.</p><p>Bu bir test mesajıdır; herhangi bir sipariş veya ödeme işlemi oluşturulmamıştır.</p><p>İstanbul Vitamin<br>destek@istanbulvitamin.com</p></div>`
		if err := mailer.Send(recipient, "İstanbul Vitamin — E-posta gönderim testi", body); err != nil {
			fmt.Println("Test gönderimi başarısız")
			os.Exit(1)
		}
		fmt.Println("PASS: Tek test e-postası SMTP sunucusu tarafından kabul edildi.")
	} else {
		fmt.Println("PASS: SMTP kimlik doğrulaması başarılı. E-posta gönderilmedi.")
	}

}
