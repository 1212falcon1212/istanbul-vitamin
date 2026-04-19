package services

import (
	"errors"
	"math"
	"strings"
	"time"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type CouponService struct {
	db *gorm.DB
}

func NewCouponService(db *gorm.DB) *CouponService {
	return &CouponService{db: db}
}

// Validate kuponu dogrular ve indirim tutarini hesaplar.
func (s *CouponService) Validate(code string, orderAmount float64, userID *uint64) (*models.Coupon, float64, error) {
	code = strings.TrimSpace(strings.ToUpper(code))
	if code == "" {
		return nil, 0, errors.New("kupon kodu gereklidir")
	}

	var coupon models.Coupon
	if err := s.db.Where("code = ?", code).First(&coupon).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, errors.New("geçersiz kupon kodu")
		}
		return nil, 0, errors.New("kupon kontrol edilirken bir hata oluştu")
	}

	if !coupon.IsActive {
		return nil, 0, errors.New("bu kupon artık geçerli değil")
	}

	now := time.Now()
	if coupon.StartsAt != nil && now.Before(*coupon.StartsAt) {
		return nil, 0, errors.New("bu kupon henüz geçerli değil")
	}
	if coupon.ExpiresAt != nil && now.After(*coupon.ExpiresAt) {
		return nil, 0, errors.New("bu kuponun süresi dolmuş")
	}

	if coupon.UsageLimit != nil && coupon.UsageCount >= *coupon.UsageLimit {
		return nil, 0, errors.New("bu kuponun kullanım limiti dolmuş")
	}

	if orderAmount < coupon.MinOrderAmount {
		return nil, 0, errors.New("sipariş tutarı kupon için yeterli değil")
	}

	// Kullanici basina kullanim limiti kontrolu
	if userID != nil && coupon.PerUserLimit > 0 {
		var userUsageCount int64
		s.db.Model(&models.Order{}).
			Where("user_id = ? AND coupon_code = ? AND status NOT IN ('cancelled', 'refunded')", *userID, code).
			Count(&userUsageCount)
		if int(userUsageCount) >= coupon.PerUserLimit {
			return nil, 0, errors.New("bu kuponu daha fazla kullanamazsınız")
		}
	}

	// Indirim tutarini hesapla
	var discount float64
	if coupon.DiscountType == "percentage" {
		discount = orderAmount * coupon.DiscountValue / 100
		if coupon.MaxDiscountAmount != nil && discount > *coupon.MaxDiscountAmount {
			discount = *coupon.MaxDiscountAmount
		}
	} else {
		discount = coupon.DiscountValue
	}

	// Indirim siparis tutarindan fazla olamaz
	discount = math.Min(discount, orderAmount)
	discount = math.Round(discount*100) / 100

	return &coupon, discount, nil
}

// List kuponlari sayfalanmis olarak dondurur (admin).
func (s *CouponService) List(page, perPage int) ([]models.Coupon, int64, error) {
	var coupons []models.Coupon
	var total int64

	if err := s.db.Model(&models.Coupon{}).Count(&total).Error; err != nil {
		return nil, 0, errors.New("kuponlar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)

	if err := s.db.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&coupons).Error; err != nil {
		return nil, 0, errors.New("kuponlar listelenirken bir hata oluştu")
	}

	return coupons, total, nil
}

// Create yeni kupon olusturur.
func (s *CouponService) Create(coupon *models.Coupon) error {
	coupon.Code = strings.TrimSpace(strings.ToUpper(coupon.Code))

	// Benzersizlik kontrolu
	var count int64
	if err := s.db.Model(&models.Coupon{}).Where("code = ?", coupon.Code).Count(&count).Error; err != nil {
		return errors.New("kupon kontrol edilirken bir hata oluştu")
	}
	if count > 0 {
		return errors.New("bu kupon kodu zaten mevcut")
	}

	if err := s.db.Create(coupon).Error; err != nil {
		return errors.New("kupon oluşturulurken bir hata oluştu")
	}

	return nil
}

// Update mevcut kuponu gunceller.
func (s *CouponService) Update(coupon *models.Coupon) error {
	var existing models.Coupon
	if err := s.db.First(&existing, coupon.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("kupon bulunamadı")
		}
		return errors.New("kupon getirilirken bir hata oluştu")
	}

	coupon.Code = strings.TrimSpace(strings.ToUpper(coupon.Code))

	// Kod degistiyse benzersizlik kontrolu
	if coupon.Code != existing.Code {
		var count int64
		if err := s.db.Model(&models.Coupon{}).Where("code = ? AND id != ?", coupon.Code, coupon.ID).Count(&count).Error; err != nil {
			return errors.New("kupon kontrol edilirken bir hata oluştu")
		}
		if count > 0 {
			return errors.New("bu kupon kodu zaten mevcut")
		}
	}

	if err := s.db.Save(coupon).Error; err != nil {
		return errors.New("kupon güncellenirken bir hata oluştu")
	}

	return nil
}

// Delete kuponu siler.
func (s *CouponService) Delete(id uint64) error {
	result := s.db.Delete(&models.Coupon{}, id)
	if result.Error != nil {
		return errors.New("kupon silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("kupon bulunamadı")
	}
	return nil
}

// IncrementUsage kuponun kullanim sayisini arttirir.
func (s *CouponService) IncrementUsage(id uint64) error {
	result := s.db.Model(&models.Coupon{}).Where("id = ?", id).
		UpdateColumn("usage_count", gorm.Expr("usage_count + 1"))
	if result.Error != nil {
		return errors.New("kupon kullanım sayısı güncellenirken bir hata oluştu")
	}
	return nil
}
