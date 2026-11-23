package aras

import (
	"context"
	"fmt"
	"strings"
)

// SetOrder Aras'a yeni bir kargo gönderimi atar.
// Aynı IntegrationCode ile tekrar çağrılırsa aynı gönderiyi günceller (max 20 update).
//
// Aras imzası şu şekilde:
//
//	SetOrder(orderInfos[Order], userName, password)
//
// Yani envelope iki şeyi birden taşır:
//   - <orderInfo><Order>...</Order></orderInfo>  → kargo bilgileri
//   - <userName>, <password>                     → method parametreleri (lowercase, ayrıca)
//
// İçteki <Order> alanlarındaki UserName/Password da gerekli (auth çift gönderilir).
//
// Başarılı yanıtın hemen ardından KARGO TAKİP NO çekmek için
// GetOrderWithIntegrationCode çağrılmalıdır — Aras takip numarasını
// SetOrder yanıtında değil, ayrı bir sorgu ile veriyor.
func (c *Client) SetOrder(ctx context.Context, req SetOrderRequest) (SetOrderResponse, SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return SetOrderResponse{}, SOAPCall{}, err
	}
	if req.PayorTypeCode == "" {
		req.PayorTypeCode = c.cfg.PayorTypeCode
	}
	if req.IsWorldWide == "" {
		req.IsWorldWide = "0"
	}
	if strings.TrimSpace(req.TradingWaybillNumber) == "" {
		// Aras zorunlu kabul ediyor — IntegrationCode'dan deterministik üret (16 hane).
		fallback := req.IntegrationCode
		if len(fallback) > 16 {
			fallback = fallback[len(fallback)-16:]
		}
		req.TradingWaybillNumber = fallback
	}

	pieces := buildPieceDetailsXML(req.PieceDetails)
	pieceCount := len(req.PieceDetails)
	if pieceCount == 0 {
		pieceCount = 1
	}

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <SetOrder xmlns="http://tempuri.org/">
      <orderInfo>
        <Order>
          <UserName>%s</UserName>
          <Password>%s</Password>
          <TradingWaybillNumber>%s</TradingWaybillNumber>
          <ReceiverName>%s</ReceiverName>
          <ReceiverAddress>%s</ReceiverAddress>
          <ReceiverPhone1>%s</ReceiverPhone1>
          <ReceiverCityName>%s</ReceiverCityName>
          <ReceiverTownName>%s</ReceiverTownName>
          <PieceCount>%d</PieceCount>
          <IntegrationCode>%s</IntegrationCode>
          <Description>%s</Description>
          <PayorTypeCode>%s</PayorTypeCode>
          <IsWorldWide>%s</IsWorldWide>
          %s
          <SenderAccountAddressId>%s</SenderAccountAddressId>
        </Order>
      </orderInfo>
      <userName>%s</userName>
      <password>%s</password>
    </SetOrder>
  </soap:Body>
</soap:Envelope>`,
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
		xmlEscape(req.TradingWaybillNumber),
		xmlEscape(SafeReceiverName(req.ReceiverName)),
		xmlEscape(req.ReceiverAddress),
		xmlEscape(req.ReceiverPhone1),
		xmlEscape(UpperTR(req.ReceiverCityName)),
		xmlEscape(UpperTR(req.ReceiverTownName)),
		pieceCount,
		xmlEscape(req.IntegrationCode),
		xmlEscape(req.Description),
		xmlEscape(req.PayorTypeCode),
		xmlEscape(req.IsWorldWide),
		pieces,
		xmlEscape(req.SenderAccountAddressID),
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
	)

	call := c.post(ctx, c.cfg.ServiceURL(), "http://tempuri.org/SetOrder", body)
	if call.Err != nil {
		return SetOrderResponse{}, call, call.Err
	}
	if err := detectFault(call.Response); err != nil {
		return SetOrderResponse{}, call, err
	}

	resp := SetOrderResponse{
		ResultCode: extractBetween(call.Response, "<ResultCode>", "</ResultCode>"),
		Message:    firstNonEmpty(extractBetween(call.Response, "<ResultMessage>", "</ResultMessage>"), extractBetween(call.Response, "<Message>", "</Message>")),
	}
	// Aras "0" ve "1" başarılı kabul ediyor (kayıt oluşturuldu / güncellendi).
	if resp.ResultCode != "0" && resp.ResultCode != "1" {
		return resp, call, fmt.Errorf("aras SetOrder başarısız: code=%s msg=%s", resp.ResultCode, resp.Message)
	}
	return resp, call, nil
}

func buildPieceDetailsXML(pieces []PieceDetail) string {
	if len(pieces) == 0 {
		return "<PieceDetails></PieceDetails>"
	}
	var b strings.Builder
	b.WriteString("<PieceDetails>")
	for _, p := range pieces {
		b.WriteString("<PieceDetail>")
		b.WriteString("<BarcodeNumber>")
		b.WriteString(xmlEscape(p.BarcodeNumber))
		b.WriteString("</BarcodeNumber>")
		if p.Weight != "" {
			b.WriteString("<Weight>")
			b.WriteString(xmlEscape(p.Weight))
			b.WriteString("</Weight>")
		}
		if p.VolumetricWeight != "" {
			b.WriteString("<VolumetricWeight>")
			b.WriteString(xmlEscape(p.VolumetricWeight))
			b.WriteString("</VolumetricWeight>")
		}
		if p.ProductNumber != "" {
			b.WriteString("<ProductNumber>")
			b.WriteString(xmlEscape(p.ProductNumber))
			b.WriteString("</ProductNumber>")
		}
		if p.Description != "" {
			b.WriteString("<Description>")
			b.WriteString(xmlEscape(p.Description))
			b.WriteString("</Description>")
		}
		b.WriteString("</PieceDetail>")
	}
	b.WriteString("</PieceDetails>")
	return b.String()
}
