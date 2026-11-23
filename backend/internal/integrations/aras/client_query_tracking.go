package aras

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

// QueryTracking GetQueryXML QueryType=1 ile entegrasyon kodunun güncel durumunu sorgular.
// Aras XML formatında DURUMKODU + DURUM + tarihler döner.
func (c *Client) QueryTracking(ctx context.Context, integrationCode string) (QueryResult, SOAPCall, error) {
	if !c.cfg.Enabled {
		return QueryResult{}, SOAPCall{}, ErrConfigDisabled
	}
	username, password := c.cfg.UserName, c.cfg.Password
	if c.cfg.QueryUserName != "" {
		username, password = c.cfg.QueryUserName, c.cfg.QueryPassword
	}
	if strings.TrimSpace(username) == "" || strings.TrimSpace(password) == "" {
		return QueryResult{}, SOAPCall{}, ErrConfigMissing
	}

	if strings.TrimSpace(c.cfg.CustomerCode) == "" {
		return QueryResult{}, SOAPCall{}, fmt.Errorf("aras sorgulama müşteri kodu eksik")
	}
	loginInfo := xmlEscape(fmt.Sprintf(`<LoginInfo><UserName>%s</UserName><Password>%s</Password><CustomerCode>%s</CustomerCode></LoginInfo>`,
		xmlEscape(username), xmlEscape(password), xmlEscape(c.cfg.CustomerCode)))
	queryInfo := xmlEscape(fmt.Sprintf(`<QueryInfo><QueryType>1</QueryType><IntegrationCode>%s</IntegrationCode></QueryInfo>`, xmlEscape(integrationCode)))

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <GetQueryXML xmlns="http://tempuri.org/">
      <loginInfo>%s</loginInfo>
      <queryInfo>%s</queryInfo>
    </GetQueryXML>
  </soap:Body>
</soap:Envelope>`, loginInfo, queryInfo)

	call := c.post(ctx, c.cfg.IntegrationURL(), "http://tempuri.org/IArasCargoIntegrationService/GetQueryXML", body)
	if call.Err != nil {
		return QueryResult{}, call, call.Err
	}
	if err := detectFault(call.Response); err != nil {
		return QueryResult{}, call, err
	}

	fields, err := responseFields(call.Response)
	if err != nil {
		return QueryResult{}, call, err
	}
	if !strings.Contains(call.Response, "GetQueryXMLResult") {
		return QueryResult{}, call, fmt.Errorf("aras sorgulama sonuç alanı eksik")
	}
	if msg := field(fields, "GetQueryXMLResult"); msg != "" {
		return QueryResult{}, call, fmt.Errorf("aras sorgulama hatası: %s", msg)
	}
	out := QueryResult{RawXML: call.Response}
	out.TrackingNumber = field(fields, "TrackingNumber", "KARGO_TAKIP_NO", "KARGO_TAKIP_NUMARASI")
	out.DurumKodu, _ = strconv.Atoi(field(fields, "DURUM_KODU", "StatusCode"))
	out.DurumText = firstNonEmpty(field(fields, "DURUMU", "DURUM", "DurumAciklama", "StatusText"), statusTextFor(out.DurumKodu))
	if out.DurumKodu < 0 || out.DurumKodu > 7 {
		return out, call, fmt.Errorf("aras bilinmeyen durum kodu: %d", out.DurumKodu)
	}

	return out, call, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

// statusTextFor 1..7 → Türkçe açıklama (Aras yanıtta DURUM eksikse fallback).
func statusTextFor(code int) string {
	switch code {
	case 1:
		return "Çıkış Şubesinde"
	case 2:
		return "Yolda"
	case 3:
		return "Teslimat Şubesinde"
	case 4:
		return "Dağıtımda"
	case 5:
		return "Parçalı Teslimat"
	case 6:
		return "Teslim Edildi"
	case 7:
		return "Yönlendirildi"
	default:
		return ""
	}
}
