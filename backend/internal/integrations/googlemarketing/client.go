// Package googlemarketing implements read-only GA4 Data and Google Ads reports.
package googlemarketing

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"time"
)

type Config struct {
	Enabled         bool   `json:"enabled"`
	MeasurementID   string `json:"measurement_id"`
	AdsID           string `json:"ads_id"`
	ConversionLabel string `json:"conversion_label"`
	PropertyID      string `json:"property_id"`
	CustomerID      string `json:"customer_id"`
	LoginCustomerID string `json:"login_customer_id"`
	ClientID        string `json:"client_id"`
	ClientSecret    string `json:"client_secret,omitempty"`
	RefreshToken    string `json:"refresh_token,omitempty"`
	DeveloperToken  string `json:"developer_token,omitempty"`
}

func (c Config) Validate() error {
	for _, f := range []struct{ value, pattern string }{{c.MeasurementID, `^G-[A-Z0-9]+$`}, {c.AdsID, `^AW-[0-9]+$`}, {c.PropertyID, `^[0-9]+$`}, {c.CustomerID, `^[0-9]{10}$`}, {c.LoginCustomerID, `^[0-9]{10}$`}, {c.ConversionLabel, `^[A-Za-z0-9_-]+$`}} {
		if f.value != "" && !regexp.MustCompile(f.pattern).MatchString(f.value) {
			return errors.New("Google kimlik biçimi geçersiz")
		}
	}
	if c.Enabled && c.MeasurementID == "" && c.AdsID == "" {
		return errors.New("Takip için GA4 veya Ads kimliği gerekli")
	}
	return nil
}
func (c Config) Missing(provider string) []string {
	fields := map[string]string{"client_id": c.ClientID, "client_secret": c.ClientSecret, "refresh_token": c.RefreshToken}
	if provider == "analytics" {
		fields["property_id"] = c.PropertyID
	} else {
		fields["customer_id"] = c.CustomerID
		fields["developer_token"] = c.DeveloperToken
	}
	missing := []string{}
	for _, key := range []string{"client_id", "client_secret", "refresh_token", "property_id", "customer_id", "developer_token"} {
		if value, ok := fields[key]; ok && value == "" {
			missing = append(missing, key)
		}
	}
	return missing
}

type Client struct{ HTTP *http.Client }

func NewClient() *Client { return &Client{HTTP: &http.Client{Timeout: 15 * time.Second}} }
func (c *Client) Report(ctx context.Context, cfg Config, provider string) (json.RawMessage, error) {
	if provider != "analytics" && provider != "ads" {
		return nil, errors.New("Geçersiz sağlayıcı")
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	if len(cfg.Missing(provider)) > 0 {
		return nil, errors.New("Google API yapılandırması eksik")
	}
	form := url.Values{"client_id": {cfg.ClientID}, "client_secret": {cfg.ClientSecret}, "refresh_token": {cfg.RefreshToken}, "grant_type": {"refresh_token"}}
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://oauth2.googleapis.com/token", bytes.NewBufferString(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	data, err := c.do(req)
	if err != nil {
		return nil, err
	}
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if json.Unmarshal(data, &token) != nil || token.AccessToken == "" {
		return nil, errors.New("Google OAuth yanıtı geçersiz")
	}
	endpoint := "https://analyticsdata.googleapis.com/v1beta/properties/" + cfg.PropertyID + ":runReport"
	body := `{"dateRanges":[{"startDate":"7daysAgo","endDate":"yesterday"}],"metrics":[{"name":"activeUsers"},{"name":"sessions"},{"name":"ecommercePurchases"}],"limit":"1"}`
	if provider == "ads" {
		endpoint = "https://googleads.googleapis.com/v26/customers/" + cfg.CustomerID + "/googleAds:searchStream"
		body = `{"query":"SELECT customer.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE segments.date DURING LAST_7_DAYS"}`
	}
	req, _ = http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	if provider == "ads" {
		req.Header.Set("developer-token", cfg.DeveloperToken)
		if cfg.LoginCustomerID != "" {
			req.Header.Set("login-customer-id", cfg.LoginCustomerID)
		}
	}
	data, err = c.do(req)
	if err != nil {
		return nil, err
	}
	if !json.Valid(data) {
		return nil, errors.New("Google rapor yanıtı geçersiz")
	}
	return data, nil
}
func (c *Client) do(req *http.Request) ([]byte, error) {
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, errors.New("Google bağlantısı kurulamadı veya zaman aşımı")
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024+1))
	if err != nil || len(data) > 1024*1024 {
		return nil, errors.New("Google yanıtı okunamadı")
	}
	// Never forward upstream errors, request bodies or credentials to browser/logs.
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Google API isteği reddedildi (HTTP %d)", resp.StatusCode)
	}
	return data, nil
}
