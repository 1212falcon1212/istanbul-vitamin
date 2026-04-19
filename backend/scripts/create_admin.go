//go:build ignore

// Run: go run scripts/create_admin.go <email> <password> [full_name]
// Example: go run scripts/create_admin.go admin@dermoeczane.com Admin123! "Süper Yönetici"

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 3 {
		log.Fatalf("usage: go run scripts/create_admin.go <email> <password> [full_name]")
	}
	email := os.Args[1]
	password := os.Args[2]
	fullName := "Admin"
	if len(os.Args) >= 4 {
		fullName = os.Args[3]
	}

	_ = godotenv.Load(".env")

	host := env("DB_HOST", "localhost")
	port := env("DB_PORT", "3306")
	name := env("DB_NAME", "ecommerce")
	user := env("DB_USER", "root")
	pass := env("DB_PASSWORD", "")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		user, pass, host, port, name)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt: %v", err)
	}

	res, err := db.Exec(`
		INSERT INTO admins (email, password_hash, full_name, role, is_active)
		VALUES (?, ?, ?, 'super_admin', 1)
		ON DUPLICATE KEY UPDATE
			password_hash = VALUES(password_hash),
			full_name = VALUES(full_name),
			role = 'super_admin',
			is_active = 1`,
		email, string(hash), fullName)
	if err != nil {
		log.Fatalf("insert: %v", err)
	}

	id, _ := res.LastInsertId()
	affected, _ := res.RowsAffected()
	action := "created"
	if affected == 2 {
		action = "updated"
	}
	fmt.Printf("✓ admin %s (id=%d): email=%s role=super_admin\n", action, id, email)
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
