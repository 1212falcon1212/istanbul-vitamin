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

func TestLocalAddressUpdate(t *testing.T) {
	if os.Getenv("IV_LOCAL_ADDRESS_TEST") != "1" {
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
	svc := NewAddressService(tx)
	initial := models.Address{UserID: user.ID, Title: "Ev", FirstName: "Test", LastName: "Kullanıcı", Phone: "5550000000", City: "İstanbul", District: "Fatih", AddressLine: "İlk adres", IsDefault: true}
	check(svc.Create(&initial))
	createdAt := initial.CreatedAt
	edited := models.Address{ID: initial.ID, UserID: user.ID, Title: "İş", FirstName: "Test", LastName: "Kullanıcı", Phone: "5550000000", City: "İstanbul", District: "Fatih", AddressLine: "Yeni adres"}
	check(svc.Update(&edited))
	var stored models.Address
	check(tx.First(&stored, initial.ID).Error)
	if stored.AddressLine != "Yeni adres" || stored.IsDefault || !stored.CreatedAt.Equal(createdAt) {
		t.Fatal("address edit or creation timestamp not preserved")
	}
	edited.UserID++
	if svc.Update(&edited) == nil {
		t.Fatal("accepted foreign address")
	}
}
