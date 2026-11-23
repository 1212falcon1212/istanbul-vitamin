package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
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

func TestLocalPayTRDirect(t *testing.T) {
	if os.Getenv("IV_LOCAL_PAYTR_TEST") != "1" {
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

	check(tx.Where("`key` LIKE ?", "paytr.%").Delete(&models.Setting{}).Error)
	svc := NewPaymentService(tx, &config.Config{AppEnv: "production", FrontendURL: "https://example.test", PayTRMerchantID: "123", PayTRMerchantKey: "fixtureKey", PayTRMerchantSalt: "fixtureSalt"})
	user := models.User{Email: "paytr-fixture@example.test", PasswordHash: "fixture", IsActive: true}
	check(tx.Create(&user).Error)
	sign := func(v string) string {
		m := hmac.New(sha256.New, []byte("fixtureKey"))
		m.Write([]byte(v))
		return base64.StdEncoding.EncodeToString(m.Sum(nil))
	}
	for _, testCase := range []string{"paid", "failed", "test"} {
		order := models.Order{OrderNumber: fmt.Sprintf("Q%d", time.Now().UnixNano()), UserID: &user.ID, PaymentMethod: "credit_card", Status: "pending", Total: 12.34}
		check(tx.Create(&order).Error)
		if testCase == "test" {
			check(tx.Create(&models.Setting{Key: "paytr.test_mode", Value: "true", Group: "paytr"}).Error)
		}
		res, err := svc.StartPayment(order.ID, CardPaymentData{UserIP: "192.0.2.10", LastFour: "1234"})
		check(err)
		f := res.Fields
		oid := f["merchant_oid"]
		if res.Status != "direct" || f["payment_amount"] != "12.34" || f["paytr_token"] != sign("123192.0.2.10"+oid+user.Email+"12.34card0TL"+f["test_mode"]+"0fixtureSalt") {
			t.Fatal("incorrect direct form signature")
		}
		status, amount := "success", "1234"
		if testCase == "failed" {
			status, amount = "failed", "0"
		}
		cb := map[string]string{"merchant_oid": oid, "status": status, "total_amount": amount, "hash": sign(oid + "fixtureSalt" + status + amount)}
		check(svc.HandleCallback(cb))
		check(svc.HandleCallback(cb))
		check(tx.First(&order, order.ID).Error)
		var count int64
		check(tx.Model(&models.OrderStatusHistory{}).Where("order_id=?", order.ID).Count(&count).Error)
		if order.PaymentStatus != testCase || count != 1 || (testCase == "paid" && order.PaymentID != oid) || (testCase == "failed" && order.Status != "cancelled") {
			t.Fatal("incorrect callback or replay", testCase)
		}
	}
}
