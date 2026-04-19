package scheduler

import (
	"log"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/integrations/bizimhesap"
	"github.com/istanbulvitamin/backend/internal/models"
)

// Start arka plan zamanlayıcısını başlatır ve periyodik işleri kaydeder.
// Ana uygulama kapatıldığında Stop çağrılmalı.
// cfgProvider Bizimhesap settings erişimi içindir (nil geçilirse fatura retry atlanır).
func Start(cfgProvider bizimhesap.ConfigProvider) (gocron.Scheduler, error) {
	s, err := gocron.NewScheduler(gocron.WithLocation(time.Local))
	if err != nil {
		return nil, err
	}

	// Günde 1 kez (03:00) 30+ gün eski misafir sepetlerini temizle
	_, err = s.NewJob(
		gocron.CronJob("0 3 * * *", false),
		gocron.NewTask(cleanupGuestCarts),
	)
	if err != nil {
		return nil, err
	}

	// Saatlik: Bizimhesap fatura oluşturulamamış shipped/delivered siparişleri yeniden dene.
	if cfgProvider != nil {
		_, err = s.NewJob(
			gocron.CronJob("15 * * * *", false), // her saatin 15. dakikasında
			gocron.NewTask(func() {
				bizimhesap.RetryPendingInvoices(database.DB, cfgProvider)
			}),
		)
		if err != nil {
			return nil, err
		}
	}

	s.Start()
	log.Println("Scheduler başlatıldı")
	return s, nil
}

// cleanupGuestCarts 30 gün+ güncellenmemiş, kullanıcıya bağlı olmayan sepetleri siler.
func cleanupGuestCarts() {
	threshold := time.Now().AddDate(0, 0, -30)
	res := database.DB.
		Where("user_id IS NULL AND updated_at < ?", threshold).
		Delete(&models.Cart{})
	if res.Error != nil {
		log.Printf("cart cleanup hata: %v", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		log.Printf("cart cleanup: %d eski misafir sepeti temizlendi", res.RowsAffected)
	}
}
