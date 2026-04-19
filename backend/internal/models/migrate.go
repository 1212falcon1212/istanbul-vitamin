package models

import "gorm.io/gorm"

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&User{},
		&Admin{},
		&Address{},
		&SavedCard{},
		&Category{},
		&Brand{},
		&Product{},
		&ProductCategory{},
		&ProductImage{},
		&ProductVariant{},
		&ProductTag{},
		&VariationType{},
		&VariationValue{},
		&ProductVariantValue{},
		&Order{},
		&OrderItem{},
		&OrderStatusHistory{},
		&Cart{},
		&CartItem{},
		&Favorite{},
		&Review{},
		&Coupon{},
		&Campaign{},
		&CampaignProduct{},
		&Page{},
		&Slider{},
		&Banner{},
		&Setting{},
		&SyncLog{},
		&NewsletterSubscriber{},
	)
}
