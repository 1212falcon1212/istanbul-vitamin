package services

import (
	"errors"
	"strings"

	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/utils"
	"gorm.io/gorm"
)

type ReviewService struct {
	db *gorm.DB
}

func NewReviewService(db *gorm.DB) *ReviewService {
	return &ReviewService{db: db}
}

// List sadece onaylanmis yorumlari dondurur (public).
// User iliskisinde sadece FirstName ve LastName alinir.
func (s *ReviewService) List(productID uint64, page, perPage int) ([]models.Review, int64, error) {
	var reviews []models.Review
	var total int64

	query := s.db.Model(&models.Review{}).
		Where("product_id = ? AND is_approved = ?", productID, true)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("yorumlar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)

	err := query.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, first_name, last_name")
		}).
		Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&reviews).Error
	if err != nil {
		return nil, 0, errors.New("yorumlar listelenirken bir hata oluştu")
	}

	return reviews, total, nil
}

// Create yeni yorum olusturur. UNIQUE kisitini ihlal edilmesini onceden kontrol eder.
// Rating 1-5 arasinda olmalidir.
func (s *ReviewService) Create(userID, productID uint64, rating uint8, title, body string) (*models.Review, error) {
	if rating < 1 || rating > 5 {
		return nil, errors.New("puan 1 ile 5 arasında olmalıdır")
	}

	body = strings.TrimSpace(body)
	if len([]rune(body)) < 10 {
		return nil, errors.New("yorum en az 10 karakter olmalıdır")
	}

	// Urun var mi?
	var productCount int64
	if err := s.db.Model(&models.Product{}).Where("id = ?", productID).Count(&productCount).Error; err != nil {
		return nil, errors.New("ürün kontrol edilirken bir hata oluştu")
	}
	if productCount == 0 {
		return nil, errors.New("ürün bulunamadı")
	}

	// Ayni kullanici bu urune daha once yorum yapmis mi?
	var existingCount int64
	if err := s.db.Model(&models.Review{}).
		Where("user_id = ? AND product_id = ?", userID, productID).
		Count(&existingCount).Error; err != nil {
		return nil, errors.New("yorum kontrol edilirken bir hata oluştu")
	}
	if existingCount > 0 {
		return nil, errors.New("bu ürüne daha önce yorum yapmışsınız")
	}

	review := models.Review{
		UserID:     userID,
		ProductID:  productID,
		Rating:     rating,
		Title:      strings.TrimSpace(title),
		Body:       body,
		IsApproved: false,
	}

	if err := s.db.Create(&review).Error; err != nil {
		return nil, errors.New("yorum oluşturulurken bir hata oluştu")
	}

	return &review, nil
}

// GetStats urune ait onayli yorumlarin ortalama puanini ve sayisini dondurur.
func (s *ReviewService) GetStats(productID uint64) (float64, int, error) {
	type statsRow struct {
		Avg   *float64
		Count int64
	}

	var row statsRow
	err := s.db.Model(&models.Review{}).
		Select("AVG(rating) AS avg, COUNT(*) AS count").
		Where("product_id = ? AND is_approved = ?", productID, true).
		Scan(&row).Error
	if err != nil {
		return 0, 0, errors.New("yorum istatistikleri alınırken bir hata oluştu")
	}

	avg := 0.0
	if row.Avg != nil {
		avg = *row.Avg
	}

	return avg, int(row.Count), nil
}

// GetByID yorumu ID ile getirir.
func (s *ReviewService) GetByID(id uint64) (*models.Review, error) {
	var review models.Review
	if err := s.db.First(&review, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("yorum bulunamadı")
		}
		return nil, errors.New("yorum getirilirken bir hata oluştu")
	}
	return &review, nil
}

// DeleteByUser kullanicinin yalnizca kendi yorumunu silmesine izin verir.
func (s *ReviewService) DeleteByUser(userID, reviewID uint64) error {
	result := s.db.Where("id = ? AND user_id = ?", reviewID, userID).Delete(&models.Review{})
	if result.Error != nil {
		return errors.New("yorum silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("yorum bulunamadı")
	}
	return nil
}

// AdminList admin icin tum yorumlari dondurur (opsiyonel is_approved filtresi ile).
func (s *ReviewService) AdminList(page, perPage int, isApproved *bool) ([]models.Review, int64, error) {
	var reviews []models.Review
	var total int64

	query := s.db.Model(&models.Review{})
	if isApproved != nil {
		query = query.Where("is_approved = ?", *isApproved)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, errors.New("yorumlar sayılırken bir hata oluştu")
	}

	offset := utils.GetOffset(page, perPage)

	err := query.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, first_name, last_name, email")
		}).
		Preload("Product", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, slug, sku")
		}).
		Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&reviews).Error
	if err != nil {
		return nil, 0, errors.New("yorumlar listelenirken bir hata oluştu")
	}

	return reviews, total, nil
}

// SetApproval yorumun onay durumunu gunceller.
func (s *ReviewService) SetApproval(id uint64, approved bool) error {
	result := s.db.Model(&models.Review{}).
		Where("id = ?", id).
		Update("is_approved", approved)
	if result.Error != nil {
		return errors.New("yorum onay durumu güncellenirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("yorum bulunamadı")
	}
	return nil
}

// Delete admin yorumu siler.
func (s *ReviewService) Delete(id uint64) error {
	result := s.db.Delete(&models.Review{}, id)
	if result.Error != nil {
		return errors.New("yorum silinirken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("yorum bulunamadı")
	}
	return nil
}
