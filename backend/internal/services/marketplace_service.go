package services

import (
	"errors"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type MarketplaceService struct {
	db *gorm.DB
}

func NewMarketplaceService(db *gorm.DB) *MarketplaceService {
	return &MarketplaceService{db: db}
}

// GetSyncLogs filtrelenmis ve sayfalanmis senkronizasyon loglarini dondurur.
func (s *MarketplaceService) GetSyncLogs(marketplace, syncType string, page, perPage int) ([]models.SyncLog, int64, error) {
	var logs []models.SyncLog
	var total int64

	query := s.db.Model(&models.SyncLog{})

	if marketplace != "" {
		query = query.Where("marketplace = ?", marketplace)
	}
	if syncType != "" {
		query = query.Where("sync_type = ?", syncType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("senkronizasyon logları sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)

	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&logs).Error
	if err != nil {
		return nil, 0, errors.New("senkronizasyon logları listelenirken bir hata oluştu")
	}

	return logs, total, nil
}

// CreateSyncLog yeni senkronizasyon log kaydi olusturur.
func (s *MarketplaceService) CreateSyncLog(log *models.SyncLog) error {
	if err := s.db.Create(log).Error; err != nil {
		return errors.New("senkronizasyon logu oluşturulurken bir hata oluştu")
	}
	return nil
}

// TriggerSync belirtilen pazaryeri ve tur icin senkronizasyon baslatir (placeholder).
func (s *MarketplaceService) TriggerSync(marketplace, syncType string) error {
	now := time.Now()
	log := &models.SyncLog{
		Marketplace: marketplace,
		SyncType:    syncType,
		Status:      "success",
		TotalItems:  0,
		StartedAt:   now,
		CompletedAt: &now,
	}

	if err := s.db.Create(log).Error; err != nil {
		return errors.New("senkronizasyon başlatılırken bir hata oluştu")
	}

	return nil
}
