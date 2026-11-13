package googlemarketing

import (
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func fixture() Config {
	return Config{PropertyID: "123", CustomerID: "1234567890", ClientID: "client", ClientSecret: "secret", RefreshToken: "refresh", DeveloperToken: "developer"}
}
func TestReadOnlyProviderContracts(t *testing.T) {
	for _, provider := range []string{"analytics", "ads"} {
		t.Run(provider, func(t *testing.T) {
			calls := 0
			c := &Client{HTTP: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
				calls++
				body, _ := io.ReadAll(r.Body)
				payload := `{"rows":[]}`
				if calls == 1 {
					if r.URL.Host != "oauth2.googleapis.com" || !strings.Contains(string(body), "grant_type=refresh_token") {
						t.Fatal("OAuth contract")
					}
					payload = `{"access_token":"test-access"}`
				} else {
					if r.Header.Get("Authorization") != "Bearer test-access" {
						t.Fatal("missing auth")
					}
					if provider == "ads" {
						if r.Header.Get("developer-token") != "developer" || !strings.HasSuffix(r.URL.Path, "googleAds:searchStream") || strings.Contains(string(body), "mutate") {
							t.Fatal("not read-only ads contract")
						}
					} else if !strings.HasSuffix(r.URL.Path, ":runReport") {
						t.Fatal("GA4 contract")
					}
				}
				return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(payload))}, nil
			})}}
			if _, err := c.Report(context.Background(), fixture(), provider); err != nil {
				t.Fatal(err)
			}
			if calls != 2 {
				t.Fatal(calls)
			}
		})
	}
}
func TestErrorsDoNotLeakSecrets(t *testing.T) {
	for _, status := range []int{401, 403, 429, 500} {
		c := &Client{HTTP: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(`{"secret":"refresh-secret"}`))}, nil
		})}}
		_, err := c.Report(context.Background(), fixture(), "ads")
		if err == nil || strings.Contains(err.Error(), "refresh-secret") {
			t.Fatal("unsafe error", err)
		}
	}
}
func TestMissingConfigDoesNotCallNetwork(t *testing.T) {
	c := &Client{HTTP: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { t.Fatal("network called"); return nil, nil })}}
	if _, err := c.Report(context.Background(), Config{}, "ads"); err == nil {
		t.Fatal("missing credentials accepted")
	}
}
func TestEncryptedStore(t *testing.T) {
	s := &Store{Path: filepath.Join(t.TempDir(), "private", "google.enc"), Key: base64.StdEncoding.EncodeToString(make([]byte, 32))}
	cfg := fixture()
	if err := s.Save(cfg, false); err != nil {
		t.Fatal(err)
	}
	raw, _ := os.ReadFile(s.Path)
	if strings.Contains(string(raw), "refresh") {
		t.Fatal("plaintext secret")
	}
	mode, _ := os.Stat(s.Path)
	if mode.Mode().Perm() != 0600 {
		t.Fatal(mode.Mode())
	}
	cfg.ClientSecret = ""
	cfg.RefreshToken = ""
	if err := s.Save(cfg, false); err != nil {
		t.Fatal(err)
	}
	read, err := s.Load()
	if err != nil || read.RefreshToken != "refresh" {
		t.Fatal("secret preservation", err)
	}
	if err = s.Save(Config{}, true); err != nil {
		t.Fatal(err)
	}
	read, _ = s.Load()
	if read.RefreshToken != "" {
		t.Fatal("secret not cleared")
	}
	s.Key = "bad"
	if _, err = s.Load(); err == nil {
		t.Fatal("bad key accepted")
	}
}
