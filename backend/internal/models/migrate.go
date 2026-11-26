package models

import (
	"github.com/istanbulvitamin/backend/migrations"
	"gorm.io/gorm"
	"strings"
)

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&NotificationEvent{},
		&NotificationDelivery{},
		&PushSubscription{},
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
		&OrderReceipt{},
		&OrderItem{},
		&OrderStatusHistory{},
		&OrderCancellation{},
		&ArasShipmentLog{},
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
	); err != nil {
		return err
	}
	for _, statement := range strings.Split(migrations.SessionTriggers, ";") {
		if sql := strings.TrimSpace(statement); sql != "" {
			if err := db.Exec(sql).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
