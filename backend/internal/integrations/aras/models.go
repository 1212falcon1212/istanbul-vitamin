package aras

// Aras Kargo SOAP servisleri için request/response veri modelleri.
//
// Aras iki ayrı servis URL'i kullanır:
//   - arascargoservice.asmx       → SaveAddress, SetOrder, GetOrderWithIntegrationCode, CancelDispatch
//   - ArasCargoIntegrationService.svc → GetQueryXML (kargo takip sorgulama)
//
// Aras yanıtları "ResultCode" + "Message" şeklinde döner; 0 = başarılı, diğerleri hata.

// Config Aras Kargo entegrasyonu için runtime ayarlar (settings tablosundan gelir).
type Config struct {
	Enabled           bool
	TestMode          bool
	UserName          string
	Password          string
	CustomerCode      string
	SenderAddressID   string
	PayorTypeCode     string  // "1"=gönderen öder, "2"=alıcı öder
	ParcelKgLimit     float64 // bir parça için maks. ağırlık (varsayılan 30kg)
	IntegrationPrefix string  // aynı Aras hesabı altında birden fazla site varsa çakışmaları önler (örn "IV-")
}

// SOAP endpoint'leri — TestMode bayrağına göre seçilir.
const (
	prodServiceURL     = "https://customerservice.araskargo.com.tr/arascargoservice/arascargoservice.asmx"
	testServiceURL     = "https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx"
	prodIntegrationURL = "https://customerservice.araskargo.com.tr/ArasCargoIntegrationService/ArasCargoIntegrationService.svc"
	testIntegrationURL = "https://customerservicestest.araskargo.com.tr/ArasCargoIntegrationService/ArasCargoIntegrationService.svc"
)

// SaveAddressRequest Aras'a gönderici adresi kaydetmek için kullanılır.
// Dönen AddressID, sonradan SetOrder çağrılarında SenderAccountAddressId olarak referanslanır.
type SaveAddressRequest struct {
	CustomerAddressID string // bizim sistemdeki internal kod (firma + branch için biricik)
	Name              string // adres etiketi (örn: "İstanbul Vitamin Depo")
	CompleteAddress   string
	PhoneNumber       string // 10 hane, sayısal
	EMail             string
	CityName          string
	TownName          string
}

// SetOrderRequest yeni bir kargo gönderimi oluşturur.
// IntegrationCode bizim sipariş numaramızdır; aynı kod 20 kez güncellenebilir.
type SetOrderRequest struct {
	IntegrationCode         string
	TradingWaybillNumber    string // bizim irsaliye numaramız (boş bırakılırsa Aras üretir)
	ReceiverName            string // 100 hane, "Argo" geçemez
	ReceiverAddress         string // 250 hane, "Argo" geçemez
	ReceiverPhone1          string // 10 hane sayısal (NormalizePhoneTR ile garanti edilir)
	ReceiverCityName        string
	ReceiverTownName        string
	PayorTypeCode           string // "1" veya "2"
	IsWorldWide             string // "0"=yurtiçi, "1"=yurtdışı
	SenderAccountAddressID  string // SaveAddress sonrası dönen ID (opsiyonel, varsa kullanılır)
	Description             string
	PieceDetails            []PieceDetail
}

// PieceDetail bir kargo parçası — Aras parça başı barkod ister.
type PieceDetail struct {
	BarcodeNumber    string // 64 hane max, biz "<integration_code>-<n>" üretiyoruz
	Weight           string // "0.50" gibi (kg)
	VolumetricWeight string
	ProductNumber    string
	Description      string
}

// SetOrderResponse Aras SetOrder yanıtı.
type SetOrderResponse struct {
	ResultCode string
	Message    string
}

// GetOrderResponse — GetOrderWithIntegrationCode yanıtı; KARGO TAKİP NO içerir.
type GetOrderResponse struct {
	ResultCode     string
	Message        string
	TrackingNumber string // "KARGO TAKİP NO"
	IntegrationCode string
	RawXML         string // ham XML — debug için
}

// QueryResult — GetQueryXML QueryType=1 yanıtının ayıklanmış hali.
// DurumKodu: 1..7 (1=Çıkış Şubesinde ... 6=Teslim Edildi ... 7=Yönlendirildi)
type QueryResult struct {
	TrackingNumber string
	DurumKodu      int
	DurumText      string
	History        []QueryEvent
	RawXML         string
}

// QueryEvent kargo hareket geçmişindeki bir adım.
type QueryEvent struct {
	Code        int
	Description string
	Date        string // Aras Türkçe formatta verir; biz string olarak taşıyıp UI'da basıyoruz.
	Branch      string
}

// CancelDispatchResponse — 0=ok, 999=irsaliye kesildi, iptal edilemiyor.
type CancelDispatchResponse struct {
	ResultCode string
	Message    string
}

// ParcelBarcode etiket basımı için tek bir parçanın barkod bilgisi.
type ParcelBarcode struct {
	BarcodeNumber string `json:"barcode_number"`
	Sequence      int    `json:"sequence"`
	Total         int    `json:"total"`
	Weight        string `json:"weight,omitempty"`
}

// LabelData etiket modal'ı için backend'in ürettiği snapshot.
type LabelData struct {
	OrderNumber        string          `json:"order_number"`
	IntegrationCode    string          `json:"integration_code"`
	TrackingNumber     string          `json:"tracking_number"`
	CargoCompany       string          `json:"cargo_company"`
	ShipFromName       string          `json:"ship_from_name"`
	ShipFromPhone      string          `json:"ship_from_phone"`
	ShipFromAddress    string          `json:"ship_from_address"`
	ShipFromCity       string          `json:"ship_from_city"`
	ShipFromTown       string          `json:"ship_from_town"`
	ShipToName         string          `json:"ship_to_name"`
	ShipToPhone        string          `json:"ship_to_phone"`
	ShipToAddress      string          `json:"ship_to_address"`
	ShipToCity         string          `json:"ship_to_city"`
	ShipToTown         string          `json:"ship_to_town"`
	Parcels            []ParcelBarcode `json:"parcels"`
}

// ServiceURL TestMode'a göre asmx endpoint'ini döner.
func (c Config) ServiceURL() string {
	if c.TestMode {
		return testServiceURL
	}
	return prodServiceURL
}

// IntegrationURL TestMode'a göre svc endpoint'ini döner (GetQueryXML için).
func (c Config) IntegrationURL() string {
	if c.TestMode {
		return testIntegrationURL
	}
	return prodIntegrationURL
}
