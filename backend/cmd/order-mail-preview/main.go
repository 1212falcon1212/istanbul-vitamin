// Render an existing local order without sending email or changing records.
package main

import (
	"fmt"
	mysqldsn "github.com/go-sql-driver/mysql"
	"github.com/istanbulvitamin/backend/internal/integrations"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"os"
	"path/filepath"
)

func main() {
	e, err := godotenv.Read(".env")
	if err != nil {
		panic(err)
	}
	if e["DB_HOST"] != "127.0.0.1" || e["DB_PORT"] != "33079" || e["DB_NAME"] != "istanbul_vitamin_local" {
		panic("local database required")
	}
	dsn := mysqldsn.Config{User: e["DB_USER"], Passwd: e["DB_PASSWORD"], Net: "tcp", Addr: "127.0.0.1:33079", DBName: e["DB_NAME"], ParseTime: true, AllowNativePasswords: true}
	db, err := gorm.Open(mysql.Open(dsn.FormatDSN()), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	var order models.Order
	if err = db.Preload("Items").Where("order_number = ?", "DE-20260102").First(&order).Error; err != nil {
		panic(err)
	}
	data := integrations.OrderMailFromOrder(order, "http://localhost:3000")
	_, markup := integrations.OrderEventEmail("order_received", data)
	file := "../output/notification-templates/real-order-detail.html"
	os.MkdirAll(filepath.Dir(file), 0755)
	if err = os.WriteFile(file, []byte(markup), 0600); err != nil {
		panic(err)
	}
	fmt.Printf("Preview: %s; actual order %s, items: %d\n", file, order.OrderNumber, len(data.Items))
	for _, item := range data.Items {
		fmt.Println("Image:", item.Image)
	}
}
