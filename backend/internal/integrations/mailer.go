package integrations

import (
	"log"
	"strconv"
	"strings"

	"github.com/istanbulvitamin/backend/internal/config"
	"gopkg.in/gomail.v2"
)

// Mailer SMTP uzerinden e-posta gonderimi icin kullanilir.
// cfg.SMTPHost bos oldugunda dev fallback olarak konsola log yazar.
type Mailer struct {
	cfg *config.Config
}

// NewMailer yeni bir Mailer orneği olusturur.
func NewMailer(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

// Send belirtilen alıcıya HTML e-posta gonderir.
// SMTPHost bos ise konsola yazar (dev fallback) ve nil doner.
func (m *Mailer) Send(to, subject, htmlBody string) error {
	if m == nil || m.cfg == nil || strings.TrimSpace(m.cfg.SMTPHost) == "" {
		// Dev fallback: SMTP konfigurasyonu yok → konsola yaz
		log.Printf("[mailer:dev] to=%s subject=%q (SMTP_HOST bos, konsola yazildi)", to, subject)
		return nil
	}

	port, err := strconv.Atoi(strings.TrimSpace(m.cfg.SMTPPort))
	if err != nil || port <= 0 {
		port = 587
	}

	from := strings.TrimSpace(m.cfg.SMTPFrom)
	if from == "" {
		from = m.cfg.SMTPUser
	}

	msg := gomail.NewMessage()
	msg.SetHeader("From", from)
	msg.SetHeader("To", to)
	msg.SetHeader("Subject", subject)
	msg.SetBody("text/html", htmlBody)

	dialer := gomail.NewDialer(m.cfg.SMTPHost, port, m.cfg.SMTPUser, m.cfg.SMTPPassword)
	// PlainAuth gomail tarafinda otomatik kullanilir; STARTTLS 587 icin default.

	if err := dialer.DialAndSend(msg); err != nil {
		log.Printf("[mailer:error] to=%s subject=%q err=%v", to, subject, err)
		return err
	}
	log.Printf("[mailer:sent] to=%s subject=%q", to, subject)
	return nil
}

// SendAsync arkaplanda e-posta gonderir. Hatalar log'lanir, panic recover edilir.
func (m *Mailer) SendAsync(to, subject, htmlBody string) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[mailer:panic] to=%s subject=%q recovered=%v", to, subject, r)
			}
		}()
		if err := m.Send(to, subject, htmlBody); err != nil {
			log.Printf("[mailer:async-error] to=%s subject=%q err=%v", to, subject, err)
		}
	}()
}
