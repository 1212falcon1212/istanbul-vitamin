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

func TestLocalBankTransferOrderCreation(t *testing.T) {
	if os.Getenv("IV_LOCAL_ORDER_TEST") != "1" {
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
	var product models.Product
	check(tx.Where("stock >= ?", 2).First(&product).Error)
	user := models.User{Email: fmt.Sprintf("order-check-%d@example.test", time.Now().UnixNano()), PasswordHash: "test-only", FirstName: "Test", LastName: "Order", IsActive: true}
	check(tx.Create(&user).Error)
	for i := 0; i < 2; i++ {
		cart := models.Cart{UserID: &user.ID}
		check(tx.Create(&cart).Error)
		check(tx.Create(&models.CartItem{CartID: cart.ID, ProductID: product.ID, Quantity: 1}).Error)
		order := models.Order{UserID: &user.ID, PaymentMethod: "bank_transfer", ShippingFirstName: "Test", ShippingLastName: "Order"}
		check(NewOrderService(tx).Create(&order, cart.ID))
		if order.Status != "pending" || order.PaymentID != "" {
			t.Fatal("transfer order must remain unpaid and pending")
		}
		var count int64
		check(tx.Model(&models.Order{}).Where("id = ? AND aras_integration_code IS NULL", order.ID).Count(&count).Error)
		if count != 1 {
			t.Fatal("missing cargo code must be NULL")
		}
		check(tx.Model(&models.CartItem{}).Where("cart_id = ?", cart.ID).Count(&count).Error)
		if count != 0 {
			t.Fatal("ordered cart was not cleared")
		}
	}
}
