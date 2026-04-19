package services

import (
	"errors"

	"github.com/istanbulvitamin/backend/internal/models"
	"gorm.io/gorm"
)

type CartService struct {
	db *gorm.DB
}

func NewCartService(db *gorm.DB) *CartService {
	return &CartService{db: db}
}

// GetOrCreateCart mevcut sepeti bulur veya yeni bir sepet olusturur.
func (s *CartService) GetOrCreateCart(userID *uint64, sessionID string) (*models.Cart, error) {
	var cart models.Cart

	query := s.db
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	} else if sessionID != "" {
		query = query.Where("session_id = ? AND user_id IS NULL", sessionID)
	} else {
		return nil, errors.New("kullanıcı veya oturum bilgisi gereklidir")
	}

	err := query.
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("cart_items.created_at DESC")
		}).
		Preload("Items.Product").
		Preload("Items.Product.Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Preload("Items.Variant").
		First(&cart).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			cart = models.Cart{
				UserID:    userID,
				SessionID: sessionID,
			}
			if err := s.db.Create(&cart).Error; err != nil {
				return nil, errors.New("sepet oluşturulurken bir hata oluştu")
			}
			cart.Items = []models.CartItem{}
			return &cart, nil
		}
		return nil, errors.New("sepet getirilirken bir hata oluştu")
	}

	return &cart, nil
}

// AddItem sepete urun ekler. Urun zaten varsa miktarini arttirir.
func (s *CartService) AddItem(cartID uint64, productID uint64, variantID *uint64, quantity int) error {
	if quantity <= 0 {
		return errors.New("miktar sıfırdan büyük olmalıdır")
	}

	// Urun kontrolu
	var product models.Product
	if err := s.db.First(&product, productID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("ürün bulunamadı")
		}
		return errors.New("ürün kontrol edilirken bir hata oluştu")
	}

	if !product.IsActive {
		return errors.New("bu ürün şu anda satışta değil")
	}

	// Varyant kontrolu
	availableStock := product.Stock
	if variantID != nil {
		var variant models.ProductVariant
		if err := s.db.First(&variant, *variantID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("ürün varyantı bulunamadı")
			}
			return errors.New("varyant kontrol edilirken bir hata oluştu")
		}
		if variant.ProductID != productID {
			return errors.New("varyant bu ürüne ait değil")
		}
		availableStock = variant.Stock
	}

	// Mevcut sepet ogesi kontrolu
	var existingItem models.CartItem
	itemQuery := s.db.Where("cart_id = ? AND product_id = ?", cartID, productID)
	if variantID != nil {
		itemQuery = itemQuery.Where("variant_id = ?", *variantID)
	} else {
		itemQuery = itemQuery.Where("variant_id IS NULL")
	}

	err := itemQuery.First(&existingItem).Error
	if err == nil {
		// Mevcut ogeyi guncelle
		newQuantity := existingItem.Quantity + quantity
		if newQuantity > availableStock {
			return errors.New("yetersiz stok")
		}
		return s.db.Model(&existingItem).Update("quantity", newQuantity).Error
	}

	// Stok kontrolu
	if quantity > availableStock {
		return errors.New("yetersiz stok")
	}

	// Yeni oge olustur
	item := models.CartItem{
		CartID:    cartID,
		ProductID: productID,
		VariantID: variantID,
		Quantity:  quantity,
	}

	if err := s.db.Create(&item).Error; err != nil {
		return errors.New("ürün sepete eklenirken bir hata oluştu")
	}

	return nil
}

// UpdateItem sepet ogesinin miktarini gunceller.
func (s *CartService) UpdateItem(itemID uint64, cartID uint64, quantity int) error {
	if quantity <= 0 {
		return errors.New("miktar sıfırdan büyük olmalıdır")
	}

	var item models.CartItem
	if err := s.db.Where("id = ? AND cart_id = ?", itemID, cartID).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("sepet ögesi bulunamadı")
		}
		return errors.New("sepet ögesi getirilirken bir hata oluştu")
	}

	// Stok kontrolu
	if item.VariantID != nil {
		var variant models.ProductVariant
		if err := s.db.First(&variant, *item.VariantID).Error; err == nil {
			if quantity > variant.Stock {
				return errors.New("yetersiz stok")
			}
		}
	} else {
		var product models.Product
		if err := s.db.First(&product, item.ProductID).Error; err == nil {
			if quantity > product.Stock {
				return errors.New("yetersiz stok")
			}
		}
	}

	if err := s.db.Model(&item).Update("quantity", quantity).Error; err != nil {
		return errors.New("miktar güncellenirken bir hata oluştu")
	}

	return nil
}

// RemoveItem sepetten urun kaldirir.
func (s *CartService) RemoveItem(itemID uint64, cartID uint64) error {
	result := s.db.Where("id = ? AND cart_id = ?", itemID, cartID).Delete(&models.CartItem{})
	if result.Error != nil {
		return errors.New("ürün sepetten kaldırılırken bir hata oluştu")
	}
	if result.RowsAffected == 0 {
		return errors.New("sepet ögesi bulunamadı")
	}
	return nil
}

// GetCartWithDetails tam sepet bilgilerini getirir.
func (s *CartService) GetCartWithDetails(cartID uint64) (*models.Cart, error) {
	var cart models.Cart

	err := s.db.
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("cart_items.created_at DESC")
		}).
		Preload("Items.Product").
		Preload("Items.Product.Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("product_images.sort_order ASC")
		}).
		Preload("Items.Variant").
		First(&cart, cartID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("sepet bulunamadı")
		}
		return nil, errors.New("sepet getirilirken bir hata oluştu")
	}

	return &cart, nil
}

// ApplyCoupon sepete kupon uygular ve kupon bilgilerini dondurur.
func (s *CartService) ApplyCoupon(cartID uint64, code string, userID *uint64) (*models.Coupon, error) {
	couponService := NewCouponService(s.db)

	// Sepet toplamini hesapla
	var cart models.Cart
	if err := s.db.Preload("Items").Preload("Items.Product").Preload("Items.Variant").First(&cart, cartID).Error; err != nil {
		return nil, errors.New("sepet bulunamadı")
	}

	var orderAmount float64
	for _, item := range cart.Items {
		if item.Variant != nil {
			orderAmount += item.Variant.Price * float64(item.Quantity)
		} else if item.Product != nil {
			orderAmount += item.Product.Price * float64(item.Quantity)
		}
	}

	coupon, _, err := couponService.Validate(code, orderAmount, userID)
	if err != nil {
		return nil, err
	}

	return coupon, nil
}

// ClearCart sepetteki tum ogeleri temizler.
func (s *CartService) ClearCart(cartID uint64) error {
	if err := s.db.Where("cart_id = ?", cartID).Delete(&models.CartItem{}).Error; err != nil {
		return errors.New("sepet temizlenirken bir hata oluştu")
	}
	return nil
}

// MergeGuestCart misafir sepetini kullanici sepetine birlestirir.
func (s *CartService) MergeGuestCart(sessionID string, userID uint64) error {
	var guestCart models.Cart
	err := s.db.Where("session_id = ? AND user_id IS NULL", sessionID).
		Preload("Items").
		First(&guestCart).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil // Misafir sepeti yok, sorun degil
		}
		return errors.New("misafir sepeti getirilirken bir hata oluştu")
	}

	if len(guestCart.Items) == 0 {
		return nil
	}

	// Kullanici sepetini bul veya olustur
	userCart, err := s.GetOrCreateCart(&userID, "")
	if err != nil {
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, guestItem := range guestCart.Items {
			var existingItem models.CartItem
			itemQuery := tx.Where("cart_id = ? AND product_id = ?", userCart.ID, guestItem.ProductID)
			if guestItem.VariantID != nil {
				itemQuery = itemQuery.Where("variant_id = ?", *guestItem.VariantID)
			} else {
				itemQuery = itemQuery.Where("variant_id IS NULL")
			}

			if err := itemQuery.First(&existingItem).Error; err == nil {
				// Miktar artir
				newQty := existingItem.Quantity + guestItem.Quantity
				if err := tx.Model(&existingItem).Update("quantity", newQty).Error; err != nil {
					return errors.New("sepet birleştirilirken bir hata oluştu")
				}
			} else {
				// Yeni oge tasi
				newItem := models.CartItem{
					CartID:    userCart.ID,
					ProductID: guestItem.ProductID,
					VariantID: guestItem.VariantID,
					Quantity:  guestItem.Quantity,
				}
				if err := tx.Create(&newItem).Error; err != nil {
					return errors.New("sepet birleştirilirken bir hata oluştu")
				}
			}
		}

		// Misafir sepetini temizle ve sil
		if err := tx.Where("cart_id = ?", guestCart.ID).Delete(&models.CartItem{}).Error; err != nil {
			return errors.New("misafir sepeti temizlenirken bir hata oluştu")
		}
		if err := tx.Delete(&guestCart).Error; err != nil {
			return errors.New("misafir sepeti silinirken bir hata oluştu")
		}

		return nil
	})
}
