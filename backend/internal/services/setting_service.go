package services

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/cache"
	"github.com/istanbulvitamin/backend/internal/integrations/aras"
	"github.com/istanbulvitamin/backend/internal/integrations/bizimhesap"
	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// secretKeyMask GetByGroup yanıtında redakte edilen hassas değerlerin maskesi.
const secretKeyMask = "********"

// secretKeys public-redakte edilecek key listesi (API'da boşaltılır).
var secretKeys = map[string]bool{
	"aras.password": true,
}

const (
	cacheKeySettingsAll        = "settings:all"
	cacheKeySettingsGroupPrefix = "settings:group:"
	cacheTTLSettings           = 6 * time.Hour
)

type SettingService struct {
	db *gorm.DB
}

func NewSettingService(db *gorm.DB) *SettingService {
	return &SettingService{db: db}
}

// GetAll tum ayarlari key-value map olarak dondurur.
// Sonuç 6 saat cache'lenir.
func (s *SettingService) GetAll() (map[string]string, error) {
	return cache.Remember(context.Background(), cacheKeySettingsAll, cacheTTLSettings, func() (map[string]string, error) {
		var settings []models.Setting
		if err := s.db.Find(&settings).Error; err != nil {
			return nil, errors.New("ayarlar getirilirken bir hata oluştu")
		}

		result := make(map[string]string, len(settings))
		for _, setting := range settings {
			result[setting.Key] = setting.Value
		}

		return result, nil
	})
}

// GetByGroup belirli bir gruptaki ayarlari dondurur.
// Sonuç 6 saat cache'lenir.
func (s *SettingService) GetByGroup(group string) ([]models.Setting, error) {
	key := cacheKeySettingsGroupPrefix + group
	return cache.Remember(context.Background(), key, cacheTTLSettings, func() ([]models.Setting, error) {
		var settings []models.Setting
		if err := s.db.Where("`group` = ?", group).Order("`key` ASC").Find(&settings).Error; err != nil {
			return nil, errors.New("ayarlar getirilirken bir hata oluştu")
		}
		return settings, nil
	})
}

// Update ayarlari toplu olarak gunceller (upsert).
// Başarılı olursa ilgili cache key'leri temizlenir.
func (s *SettingService) Update(settings []models.Setting) error {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, setting := range settings {
			if setting.Key == "" {
				continue
			}

			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "key"}},
				DoUpdates: clause.AssignmentColumns([]string{"value", "group", "updated_at"}),
			}).Create(&setting).Error; err != nil {
				return errors.New("ayarlar güncellenirken bir hata oluştu")
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Cache invalidation — etkilenen grupları topla ve sil.
	ctx := context.Background()
	keys := []string{cacheKeySettingsAll}
	seenGroups := make(map[string]struct{})
	for _, setting := range settings {
		if setting.Group == "" {
			continue
		}
		if _, ok := seenGroups[setting.Group]; ok {
			continue
		}
		seenGroups[setting.Group] = struct{}{}
		keys = append(keys, cacheKeySettingsGroupPrefix+setting.Group)
	}
	cache.Del(ctx, keys...)

	return nil
}

// Get tek bir ayarin degerini dondurur.
func (s *SettingService) Get(key string) (string, error) {
	var setting models.Setting
	if err := s.db.Where("`key` = ?", key).First(&setting).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("ayar bulunamadı")
		}
		return "", errors.New("ayar getirilirken bir hata oluştu")
	}
	return setting.Value, nil
}

// GetByGroupRedacted GetByGroup'un public versiyonu — secretKeys listesindeki key'lerin
// değerini boşaltır. Frontend Settings UI'ı şifreyi olduğu gibi göstermez; boş gelirse
// kullanıcı yeni bir değer girene kadar mevcut DB değeri korunur.
func (s *SettingService) GetByGroupRedacted(group string) ([]models.Setting, error) {
	settings, err := s.GetByGroup(group)
	if err != nil {
		return nil, err
	}
	out := make([]models.Setting, len(settings))
	for i, st := range settings {
		out[i] = st
		if secretKeys[st.Key] && st.Value != "" {
			out[i].Value = secretKeyMask
		}
	}
	return out, nil
}

// UpdatePreservingSecrets gelen ayarları kaydeder ama secretKeys listesindeki
// key'in değeri boş ya da masked ise mevcut değeri korur (silmez/üzerine yazmaz).
// Frontend şifre alanını boş yollarsa "değiştirme" anlamına gelir.
func (s *SettingService) UpdatePreservingSecrets(settings []models.Setting) error {
	if len(settings) == 0 {
		return s.Update(settings)
	}
	preserved := make([]models.Setting, 0, len(settings))
	for _, st := range settings {
		if secretKeys[st.Key] {
			val := strings.TrimSpace(st.Value)
			if val == "" || val == secretKeyMask {
				continue // bu key'i atla; mevcut DB değeri korunsun
			}
		}
		preserved = append(preserved, st)
	}
	return s.Update(preserved)
}

// ArasConfig aras.* key'lerini okuyup hazır Aras Client konfigürasyonuna çevirir.
func (s *SettingService) ArasConfig() (aras.Config, error) {
	all, err := s.GetAll()
	if err != nil {
		return aras.Config{}, err
	}
	cfg := aras.Config{
		Enabled:           strings.EqualFold(strings.TrimSpace(all["aras.enabled"]), "true"),
		TestMode:          strings.EqualFold(strings.TrimSpace(all["aras.test_mode"]), "true"),
		UserName:          strings.TrimSpace(all["aras.username"]),
		Password:          strings.TrimSpace(all["aras.password"]),
		CustomerCode:      strings.TrimSpace(all["aras.customer_code"]),
		SenderAddressID:   strings.TrimSpace(all["aras.sender_address_id"]),
		PayorTypeCode:     strings.TrimSpace(all["aras.payor_type_code"]),
		IntegrationPrefix: strings.TrimSpace(all["aras.integration_prefix"]),
		ParcelKgLimit:     30,
	}
	if v := strings.TrimSpace(all["aras.parcel_kg_limit"]); v != "" {
		if parsed, perr := strconv.ParseFloat(v, 64); perr == nil && parsed > 0 {
			cfg.ParcelKgLimit = parsed
		}
	}
	return cfg, nil
}

// SetArasSenderAddressID Aras SaveAddress sonrası dönen ID'yi settings'e yazar.
func (s *SettingService) SetArasSenderAddressID(id string) error {
	return s.Update([]models.Setting{{
		Key:   "aras.sender_address_id",
		Value: id,
		Group: "aras_kargo",
	}})
}

// ContactSettings Aras gönderici adresi için contact grubundan gerekli alanları döndürür.
func (s *SettingService) ContactSettings() (aras.ContactSettings, error) {
	all, err := s.GetAll()
	if err != nil {
		return aras.ContactSettings{}, err
	}
	return aras.ContactSettings{
		SenderName: strings.TrimSpace(all["sender_name"]),
		SiteName:   strings.TrimSpace(all["site_name"]),
		Phone:      strings.TrimSpace(all["phone"]),
		Email:      strings.TrimSpace(all["email"]),
		Address:    strings.TrimSpace(all["address"]),
		City:       strings.TrimSpace(all["city"]),
		Town:       strings.TrimSpace(all["town"]),
	}, nil
}

// BizimhesapConfig bizimhesap.* key'lerini okuyup hazır Client konfigürasyonuna çevirir.
func (s *SettingService) BizimhesapConfig() (bizimhesap.Config, error) {
	all, err := s.GetAll()
	if err != nil {
		return bizimhesap.Config{}, err
	}
	cfg := bizimhesap.Config{
		Enabled:        strings.EqualFold(strings.TrimSpace(all["bizimhesap.enabled"]), "true"),
		FirmID:         strings.TrimSpace(all["bizimhesap.firm_id"]),
		BaseURL:        strings.TrimSpace(all["bizimhesap.base_url"]),
		DefaultTaxRate: 20,
	}
	if v := strings.TrimSpace(all["bizimhesap.default_tax_rate"]); v != "" {
		if parsed, perr := strconv.ParseFloat(v, 64); perr == nil && parsed > 0 {
			cfg.DefaultTaxRate = parsed
		}
	}
	return cfg, nil
}
