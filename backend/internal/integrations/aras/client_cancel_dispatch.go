package aras

import (
	"context"
	"fmt"
)

// CancelDispatch IntegrationCode ile oluşturulmuş gönderiyi iptal eder.
// İrsaliye kesilmemişse 0 döner; irsaliye kesilmişse -1/999 (artık iptal edilemez).
//
// Aras imzası: CancelDispatch(orderCode, userName, password) — auth lowercase
// top-level parametre.
func (c *Client) CancelDispatch(ctx context.Context, integrationCode string) (CancelDispatchResponse, SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return CancelDispatchResponse{}, SOAPCall{}, err
	}

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <CancelDispatch xmlns="http://tempuri.org/">
      <orderCode>%s</orderCode>
      <userName>%s</userName>
      <password>%s</password>
    </CancelDispatch>
  </soap:Body>
</soap:Envelope>`,
		xmlEscape(integrationCode),
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
	)

	call := c.post(ctx, c.cfg.ServiceURL(), "http://tempuri.org/CancelDispatch", body)
	if call.Err != nil {
		return CancelDispatchResponse{}, call, call.Err
	}
	if err := detectFault(call.Response); err != nil {
		return CancelDispatchResponse{}, call, err
	}

	resp := CancelDispatchResponse{
		ResultCode: extractBetween(call.Response, "<ResultCode>", "</ResultCode>"),
		Message:    extractBetween(call.Response, "<Message>", "</Message>"),
	}
	// Aras dökümanı: -1 = "Kayıt bulunamadı (silinemiyor)", 999 da görüldü; her iki durumu da iptal-edilemez sayıyoruz.
	if resp.ResultCode == "999" || resp.ResultCode == "-1" {
		return resp, call, ErrCannotCancel
	}
	// 0 ve 1 başarı (Aras "1=Başarılı" stringini kullanıyor pratikte).
	if resp.ResultCode != "" && resp.ResultCode != "0" && resp.ResultCode != "1" {
		return resp, call, fmt.Errorf("aras CancelDispatch başarısız: code=%s msg=%s", resp.ResultCode, resp.Message)
	}
	return resp, call, nil
}
