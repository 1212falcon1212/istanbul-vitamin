package aras

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
)

// DefaultTimeout SOAP isteği için zaman aşımı.
const DefaultTimeout = 25 * time.Second

// Client Aras Kargo SOAP servislerine istek atan minimal HTTP istemcisi.
// SOAP envelope'leri elle üretilir (encoding/xml + string template); WSDL code-gen
// yapılmıyor çünkü Aras WSDL'i parçalı (.asmx + .svc) ve gowsdl kırılgan.
type Client struct {
	cfg  Config
	http *resty.Client
}

// NewClient hazır bir Client döndürür.
func NewClient(cfg Config) *Client {
	r := resty.New().
		SetTimeout(DefaultTimeout).
		SetRetryCount(2).
		SetRetryWaitTime(500 * time.Millisecond).
		SetRetryMaxWaitTime(3 * time.Second)
	// SetOrder gibi yazma çağrılarında retry yan etkili olabilir (Aras 20 update
	// limiti var). Bu yüzden sadece network/IO seviyesindeki hatalarda yeniden
	// deniyoruz — HTTP 500 dönmüş ise body büyük ihtimalle SOAP fault içeriyordur,
	// retry zararlı.
	r.AddRetryCondition(func(resp *resty.Response, err error) bool {
		return err != nil && resp == nil
	})
	if cfg.PayorTypeCode == "" {
		cfg.PayorTypeCode = "1"
	}
	if cfg.ParcelKgLimit <= 0 {
		cfg.ParcelKgLimit = 30
	}
	return &Client{cfg: cfg, http: r}
}

// Config mevcut konfigürasyonu döndürür (orchestrator için).
func (c *Client) Config() Config {
	return c.cfg
}

// SOAPCall ham istek/cevap çiftini döner — orchestrator audit log'a yazar.
type SOAPCall struct {
	URL        string
	SOAPAction string
	Request    string
	Response   string
	StatusCode int
	Err        error
}

// post SOAP envelope'ı POST'lar; ham response body'sini döner.
//
// .NET ASMX servisleri SOAP 1.1 standardına göre `SOAPAction` header'ının
// **tırnak içinde** olmasını bekler. Tırnak yoksa bazı sürümler 500 atar; bu
// nedenle action argümanını her zaman çift tırnak ile sarıyoruz.
//
// HTTP 500 yanıtlarda body genelde SOAP `<Fault>` envelope'u içerir; bu durumda
// faultstring'i çıkarıp anlamlı bir hata olarak döndürüyoruz, ham response'u
// audit log için olduğu gibi taşıyoruz.
func (c *Client) post(ctx context.Context, url, soapAction, body string) SOAPCall {
	out := SOAPCall{URL: url, SOAPAction: soapAction, Request: body}
	resp, err := c.http.R().
		SetContext(ctx).
		SetHeader("Content-Type", "text/xml; charset=utf-8").
		SetHeader("SOAPAction", `"`+soapAction+`"`).
		SetBody(body).
		Post(url)
	if resp != nil {
		out.StatusCode = resp.StatusCode()
		out.Response = string(resp.Body())
	}
	if err != nil {
		out.Err = fmt.Errorf("aras http hatası: %w", err)
		return out
	}
	if resp.StatusCode() >= 500 {
		// Body SOAP envelope ise faultstring'i çekip daha okunaklı bir mesaj döndür.
		if fault := extractBetween(out.Response, "<faultstring", "</faultstring>"); fault != "" {
			// "<faultstring>" ile başladık ama bazen <faultstring xml:lang="en">…</faultstring> şeklinde
			// — kapanış '>' karakteri sonrasından başlat:
			if idx := strings.Index(fault, ">"); idx >= 0 {
				fault = strings.TrimSpace(fault[idx+1:])
			}
			out.Err = fmt.Errorf("aras soap fault (HTTP %d): %s", resp.StatusCode(), fault)
		} else {
			out.Err = fmt.Errorf("aras sunucu hatası HTTP %d: %s", resp.StatusCode(), truncate(out.Response, 1500))
		}
		return out
	}
	if resp.StatusCode() >= 400 {
		out.Err = fmt.Errorf("aras 4xx HTTP %d: %s", resp.StatusCode(), truncate(out.Response, 1500))
		return out
	}
	return out
}

// validateConfig çağrı öncesi creds dolu mu kontrol eder.
func (c *Client) validateConfig() error {
	if !c.cfg.Enabled {
		return ErrConfigDisabled
	}
	if strings.TrimSpace(c.cfg.UserName) == "" || strings.TrimSpace(c.cfg.Password) == "" {
		return ErrConfigMissing
	}
	return nil
}

// extractBetween "<tag>VALUE</tag>" dizisinden VALUE kısmını çeker.
// Aras yanıtları bazen iç içe XML escape yapıyor (<![CDATA[...]]>); bu durumda
// CDATA içeriği döndürülür.
func extractBetween(haystack, openTag, closeTag string) string {
	open := strings.Index(haystack, openTag)
	if open < 0 {
		return ""
	}
	rest := haystack[open+len(openTag):]
	end := strings.Index(rest, closeTag)
	if end < 0 {
		return ""
	}
	val := rest[:end]
	val = strings.TrimPrefix(strings.TrimSpace(val), "<![CDATA[")
	val = strings.TrimSuffix(val, "]]>")
	return strings.TrimSpace(val)
}

// xmlEscape SOAP body'ye değer gömerken minimum escape — Aras alanları metin.
func xmlEscape(s string) string {
	r := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		"\"", "&quot;",
		"'", "&apos;",
	)
	return r.Replace(s)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// ErrSOAPFault — SOAP body içinde <faultstring> dönmüşse içeriği bu hataya sarılır.
var ErrSOAPFault = errors.New("aras soap fault")

// detectFault SOAP body içinde fault varsa dönüştürür.
func detectFault(body string) error {
	if strings.Contains(body, "<faultstring>") {
		msg := extractBetween(body, "<faultstring>", "</faultstring>")
		if msg == "" {
			msg = "bilinmeyen SOAP hatası"
		}
		return fmt.Errorf("%w: %s", ErrSOAPFault, msg)
	}
	return nil
}
