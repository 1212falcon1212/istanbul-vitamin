package services

import (
	"fmt"
	mysqldsn "github.com/go-sql-driver/mysql"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"os"
	"testing"
	"time"
)

// Opt-in, rollback-only verification against the isolated local MySQL database.
func TestLocalNotificationTransactions(t *testing.T) {
	if os.Getenv("IV_LOCAL_NOTIFICATION_TEST") != "1" {
		t.Skip("local MySQL opt-in")
	}
	env, err := godotenv.Read("../../.env")
	if err != nil {
		t.Fatal(err)
	}
	if env["DB_HOST"] != "127.0.0.1" || env["DB_PORT"] != "33079" || env["DB_NAME"] != "istanbul_vitamin_local" {
		t.Fatal("isolated local DB required")
	}
	dsn := mysqldsn.Config{User: env["DB_USER"], Passwd: env["DB_PASSWORD"], Net: "tcp", Addr: "127.0.0.1:33079", DBName: env["DB_NAME"], ParseTime: true, AllowNativePasswords: true}
	db, err := gorm.Open(mysql.Open(dsn.FormatDSN()), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	tx := db.Begin()
	defer tx.Rollback()
	check := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}
	user := models.User{Email: fmt.Sprintf("notification-%d@example.test", time.Now().UnixNano()), PasswordHash: "test-only", FirstName: "Test", LastName: "Notification", IsActive: true}
	check(tx.Create(&user).Error)
	order := models.Order{OrderNumber: fmt.Sprintf("N%d", time.Now().UnixNano()), Source: "web", Status: "pending", UserID: &user.ID, Total: 123, ShippingFirstName: "Test"}
	check(tx.Omit("ArasIntegrationCode").Create(&order).Error)
	h := models.OrderStatusHistory{OrderID: order.ID, NewStatus: "pending"}
	check(tx.Create(&h).Error)
	var e models.NotificationEvent
	check(tx.Where("order_id = ?", order.ID).First(&e).Error)
	svc := NotificationService{DB: tx, Config: &config.Config{SiteURL: "http://localhost:3000"}}
	check(svc.expand(e))
	check(svc.expand(e))
	var n int64
	check(tx.Model(&models.NotificationDelivery{}).Where("event_id = ?", e.ID).Count(&n).Error)
	if n != 1 {
		t.Fatalf("duplicate/missing email: %d", n)
	}
	duplicate := models.OrderStatusHistory{OrderID: order.ID, NewStatus: "pending"}
	check(tx.Create(&duplicate).Error)
	check(tx.Model(&models.NotificationEvent{}).Where("order_id = ?", order.ID).Count(&n).Error)
	if n != 1 {
		t.Fatalf("duplicate event: %d", n)
	}
	c := models.OrderCancellation{OrderID: order.ID, Type: "return", Status: "requested", Reason: "other", RefundStatus: "pending"}
	check(tx.Create(&c).Error)
	check(tx.Model(&c).Updates(map[string]any{"status": "approved", "refund_status": "failed"}).Error)
	check(tx.Model(&models.NotificationEvent{}).Where("order_id = ? AND kind = ?", order.ID, "refund_completed").Count(&n).Error)
	if n != 0 {
		t.Fatal("failed refund announced complete")
	}
	check(tx.Model(&c).Updates(map[string]any{"refund_status": "completed", "paytr_refund_id": "QA-REFERENCE"}).Error)
	check(tx.Model(&models.NotificationEvent{}).Where("order_id = ? AND kind = ?", order.ID, "refund_completed").Count(&n).Error)
	if n != 1 {
		t.Fatal("refund success event absent")
	}
	check(tx.Rollback().Error)
	check(db.Model(&models.NotificationEvent{}).Where("order_id = ?", order.ID).Count(&n).Error)
	if n != 0 {
		t.Fatal("rolled-back events leaked")
	}
}
