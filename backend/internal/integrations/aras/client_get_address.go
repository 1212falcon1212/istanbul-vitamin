package aras

import (
	"context"
	"fmt"
	"strings"
)

// CheckSenderAddress verifies access to the configured address without creating test records.
func (c *Client) CheckSenderAddress(ctx context.Context) (SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return SOAPCall{}, err
	}
	if strings.TrimSpace(c.cfg.SenderAddressID) == "" {
		return SOAPCall{}, ErrSenderAddrUnregistered
	}
	body := fmt.Sprintf(`<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetAddressById xmlns="http://tempuri.org/"><request><Username>%s</Username><Password>%s</Password><AccountAddressId>%s</AccountAddressId></request></GetAddressById></soap:Body></soap:Envelope>`, xmlEscape(c.cfg.UserName), xmlEscape(c.cfg.Password), xmlEscape(c.cfg.SenderAddressID))
	call := c.post(ctx, c.cfg.ServiceURL(), "http://tempuri.org/GetAddressById", body)
	if call.Err != nil {
		return call, call.Err
	}
	fields, err := responseFields(call.Response)
	if err != nil {
		return call, err
	}
	if field(fields, "ResultCode") == "" || !strings.EqualFold(field(fields, "AccountAddressId"), strings.TrimSpace(c.cfg.SenderAddressID)) {
		return call, fmt.Errorf("Aras gönderici adresi doğrulanamadı")
	}
	return call, nil
}
