package handlers

import (
	"bytes"
	"fmt"
	mysqldsn "github.com/go-sql-driver/mysql"
	"github.com/gofiber/fiber/v2"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func TestLocalReceiptAccessAndApproval(t *testing.T) {
	if os.Getenv("IV_LOCAL_RECEIPT_TEST") != "1" {
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
	oldDB := database.DB
	database.DB = tx
	defer func() { database.DB = oldDB }()
	user := models.User{Email: fmt.Sprintf("receipt-%d@example.test", time.Now().UnixNano()), PasswordHash: "test", FirstName: "Test", LastName: "Receipt", IsActive: true}
	check(tx.Create(&user).Error)
	order := models.Order{OrderNumber: fmt.Sprintf("R%d", time.Now().UnixNano()), UserID: &user.ID, PaymentMethod: "bank_transfer", Status: "pending", Total: 10}
	check(tx.Create(&order).Error)
	uid := user.ID
	app := fiber.New(fiber.Config{BodyLimit: 6 * 1024 * 1024})
	app.Use(func(c *fiber.Ctx) error { c.Locals("userID", uid); return c.Next() })
	h := &OrderHandler{}
	app.Post("/orders/:id/receipt", h.UploadReceipt)
	app.Get("/orders/:id/receipt", h.DownloadReceipt)
	app.Post("/admin/orders/:id/confirm-transfer", h.ConfirmTransfer)
	path := fmt.Sprintf("/orders/%d/receipt", order.ID)
	upload := func(data []byte, want int) {
		t.Helper()
		var b bytes.Buffer
		w := multipart.NewWriter(&b)
		f, e := w.CreateFormFile("file", "receipt.pdf")
		check(e)
		_, e = f.Write(data)
		check(e)
		check(w.Close())
		req := httptest.NewRequest("POST", path, &b)
		req.Header.Set("Content-Type", w.FormDataContentType())
		res, e := app.Test(req, -1)
		check(e)
		defer res.Body.Close()
		if res.StatusCode != want {
			body, _ := io.ReadAll(res.Body)
			t.Fatalf("upload %d: %s", res.StatusCode, body)
		}
	}
	pdf := []byte("%PDF-1.4\nreceipt test")
	uid = user.ID + 100000
	upload(pdf, 404)
	uid = user.ID
	upload([]byte("<script>not a receipt</script>"), 400)
	upload(pdf, 200)
	check(tx.First(&order, order.ID).Error)
	if order.PaymentStatus != "review" || order.PaymentConfirmedAt != nil {
		t.Fatal("receipt incorrectly treated as paid")
	}
	uid = user.ID + 100000
	res, e := app.Test(httptest.NewRequest("GET", path, nil))
	check(e)
	res.Body.Close()
	if res.StatusCode != 404 {
		t.Fatal("another user accessed receipt")
	}
	uid = user.ID
	res, e = app.Test(httptest.NewRequest("GET", path, nil))
	check(e)
	body, e := io.ReadAll(res.Body)
	check(e)
	res.Body.Close()
	if res.StatusCode != 200 || !bytes.Equal(body, pdf) {
		t.Fatal("receipt download failed")
	}
	for i := 0; i < 2; i++ {
		res, e = app.Test(httptest.NewRequest("POST", fmt.Sprintf("/admin/orders/%d/confirm-transfer", order.ID), nil))
		check(e)
		res.Body.Close()
		if res.StatusCode != 200 {
			t.Fatal("confirmation failed")
		}
	}
	check(tx.First(&order, order.ID).Error)
	if order.PaymentStatus != "paid" || order.PaymentConfirmedAt == nil {
		t.Fatal("confirmation not persisted")
	}
	var count int64
	check(tx.Model(&models.OrderStatusHistory{}).Where("order_id = ?", order.ID).Count(&count).Error)
	if count != 1 {
		t.Fatal("duplicate approval history")
	}
	upload(pdf, 400)
}
