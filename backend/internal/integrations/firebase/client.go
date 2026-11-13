package firebase

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

type Config struct {
	Enabled   bool   `json:"enabled"`
	APIKey    string `json:"apiKey"`
	ProjectID string `json:"projectId"`
	AppID     string `json:"appId"`
	SenderID  string `json:"messagingSenderId"`
	VAPID     string `json:"vapidKey"`
}

func FromEnv() Config {
	return Config{os.Getenv("FIREBASE_ENABLED") == "true", os.Getenv("FIREBASE_WEB_API_KEY"), os.Getenv("FIREBASE_PROJECT_ID"), os.Getenv("FIREBASE_APP_ID"), os.Getenv("FIREBASE_SENDER_ID"), os.Getenv("FIREBASE_VAPID_KEY")}
}
func (c Config) Ready() bool {
	return c.Enabled && c.APIKey != "" && regexp.MustCompile(`^[a-z][a-z0-9-]{4,62}$`).MatchString(c.ProjectID) && c.AppID != "" && c.SenderID != "" && c.VAPID != ""
}

type Message struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Path  string `json:"path"`
}

func (m Message) Validate() error {
	if strings.TrimSpace(m.Title) == "" || len([]rune(m.Title)) > 100 || len([]rune(m.Body)) > 300 {
		return errors.New("Başlık zorunlu (en fazla 100), metin en fazla 300 karakter")
	}
	u, e := url.Parse(m.Path)
	if e != nil || !strings.HasPrefix(m.Path, "/") || strings.HasPrefix(m.Path, "//") || strings.Contains(m.Path, `\`) || u.Host != "" || u.Scheme != "" {
		return errors.New("Bildirim bağlantısı site içi bir yol olmalı")
	}
	return nil
}

type Client struct {
	Config         Config
	CredentialPath string
	AllowNetwork   bool
	HTTP           *http.Client
}

func (c *Client) Send(ctx context.Context, token string, m Message) error {
	if !c.AllowNetwork {
		return errors.New("Firebase ağ erişimi kapalı")
	}
	if !c.Config.Ready() {
		return errors.New("Firebase proje ayarları eksik")
	}
	if e := m.Validate(); e != nil {
		return e
	}
	raw, e := os.ReadFile(c.CredentialPath)
	if e != nil {
		return errors.New("Firebase servis hesabı okunamadı")
	}
	var cred struct {
		ProjectID string `json:"project_id"`
		Email     string `json:"client_email"`
		Key       string `json:"private_key"`
	}
	if json.Unmarshal(raw, &cred) != nil || cred.ProjectID != c.Config.ProjectID || cred.Email == "" {
		return errors.New("Servis hesabı proje ile eşleşmiyor")
	}
	key, e := jwt.ParseRSAPrivateKeyFromPEM([]byte(cred.Key))
	if e != nil {
		return errors.New("Servis hesabı anahtarı geçersiz")
	}
	now := time.Now()
	assertion, e := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{"iss": cred.Email, "scope": "https://www.googleapis.com/auth/firebase.messaging", "aud": "https://oauth2.googleapis.com/token", "iat": now.Unix(), "exp": now.Add(time.Hour).Unix()}).SignedString(key)
	if e != nil {
		return errors.New("Yetkilendirme oluşturulamadı")
	}
	httpClient := c.HTTP
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://oauth2.googleapis.com/token", strings.NewReader(url.Values{"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"}, "assertion": {assertion}}.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, e := httpClient.Do(req)
	if e != nil {
		return errors.New("Firebase yetkilendirmesine erişilemedi")
	}
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	res.Body.Close()
	var auth struct {
		AccessToken string `json:"access_token"`
	}
	if res.StatusCode != 200 || json.Unmarshal(body, &auth) != nil || auth.AccessToken == "" {
		return errors.New("Firebase yetkilendirmesi reddedildi")
	}
	payload, _ := json.Marshal(map[string]any{"message": map[string]any{"token": token, "data": map[string]string{"title": m.Title, "body": m.Body, "path": m.Path}, "webpush": map[string]any{"headers": map[string]string{"TTL": "86400"}}}})
	req, _ = http.NewRequestWithContext(ctx, "POST", "https://fcm.googleapis.com/v1/projects/"+c.Config.ProjectID+"/messages:send", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+auth.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	res, e = httpClient.Do(req)
	if e != nil {
		return errors.New("Firebase gönderimine erişilemedi")
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return errors.New("Firebase bildirimi kabul etmedi; proje ve cihaz kaydını kontrol edin")
	}
	return nil
}
