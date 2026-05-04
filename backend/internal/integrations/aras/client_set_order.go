package aras

import (
	"context"
	"fmt"
	"strings"
)

// SetOrder Aras'a yeni bir kargo gönderimi atar.
// Aynı IntegrationCode ile tekrar çağrılırsa aynı gönderiyi günceller (max 20 update).
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

	pieces := buildPieceDetailsXML(req.PieceDetails)

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <SetOrder xmlns="http://tempuri.org/">
      <UserName>%s</UserName>
      <Password>%s</Password>
      <IntegrationCode>%s</IntegrationCode>
      <TradingWaybillNumber>%s</TradingWaybillNumber>
      <ReceiverName>%s</ReceiverName>
      <ReceiverAddress>%s</ReceiverAddress>
      <ReceiverPhone1>%s</ReceiverPhone1>
      <ReceiverCityName>%s</ReceiverCityName>
      <ReceiverTownName>%s</ReceiverTownName>
      <PayorTypeCode>%s</PayorTypeCode>
      <IsWorldWide>%s</IsWorldWide>
      <SenderAccountAddressId>%s</SenderAccountAddressId>
      <Description>%s</Description>
      %s
    </SetOrder>
  </soap12:Body>
</soap12:Envelope>`,
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
		xmlEscape(req.IntegrationCode),
		xmlEscape(req.TradingWaybillNumber),
		xmlEscape(SafeReceiverName(req.ReceiverName)),
		xmlEscape(req.ReceiverAddress),
		xmlEscape(req.ReceiverPhone1),
		xmlEscape(UpperTR(req.ReceiverCityName)),
		xmlEscape(UpperTR(req.ReceiverTownName)),
		xmlEscape(req.PayorTypeCode),
		xmlEscape(req.IsWorldWide),
		xmlEscape(req.SenderAccountAddressID),
		xmlEscape(req.Description),
		pieces,
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
		Message:    extractBetween(call.Response, "<Message>", "</Message>"),
	}
	if resp.ResultCode != "0" && resp.ResultCode != "" {
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
