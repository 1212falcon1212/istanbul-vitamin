package services

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/cache"
	"github.com/istanbulvitamin/backend/internal/integrations/bizimhesap"
	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

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
