package aras

import (
	"context"
	"encoding/xml"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func testConfig() Config {
	return Config{Enabled: true, TestMode: true, UserName: "test-user", Password: "test-secret", CustomerCode: "test-customer"}
}
func stubClient(cfg Config, f func(*http.Request, string) string) *Client {
	c := NewClient(cfg)
	c.http.SetTransport(roundTripFunc(func(r *http.Request) (*http.Response, error) {
		b, _ := io.ReadAll(r.Body)
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(f(r, string(b)))), Request: r}, nil
	}))
	return c
}
func queryEnvelope(inner string) string {
	return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><GetQueryXMLResponse xmlns="http://tempuri.org/"><GetQueryXMLResult>` + xmlEscape(inner) + `</GetQueryXMLResult></GetQueryXMLResponse></s:Body></s:Envelope>`
}

func TestQueryContractAndEscapedResponse(t *testing.T) {
	cfg := testConfig()
	cfg.QueryUserName = "query-user"
	cfg.QueryPassword = "query<&secret]]>"
	c := stubClient(cfg, func(r *http.Request, body string) string {
		if r.URL.String() != testIntegrationURL || r.Header.Get("SOAPAction") != `"http://tempuri.org/IArasCargoIntegrationService/GetQueryXML"` {
			t.Fatal("wrong WCF endpoint/action")
		}
		var envelope struct {
			Body struct {
				Query struct {
					Login string `xml:"loginInfo"`
					Info  string `xml:"queryInfo"`
				} `xml:"GetQueryXML"`
			} `xml:"Body"`
		}
		if err := xml.Unmarshal([]byte(body), &envelope); err != nil {
			t.Fatal(err)
		}
		var login struct {
			User     string `xml:"UserName"`
			Password string `xml:"Password"`
		}
		if err := xml.Unmarshal([]byte(envelope.Body.Query.Login), &login); err != nil {
			t.Fatal(err)
		}
		if login.User != cfg.QueryUserName || login.Password != cfg.QueryPassword {
			t.Fatal("query credentials not preserved")
		}
		if envelope.Body.Query.Info != `<QueryInfo><QueryType>1</QueryType><IntegrationCode>IV-101</IntegrationCode></QueryInfo>` {
			t.Fatal("wrong QueryInfo")
		}
		if strings.Contains(body, "<queryType>") || strings.Contains(body, "Root") {
			t.Fatal("unexpected parameter")
		}
		return queryEnvelope(`<NewDataSet><Table><KARGO_x0020_TAKİP_x0020_NO>12345</KARGO_x0020_TAKİP_x0020_NO><DURUM_x0020_KODU>7</DURUM_x0020_KODU><DURUMU>Yönlendirildi</DURUMU></Table></NewDataSet>`)
	})
	res, call, err := c.QueryTracking(context.Background(), "IV-101")
	if err != nil || res.TrackingNumber != "12345" || res.DurumKodu != 7 {
		t.Fatalf("unexpected query result: %+v %v", res, err)
	}
	redacted := redactSOAP(call.Request)
	if strings.Contains(redacted, "query&amp;") || !strings.Contains(redacted, "[REDACTED]") {
		t.Fatal("query password leaked")
	}
}

func TestResponseVariants(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		wantErr    bool
		status     string
	}{
		{"cdata", `<GetQueryXMLResult><![CDATA[<Rows><Row><DURUM_KODU>6</DURUM_KODU></Row></Rows>]]></GetQueryXMLResult>`, false, "6"},
		{"namespace", `<a:Row xmlns:a="urn:test"><a:DURUM_KODU>4</a:DURUM_KODU></a:Row>`, false, "4"},
		{"auth", queryEnvelope(`<Result><ResultCode>405</ResultCode><ResultMessage>Denied</ResultMessage></Result>`), true, ""},
		{"fault", `<s:Fault xmlns:s="urn:soap"><faultstring>Denied</faultstring></s:Fault>`, true, ""},
		{"malformed", `<broken>`, true, ""},
		{"pending", queryEnvelope(`<NewDataSet/>`), false, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			fields, err := responseFields(tc.body)
			if (err != nil) != tc.wantErr {
				t.Fatalf("err=%v", err)
			}
			if !tc.wantErr && field(fields, "DURUM_KODU") != tc.status {
				t.Fatal(fields)
			}
		})
	}
}

func TestMutationsRequireExplicitSuccess(t *testing.T) {
	for _, code := range []string{"", "1006", "70023", "0", "1"} {
		t.Run("code-"+code, func(t *testing.T) {
			c := stubClient(testConfig(), func(_ *http.Request, _ string) string {
				return `<SetOrderResponse><ResultCode>` + code + `</ResultCode><ResultMessage>message</ResultMessage></SetOrderResponse>`
			})
			_, _, err := c.SetOrder(context.Background(), SetOrderRequest{IntegrationCode: "IV-101", PieceDetails: []PieceDetail{{BarcodeNumber: "IV-101-1", Weight: "1", VolumetricWeight: "1"}}})
			if (err == nil) != (code == "0" || code == "1") {
				t.Fatalf("code=%s err=%v", code, err)
			}
		})
	}
	c := stubClient(testConfig(), func(_ *http.Request, _ string) string {
		return `<SaveAddressResult><ResultCode>1</ResultCode></SaveAddressResult>`
	})
	if _, _, err := c.SaveAddress(context.Background(), SaveAddressRequest{}); err == nil {
		t.Fatal("missing address accepted")
	}
}

func TestReadOnlyConnectionAndRedaction(t *testing.T) {
	cfg := testConfig()
	cfg.SenderAddressID = "01234567890123456789012345678901"
	c := stubClient(cfg, func(r *http.Request, body string) string {
		if !strings.Contains(body, "<AccountAddressId>"+cfg.SenderAddressID) || strings.Contains(body, "<SaveAddress>") {
			t.Fatal("connection test must not create address")
		}
		return `<GetAddressByIdResult><ResultCode>0</ResultCode><AccountAddressId>` + cfg.SenderAddressID + `</AccountAddressId></GetAddressByIdResult>`
	})
	if _, err := c.CheckSenderAddress(context.Background()); err != nil {
		t.Fatal(err)
	}
	for _, body := range []string{`<Password>secret</Password>`, `<x:password xmlns:x="a">secret</x:password>`, `&lt;Password&gt;secret&lt;/Password&gt;`} {
		if strings.Contains(redactSOAP(body), "secret") {
			t.Fatal("secret leaked")
		}
	}
}
