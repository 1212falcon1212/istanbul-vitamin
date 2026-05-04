package aras

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

// QueryTracking GetQueryXML QueryType=1 ile takip numarasının güncel durumunu sorgular.
// Aras XML formatında DURUMKODU + DURUM + tarihler döner.
func (c *Client) QueryTracking(ctx context.Context, trackingNo string) (QueryResult, SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return QueryResult{}, SOAPCall{}, err
	}

	loginInfo := fmt.Sprintf(`<![CDATA[<Root><LoginInfo><UserName>%s</UserName><Password>%s</Password><CustomerCode>%s</CustomerCode></LoginInfo></Root>]]>`,
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
		xmlEscape(c.cfg.CustomerCode),
	)
	queryInfo := fmt.Sprintf(`<![CDATA[<Root><QueryInfo><CargoTrackingNumber>%s</CargoTrackingNumber></QueryInfo></Root>]]>`,
		xmlEscape(trackingNo),
	)

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <GetQueryXML xmlns="http://tempuri.org/">
      <queryType>1</queryType>
      <loginInfo>%s</loginInfo>
      <queryInfo>%s</queryInfo>
    </GetQueryXML>
  </soap12:Body>
</soap12:Envelope>`, loginInfo, queryInfo)

	call := c.post(ctx, c.cfg.IntegrationURL(), "http://tempuri.org/GetQueryXML", body)
	if call.Err != nil {
		return QueryResult{}, call, call.Err
	}
	if err := detectFault(call.Response); err != nil {
		return QueryResult{}, call, err
	}

	out := QueryResult{TrackingNumber: trackingNo, RawXML: call.Response}

	// Aras yanıt gövdesinde <GetQueryXMLResult>...</GetQueryXMLResult> içinde XML
	// dize olarak gömülü gelir; o XML'i ham olarak parse ediyoruz (kaba string parse,
	// çünkü kaynak farklı kabuk yapıları gösteriyor). Hem büyük harf hem küçük harf
	// alan adlarına karşı dayanıklıyız.
	durum := firstNonEmpty(
		extractBetween(call.Response, "<DURUMKODU>", "</DURUMKODU>"),
		extractBetween(call.Response, "<DURUM_KODU>", "</DURUM_KODU>"),
		extractBetween(call.Response, "<DurumKodu>", "</DurumKodu>"),
		extractBetween(call.Response, "<StatusCode>", "</StatusCode>"),
	)
	if durum != "" {
		if v, err := strconv.Atoi(strings.TrimSpace(durum)); err == nil {
			out.DurumKodu = v
		}
	}
	out.DurumText = firstNonEmpty(
		extractBetween(call.Response, "<DURUM>", "</DURUM>"),
		extractBetween(call.Response, "<DurumAciklama>", "</DurumAciklama>"),
		extractBetween(call.Response, "<StatusText>", "</StatusText>"),
		statusTextFor(out.DurumKodu),
	)
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
