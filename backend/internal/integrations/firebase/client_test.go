package firebase

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestNoNetworkByDefault(t *testing.T) {
	c := Client{HTTP: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { t.Fatal("unexpected network"); return nil, nil })}}
	if c.Send(context.Background(), "token", Message{}) == nil {
		t.Fatal("expected network guard")
	}
}
func TestMessagePaths(t *testing.T) {
	for _, p := range []string{"https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", ""} {
		if (Message{Title: "hello", Path: p}).Validate() == nil {
			t.Fatalf("accepted unsafe %q", p)
		}
	}
	if (Message{Title: "hello", Path: "/magaza?q=x"}).Validate() != nil {
		t.Fatal("local path should work")
	}
}
func TestOAuthAndDataOnlyContract(t *testing.T) {
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	raw, _ := json.Marshal(map[string]string{"project_id": "demo-project", "client_email": "sender@demo-project.iam.gserviceaccount.com", "private_key": string(pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)}))})
	path := filepath.Join(t.TempDir(), "service.json")
	os.WriteFile(path, raw, 0600)
	calls := 0
	c := Client{Config: Config{true, "web", "demo-project", "app", "sender", "vapid"}, CredentialPath: path, AllowNetwork: true, HTTP: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		calls++
		body := ""
		if calls == 1 {
			if r.URL.String() != "https://oauth2.googleapis.com/token" {
				t.Fatal(r.URL)
			}
			r.ParseForm()
			if r.Form.Get("assertion") == "" {
				t.Fatal("missing signed assertion")
			}
			body = `{"access_token":"fake-access"}`
		} else {
			if r.URL.String() != "https://fcm.googleapis.com/v1/projects/demo-project/messages:send" || r.Header.Get("Authorization") != "Bearer fake-access" {
				t.Fatal("wrong FCM request")
			}
			var p map[string]map[string]any
			json.NewDecoder(r.Body).Decode(&p)
			if p["message"]["notification"] != nil {
				t.Fatal("must not duplicate browser notification")
			}
			if p["message"]["token"] != "device-token" {
				t.Fatal("missing target")
			}
			body = `{"name":"test-message"}`
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}}
	if e := c.Send(context.Background(), "device-token", Message{"Test", "Body", "/magaza"}); e != nil {
		t.Fatal(e)
	}
	if calls != 2 {
		t.Fatal(calls)
	}
}
