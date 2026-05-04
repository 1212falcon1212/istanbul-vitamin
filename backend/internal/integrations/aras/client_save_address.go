package aras

import (
	"context"
	"fmt"
)

// SaveAddress gönderici/alıcı adresini Aras'a kaydeder ve dönen AddressId'yi (string) verir.
// İlk kurulumda admin "Gönderici Adresimi Aras'a Kaydet" tıkladığında çağrılır;
// dönen ID settings.aras.sender_address_id'ye yazılır.
func (c *Client) SaveAddress(ctx context.Context, req SaveAddressRequest) (string, SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return "", SOAPCall{}, err
	}

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <SaveAddress xmlns="http://tempuri.org/">
      <UserName>%s</UserName>
      <Password>%s</Password>
      <CustomerAddressId>%s</CustomerAddressId>
      <Name>%s</Name>
      <CompleteAddress>%s</CompleteAddress>
      <PhoneNumber>%s</PhoneNumber>
      <EMail>%s</EMail>
      <CityName>%s</CityName>
      <TownName>%s</TownName>
    </SaveAddress>
  </soap12:Body>
</soap12:Envelope>`,
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
		xmlEscape(req.CustomerAddressID),
		xmlEscape(req.Name),
		xmlEscape(req.CompleteAddress),
		xmlEscape(req.PhoneNumber),
		xmlEscape(req.EMail),
		xmlEscape(UpperTR(req.CityName)),
		xmlEscape(UpperTR(req.TownName)),
	)

	call := c.post(ctx, c.cfg.ServiceURL(), "http://tempuri.org/SaveAddress", body)
	if call.Err != nil {
		return "", call, call.Err
	}
	if err := detectFault(call.Response); err != nil {
		return "", call, err
	}
	resultCode := extractBetween(call.Response, "<ResultCode>", "</ResultCode>")
	message := extractBetween(call.Response, "<Message>", "</Message>")
	addressID := extractBetween(call.Response, "<AddressId>", "</AddressId>")

	if addressID == "" || (resultCode != "" && resultCode != "0") {
		return "", call, fmt.Errorf("aras SaveAddress başarısız: code=%s msg=%s", resultCode, message)
	}
	return addressID, call, nil
}
