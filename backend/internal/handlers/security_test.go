package handlers

import (
	"bytes"
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/config"
	"image"
	"image/png"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPublicSettingsNeverExposeIntegrations(t *testing.T) {
	out := publicSettings(map[string]string{"site_name": "IV", "aras.password": "secret", "bizimhesap.firm_id": "secret", "google.client_secret": "secret", "unknown_future_key": "secret"})
	if len(out) != 1 || out["site_name"] != "IV" {
		t.Fatal("private settings exposed")
	}
}
func TestInvalidRequestsBeforeDatabase(t *testing.T) {
	cases := []struct {
		name, body string
		handler    fiber.Handler
	}{{"cart zero", `{"product_id":1,"quantity":0}`, (&CartHandler{}).AddItem}, {"cart negative", `{"product_id":1,"quantity":-1}`, (&CartHandler{}).AddItem}, {"cart missing product", `{"quantity":1}`, (&CartHandler{}).AddItem}, {"product", `{}`, (&ProductHandler{}).Create}, {"category", `{}`, (&CategoryHandler{}).Create}, {"banner", `{}`, (&BannerHandler{}).Create}, {"malformed", `{`, (&CartHandler{}).AddItem}}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Post("/", tc.handler)
			req := httptest.NewRequest("POST", "/", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			res.Body.Close()
			if res.StatusCode != 400 {
				t.Fatal(res.StatusCode)
			}
		})
	}
}
func TestUploadContentValidation(t *testing.T) {
	var valid bytes.Buffer
	png.Encode(&valid, image.NewRGBA(image.Rect(0, 0, 2, 2)))
	for _, tc := range []struct {
		name string
		data []byte
		want int
	}{{"script.svg", []byte(`<svg onload="alert(1)"/>`), 400}, {"fake.png", []byte(`<script>alert(1)</script>`), 400}, {"real.png", valid.Bytes(), 201}, {"fake.jpg", valid.Bytes(), 400}} {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Post("/", NewUploadHandler(&config.Config{UploadDir: t.TempDir()}).UploadImage)
			var body bytes.Buffer
			w := multipart.NewWriter(&body)
			part, _ := w.CreateFormFile("file", tc.name)
			part.Write(tc.data)
			w.Close()
			req := httptest.NewRequest("POST", "/", &body)
			req.Header.Set("Content-Type", w.FormDataContentType())
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			res.Body.Close()
			if res.StatusCode != tc.want {
				t.Fatal(res.StatusCode)
			}
		})
	}
}
