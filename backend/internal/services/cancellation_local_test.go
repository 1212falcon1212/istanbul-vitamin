package services

import (
	"fmt"
	mysqldsn "github.com/go-sql-driver/mysql"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"os"
	"testing"
	"time"
)

func TestLocalReturnRequest(t *testing.T) {
	if os.Getenv("IV_LOCAL_RETURN_TEST") != "1" {
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
	user := models.User{Email: fmt.Sprintf("return-%d@example.test", time.Now().UnixNano()), PasswordHash: "test-only", FirstName: "Test", LastName: "Return", IsActive: true}
	check(tx.Create(&user).Error)
	order := models.Order{OrderNumber: fmt.Sprintf("R%d", time.Now().UnixNano()), UserID: &user.ID, PaymentMethod: "bank_transfer", Status: "delivered", Total: 100}
	check(tx.Create(&order).Error)
	svc := NewCancellationService(tx, NewOrderService(tx), nil, nil)
	if _, err := svc.RequestByCustomer(user.ID+99999, order.ID, "return", "other", "test"); err == nil {
		t.Fatal("another user can return order")
	}
	request, err := svc.RequestByCustomer(user.ID, order.ID, "return", "other", "test")
	check(err)
	if request.Status != "requested" || request.RefundStatus != "pending" || request.PayTRRefundID != "" {
		t.Fatal("incorrect initial return state")
	}
	if _, err = svc.RequestByCustomer(user.ID, order.ID, "return", "other", "test"); err == nil {
		t.Fatal("duplicate request accepted")
	}
	var count int64
	check(tx.Model(&models.OrderCancellation{}).Where("order_id = ?", order.ID).Count(&count).Error)
	if count != 1 {
		t.Fatal("incorrect request count")
	}
	check(tx.Model(&models.NotificationEvent{}).Where("order_id = ? AND kind = ?", order.ID, "return_requested").Count(&count).Error)
	if count != 1 {
		t.Fatal("return notification missing")
	}
	check(tx.First(&order, order.ID).Error)
	if order.Status != "delivered" {
		t.Fatal("request changed order status before approval")
	}
}
