package aras

import (
	"context"
	"fmt"
)

// SaveAddress gönderici/alıcı adresini Aras'a kaydeder ve dönen AddressId'yi (string) verir.
// İlk kurulumda admin "Gönderici Adresimi Aras'a Kaydet" tıkladığında çağrılır;
// dönen ID settings.aras.sender_address_id'ye yazılır.
//
// Aras'ın gerçek isteği parametreleri `<address>` wrapper'ı içinde bekliyor — wrapper
// olmadan tüm alanlar null parse edilip "Object reference not set" 500 dönüyor.
func (c *Client) SaveAddress(ctx context.Context, req SaveAddressRequest) (string, SOAPCall, error) {
	if err := c.validateConfig(); err != nil {
		return "", SOAPCall{}, err
	}

	body := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <SaveAddress xmlns="http://tempuri.org/">
      <address>
        <UserName>%s</UserName>
        <Password>%s</Password>
        <CompleteAddress>%s</CompleteAddress>
        <Name>%s</Name>
        <PhoneNumber>%s</PhoneNumber>
        <EMail>%s</EMail>
        <CustomerAddressId>%s</CustomerAddressId>
        <CityName>%s</CityName>
        <TownName>%s</TownName>
      </address>
    </SaveAddress>
  </soap:Body>
</soap:Envelope>`,
		xmlEscape(c.cfg.UserName),
		xmlEscape(c.cfg.Password),
		xmlEscape(req.CompleteAddress),
		xmlEscape(req.Name),
		xmlEscape(req.PhoneNumber),
		xmlEscape(req.EMail),
		xmlEscape(req.CustomerAddressID),
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
	addressID := firstNonEmpty(
		extractBetween(call.Response, "<AddressId>", "</AddressId>"),
		extractBetween(call.Response, "<addressId>", "</addressId>"),
		extractBetween(call.Response, "<ResultId>", "</ResultId>"),
		extractBetween(call.Response, "<CustomerAddressId>", "</CustomerAddressId>"),
	)

	// Aras'ın gerçek başarı kontrolü: ResultCode 0 veya 1 (uygulama "1=Kayıt başarılı"
	// dönüyor; "0" da bazı çağrılarda success). Kalan kodlar hata.
	if resultCode != "" && resultCode != "0" && resultCode != "1" {
		return "", call, fmt.Errorf("aras SaveAddress başarısız: code=%s msg=%s", resultCode, message)
	}
	// AddressId yanıttan parse edilememiş olabilir; çağıran zaten ham yanıtı (RawXML)
	// audit log'da görüyor. Boş string'i hata saymıyoruz çünkü Aras kayıt başarılı dedi.
	return addressID, call, nil
}
