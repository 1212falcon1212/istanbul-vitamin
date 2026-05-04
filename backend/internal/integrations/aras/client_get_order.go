package aras

import (
	"context"
	"fmt"
)

// GetOrderWithIntegrationCode IntegrationCode ile gönderiyi sorgular.
// SetOrder sonrası "KARGO TAKİP NO" değerini almak için bu çağrı yapılır.
func (c *Client) GetOrderWithIntegrationCode(ctx context.Context, integrationCode string) (GetOrderResponse, SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return GetOrderResponse{}, SOAPCall{}, err
	}

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <GetOrderWithIntegrationCode xmlns="http://tempuri.org/">
      <UserName>%s</UserName>
      <Password>%s</Password>
      <IntegrationCode>%s</IntegrationCode>
    </GetOrderWithIntegrationCode>
  </soap:Body>
</soap:Envelope>`,
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
		xmlEscape(integrationCode),
	)

	call := c.post(ctx, c.cfg.ServiceURL(), "http://tempuri.org/GetOrderWithIntegrationCode", body)
	if call.Err != nil {
		return GetOrderResponse{}, call, call.Err
	}
	if err := detectFault(call.Response); err != nil {
		return GetOrderResponse{}, call, err
	}

	resp := GetOrderResponse{
		ResultCode:      extractBetween(call.Response, "<ResultCode>", "</ResultCode>"),
		Message:         extractBetween(call.Response, "<Message>", "</Message>"),
		IntegrationCode: integrationCode,
		RawXML:          call.Response,
	}
	// Aras yanıtında "KARGO TAKİP NO" alanı bazen ayrı tag (TrackingNumber), bazen
	// XML tablosunda <KARGO_TAKIP_NO>...</KARGO_TAKIP_NO> şeklinde geliyor.
	// İki olasılığı da deneyelim.
	resp.TrackingNumber = extractBetween(call.Response, "<TrackingNumber>", "</TrackingNumber>")
	if resp.TrackingNumber == "" {
		resp.TrackingNumber = extractBetween(call.Response, "<KARGO_TAKIP_NO>", "</KARGO_TAKIP_NO>")
	}
	if resp.TrackingNumber == "" {
		resp.TrackingNumber = extractBetween(call.Response, "<KARGOTAKIPNO>", "</KARGOTAKIPNO>")
	}
	return resp, call, nil
}
