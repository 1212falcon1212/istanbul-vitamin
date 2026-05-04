package aras

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

// ConfigProvider Aras Kargo settings'ine erişim için arayüz.
// SettingService import döngüsüne girmemek için interface olarak tutulur.
type ConfigProvider interface {
	ArasConfig() (Config, error)
	SetArasSenderAddressID(id string) error
	// ContactSettings gönderici adres alanlarını (firma adı/telefon/adres/şehir/ilçe) döndürür.
	ContactSettings() (ContactSettings, error)
}

// ContactSettings settings.contact grubundaki minimal alanlar — gönderici tarafı için.
type ContactSettings struct {
	SenderName string // "İstanbul Vitamin Depo" gibi; boşsa SiteName
	SiteName   string
	Phone      string
	Email      string
	Address    string
	City       string
	Town       string
}

// OrderShipper aras servisinin OrderService'e bağladığı dar arayüz.
// Status geçişleri ve aras_* alan güncellemeleri OrderService'te yaşıyor.
type OrderShipper interface {
	ApplyArasShipment(orderID uint64, integrationCode, trackingNo, cargoCompany string, parcelCount int) error
	ApplyArasStatus(orderID uint64, code int, text string) error
	MarkCancelAttempt(orderID uint64, succeeded bool) error
}

// Service Aras entegrasyonunun yüksek-seviye orchestrator'ı.
type Service struct {
	db      *gorm.DB
	cfgProv ConfigProvider
	shipper OrderShipper
}

// NewService yeni bir Aras servisi oluşturur.
func NewService(db *gorm.DB, cfgProv ConfigProvider, shipper OrderShipper) *Service {
	return &Service{db: db, cfgProv: cfgProv, shipper: shipper}
}

// newClient her çağrıda taze config ile client kurar (settings cache invalidation tutarlı kalsın).
func (s *Service) newClient() (*Client, error) {
	cfg, err := s.cfgProv.ArasConfig()
	if err != nil {
		return nil, err
	}
	return NewClient(cfg), nil
}

// log audit kaydını yazar; tip dönüşü yok — log hatası ana akışı bozmaz.
func (s *Service) log(orderID uint64, op string, call SOAPCall) {
	rec := models.ArasShipmentLog{
		OrderID:     orderID,
		Op:          op,
		RequestXML:  call.Request,
		ResponseXML: call.Response,
	}
	if call.Err != nil {
		rec.Error = truncate(call.Err.Error(), 500)
	}
	rec.StatusCode = extractBetween(call.Response, "<ResultCode>", "</ResultCode>")
	if err := s.db.Create(&rec).Error; err != nil {
		log.Printf("[aras] audit log yazılamadı: order=%d op=%s err=%v", orderID, op, err)
	}
}

// RegisterSenderAddress ContactSettings'i kullanarak Aras'a gönderici adresi kaydeder.
// Dönen AddressId settings.aras.sender_address_id'ye yazılır.
func (s *Service) RegisterSenderAddress(ctx context.Context) (string, error) {
	c, err := s.newClient()
	if err != nil {
		return "", err
	}
	if err := c.validateConfig(); err != nil {
		return "", err
	}
	contact, err := s.cfgProv.ContactSettings()
	if err != nil {
		return "", err
	}
	name := strings.TrimSpace(contact.SenderName)
	if name == "" {
		name = strings.TrimSpace(contact.SiteName)
	}
	if name == "" {
		name = "Mağaza"
	}
	if strings.TrimSpace(contact.Address) == "" || strings.TrimSpace(contact.City) == "" || strings.TrimSpace(contact.Town) == "" {
		return "", errors.New("contact.address, contact.city ve contact.town doldurulmalı")
	}
	phone, err := NormalizePhoneTR(contact.Phone)
	if err != nil {
		return "", fmt.Errorf("contact.phone geçersiz: %w", err)
	}

	req := SaveAddressRequest{
		CustomerAddressID: "MAIN-WAREHOUSE",
		Name:              name,
		CompleteAddress:   contact.Address,
		PhoneNumber:       phone,
		EMail:             contact.Email,
		CityName:          contact.City,
		TownName:          contact.Town,
	}
	id, call, err := c.SaveAddress(ctx, req)
	s.log(0, "save_address", call)
	if err != nil {
		return "", err
	}
	if err := s.cfgProv.SetArasSenderAddressID(id); err != nil {
		return "", fmt.Errorf("AddressId persist edilemedi: %w", err)
	}
	return id, nil
}

// CreateShipment siparişi Aras'a kargolar. Başarılı olursa aras_* alanları + status="shipped" set edilir.
func (s *Service) CreateShipment(ctx context.Context, orderID uint64) error {
	c, err := s.newClient()
	if err != nil {
		return err
	}
	if err := c.validateConfig(); err != nil {
		return err
	}

	var order models.Order
	if err := s.db.
		Preload("Items").
		Preload("Items.Product").
		First(&order, orderID).Error; err != nil {
		return errors.New("sipariş bulunamadı")
	}
	if order.Status != "pending" && order.ArasIntegrationCode != "" {
		return ErrAlreadyShipped
	}
	phone, err := NormalizePhoneTR(firstNonEmpty(order.ShippingPhone, order.BillingPhone))
	if err != nil {
		return err
	}
	if strings.TrimSpace(order.ShippingAddress) == "" || strings.TrimSpace(order.ShippingCity) == "" || strings.TrimSpace(order.ShippingDistrict) == "" {
		return errors.New("teslimat adresi eksik")
	}
	receiverName := strings.TrimSpace(order.ShippingFirstName + " " + order.ShippingLastName)
	if receiverName == "" {
		receiverName = "Müşteri"
	}

	parcelCount := CalculateParcelCount(order.Items, c.cfg.ParcelKgLimit)
	integrationCode := order.OrderNumber
	totalWeight := 0.0
	for _, it := range order.Items {
		if it.Product != nil && it.Product.Weight != nil {
			totalWeight += *it.Product.Weight * float64(it.Quantity)
		}
	}
	pieces := BarcodesFromIntegrationCode(integrationCode, parcelCount)
	parcels := make([]PieceDetail, len(pieces))
	for i, p := range pieces {
		parcels[i] = PieceDetail{BarcodeNumber: p.BarcodeNumber}
		if totalWeight > 0 {
			parcels[i].Weight = fmt.Sprintf("%.2f", totalWeight/float64(parcelCount))
		}
	}

	setReq := SetOrderRequest{
		IntegrationCode:        integrationCode,
		TradingWaybillNumber:   "", // Aras üretsin
		ReceiverName:           receiverName,
		ReceiverAddress:        order.ShippingAddress,
		ReceiverPhone1:         phone,
		ReceiverCityName:       order.ShippingCity,
		ReceiverTownName:       order.ShippingDistrict,
		PayorTypeCode:          c.cfg.PayorTypeCode,
		IsWorldWide:            "0",
		SenderAccountAddressID: c.cfg.SenderAddressID,
		Description:            fmt.Sprintf("Sipariş #%s — %d kalem", order.OrderNumber, len(order.Items)),
		PieceDetails:           parcels,
	}

	_, setCall, err := c.SetOrder(ctx, setReq)
	s.log(orderID, "set_order", setCall)
	if err != nil {
		return err
	}

	getResp, getCall, err := c.GetOrderWithIntegrationCode(ctx, integrationCode)
	s.log(orderID, "get_order", getCall)
	if err != nil {
		return err
	}
	tracking := strings.TrimSpace(getResp.TrackingNumber)

	// aras_* alanlarını + tracking number'ı OrderService üzerinden persist et
	// (UpdateStatus("shipped") da içeride çağrılıyor → Bizimhesap tetikleyicisi vb.)
	if err := s.shipper.ApplyArasShipment(orderID, integrationCode, tracking, "Aras Kargo", parcelCount); err != nil {
		return fmt.Errorf("kargo bilgileri kaydedilemedi: %w", err)
	}
	// İlk durumu kaydet (1 = Çıkış Şubesinde varsayılır)
	_ = s.shipper.ApplyArasStatus(orderID, 1, statusTextFor(1))
	return nil
}

// RefreshStatus tek bir siparişin Aras durumunu yeniden çeker.
func (s *Service) RefreshStatus(ctx context.Context, orderID uint64) error {
	c, err := s.newClient()
	if err != nil {
		return err
	}
	if err := c.validateConfig(); err != nil {
		return err
	}
	var order models.Order
	if err := s.db.First(&order, orderID).Error; err != nil {
		return errors.New("sipariş bulunamadı")
	}
	if strings.TrimSpace(order.TrackingNumber) == "" {
		return ErrNoTracking
	}
	res, call, err := c.QueryTracking(ctx, order.TrackingNumber)
	s.log(orderID, "query", call)
	if err != nil {
		return err
	}
	if res.DurumKodu == 0 {
		return errors.New("aras yanıtında durum kodu okunamadı")
	}
	return s.shipper.ApplyArasStatus(orderID, res.DurumKodu, res.DurumText)
}

// CancelShipment Aras'taki gönderiyi iptal etmeyi dener.
// 999 (irsaliye kesildi) durumunda ErrCannotCancel döner ama UpdateStatus akışını engellemez —
// caller (CancellationService) iade akışına yönlenir.
func (s *Service) CancelShipment(ctx context.Context, orderID uint64) error {
	c, err := s.newClient()
	if err != nil {
		return err
	}
	if err := c.validateConfig(); err != nil {
		return err
	}
	var order models.Order
	if err := s.db.First(&order, orderID).Error; err != nil {
		return errors.New("sipariş bulunamadı")
	}
	code := order.ArasIntegrationCode
	if code == "" {
		code = order.OrderNumber
	}
	_, call, err := c.CancelDispatch(ctx, code)
	s.log(orderID, "cancel", call)
	if err != nil {
		// 999: irsaliye kesildi — flag'i set et ama hatayı yukarıya geçir.
		if errors.Is(err, ErrCannotCancel) {
			_ = s.shipper.MarkCancelAttempt(orderID, false)
		}
		return err
	}
	_ = s.shipper.MarkCancelAttempt(orderID, true)
	return nil
}

// PollStatuses 15 dk'da bir scheduler tarafından çağrılır.
// status='shipped' AND aras_status_code<6 olan siparişleri sorgular (max 50/turn, jittersiz).
func (s *Service) PollStatuses(ctx context.Context) (int, error) {
	c, err := s.newClient()
	if err != nil {
		return 0, err
	}
	if !c.cfg.Enabled {
		return 0, nil
	}
	var orders []models.Order
	q := s.db.
		Where("status = ?", "shipped").
		Where("tracking_number <> ''").
		Where("aras_status_code IS NULL OR aras_status_code < 6").
		Order("aras_status_checked_at IS NULL DESC, aras_status_checked_at ASC").
		Limit(50)
	if err := q.Find(&orders).Error; err != nil {
		return 0, err
	}
	updated := 0
	for i := range orders {
		select {
		case <-ctx.Done():
			return updated, ctx.Err()
		default:
		}
		o := &orders[i]
		res, call, err := c.QueryTracking(ctx, o.TrackingNumber)
		s.log(o.ID, "query", call)
		if err != nil {
			log.Printf("[aras] poll: order=%d err=%v", o.ID, err)
			continue
		}
		if res.DurumKodu == 0 {
			continue
		}
		if err := s.shipper.ApplyArasStatus(o.ID, res.DurumKodu, res.DurumText); err != nil {
			log.Printf("[aras] poll: status update başarısız order=%d err=%v", o.ID, err)
			continue
		}
		updated++
		// minik delay — Aras tarafına yumuşak yaklaşmak için
		time.Sleep(150 * time.Millisecond)
	}
	return updated, nil
}

// BarcodesFor admin etiket modal'ı için sipariş bazında parça barkodlarını döner.
func (s *Service) BarcodesFor(orderID uint64) (*LabelData, error) {
	contact, err := s.cfgProv.ContactSettings()
	if err != nil {
		return nil, err
	}
	var order models.Order
	if err := s.db.First(&order, orderID).Error; err != nil {
		return nil, errors.New("sipariş bulunamadı")
	}
	parcelCount := 1
	if order.ArasParcelCount != nil && *order.ArasParcelCount > 0 {
		parcelCount = *order.ArasParcelCount
	}
	integ := order.ArasIntegrationCode
	if integ == "" {
		integ = order.OrderNumber
	}
	parcels := BarcodesFromIntegrationCode(integ, parcelCount)
	// Eğer hiç tracking yok ama parça varsa Aras henüz vermedi; integration code üzerinden basıyoruz.
	// Tek parça ve tracking varsa parça-1 = tracking.
	if parcelCount == 1 && order.TrackingNumber != "" {
		parcels[0].BarcodeNumber = order.TrackingNumber
	}
	senderName := strings.TrimSpace(contact.SenderName)
	if senderName == "" {
		senderName = strings.TrimSpace(contact.SiteName)
	}
	return &LabelData{
		OrderNumber:     order.OrderNumber,
		IntegrationCode: integ,
		TrackingNumber:  order.TrackingNumber,
		CargoCompany:    "Aras Kargo",
		ShipFromName:    senderName,
		ShipFromPhone:   contact.Phone,
		ShipFromAddress: contact.Address,
		ShipFromCity:    contact.City,
		ShipFromTown:    contact.Town,
		ShipToName:      strings.TrimSpace(order.ShippingFirstName + " " + order.ShippingLastName),
		ShipToPhone:     order.ShippingPhone,
		ShipToAddress:   order.ShippingAddress,
		ShipToCity:      order.ShippingCity,
		ShipToTown:      order.ShippingDistrict,
		Parcels:         parcels,
	}, nil
}

// CreateReturnShipment iade kargosu için ters yönlü SetOrder çağırır
// (sender = customer, receiver = warehouse). Cancellation onaylandığında çağrılır.
func (s *Service) CreateReturnShipment(ctx context.Context, cancellationID uint64) error {
	c, err := s.newClient()
	if err != nil {
		return err
	}
	if err := c.validateConfig(); err != nil {
		return err
	}
	var cancellation models.OrderCancellation
	if err := s.db.Preload("Order").First(&cancellation, cancellationID).Error; err != nil {
		return errors.New("iade talebi bulunamadı")
	}
	if cancellation.Order == nil {
		return errors.New("sipariş bulunamadı")
	}
	contact, err := s.cfgProv.ContactSettings()
	if err != nil {
		return err
	}
	order := cancellation.Order
	customerPhone, err := NormalizePhoneTR(firstNonEmpty(order.ShippingPhone, order.BillingPhone))
	if err != nil {
		return err
	}
	warehousePhone, err := NormalizePhoneTR(contact.Phone)
	if err != nil {
		return fmt.Errorf("contact.phone geçersiz: %w", err)
	}

	integrationCode := fmt.Sprintf("IADE-%s-%d", order.OrderNumber, cancellation.ID)
	pieces := BarcodesFromIntegrationCode(integrationCode, 1)
	parcels := []PieceDetail{{BarcodeNumber: pieces[0].BarcodeNumber, Description: "İade gönderimi"}}

	// Aras SetOrder yalnızca ALICI tarafını alıyor; gönderici settings.sender_address_id ile bağlanır.
	// İade için alıcı = depomuz (sender_address_id), receiver alanları da depo bilgileri.
	// "Receiver" alanları depo bilgileridir; gönderici ise müşteri olur.
	// Aras gönderim akışında "müşteriden depoya" iade için ayrı SaveAddress (müşteri) yerine
	// SetOrder gönderici alanları boş bırakılabilir; ancak en doğrusu yeni bir SaveAddress ile
	// müşteri adresini geçici kaydedip sonrasında iade SetOrder'ını yapmak. Pratik olarak
	// bu akışta Aras "alıcı = depo, ödeyen = depo" mantığıyla çalıştırılıyor.
	_ = customerPhone

	receiverName := strings.TrimSpace(contact.SenderName)
	if receiverName == "" {
		receiverName = "Mağaza"
	}

	setReq := SetOrderRequest{
		IntegrationCode:        integrationCode,
		ReceiverName:           receiverName,
		ReceiverAddress:        contact.Address,
		ReceiverPhone1:         warehousePhone,
		ReceiverCityName:       contact.City,
		ReceiverTownName:       contact.Town,
		PayorTypeCode:          "1",
		IsWorldWide:            "0",
		SenderAccountAddressID: c.cfg.SenderAddressID, // depo adresi
		Description:            fmt.Sprintf("İade kargosu — sipariş #%s", order.OrderNumber),
		PieceDetails:           parcels,
	}
	_, setCall, err := c.SetOrder(ctx, setReq)
	s.log(order.ID, "set_order_return", setCall)
	if err != nil {
		return err
	}
	getResp, getCall, err := c.GetOrderWithIntegrationCode(ctx, integrationCode)
	s.log(order.ID, "get_order_return", getCall)
	if err != nil {
		return err
	}

	updates := map[string]interface{}{
		"aras_return_tracking": getResp.TrackingNumber,
	}
	if err := s.db.Model(&models.OrderCancellation{}).Where("id = ?", cancellation.ID).Updates(updates).Error; err != nil {
		return err
	}
	return nil
}

// SaveCustomerAddress test endpoint'i için yardımcı — tek bir SaveAddress ping'i yapar.
func (s *Service) SaveCustomerAddress(ctx context.Context, req SaveAddressRequest) (string, error) {
	c, err := s.newClient()
	if err != nil {
		return "", err
	}
	if err := c.validateConfig(); err != nil {
		return "", err
	}
	id, call, err := c.SaveAddress(ctx, req)
	s.log(0, "save_address_test", call)
	return id, err
}
