package aras

import (
	"context"
	"fmt"
)

// CancelDispatch IntegrationCode ile oluşturulmuş gönderiyi iptal eder.
// İrsaliye kesilmemişse 0 döner; irsaliye kesilmişse 999 (artık iptal edilemez).
func (c *Client) CancelDispatch(ctx context.Context, integrationCode string) (CancelDispatchResponse, SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return CancelDispatchResponse{}, SOAPCall{}, err
	}

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <CancelDispatch xmlns="http://tempuri.org/">
      <UserName>%s</UserName>
      <Password>%s</Password>
      <OrderCode>%s</OrderCode>
    </CancelDispatch>
  </soap12:Body>
</soap12:Envelope>`,
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
		xmlEscape(integrationCode),
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
	if resp.ResultCode == "999" {
		return resp, call, ErrCannotCancel
	}
	if resp.ResultCode != "0" && resp.ResultCode != "" {
		return resp, call, fmt.Errorf("aras CancelDispatch başarısız: code=%s msg=%s", resp.ResultCode, resp.Message)
	}
	return resp, call, nil
}
