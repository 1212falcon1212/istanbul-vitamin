package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	AppPort string
	SiteURL string

	// JWT
	JWTSecret string
	JWTExpiry string

	// MySQL
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// Meilisearch
	MeilisearchHost string
	MeilisearchKey  string

	// PayTR
	PayTRMerchantID   string
	PayTRMerchantKey  string
	PayTRMerchantSalt string
	PayTRBaseURL      string

	// Trendyol
	TrendyolSupplierID string
	TrendyolAPIKey     string
	TrendyolAPISecret  string
	TrendyolBaseURL    string

	// Hepsiburada
	HBMerchantID string
	HBUsername   string
	HBPassword   string
	HBBaseURL    string

	// BizimHesap
	BizimHesapAPIKey  string
	BizimHesapBaseURL string

	// SMTP
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	// General
	FrontendURL   string
	UploadDir     string
	MaxUploadSize int64
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "5"))
	maxUpload, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "10485760"), 10, 64)

	appEnv := getEnv("APP_ENV", "development")
	jwtSecret := getEnv("JWT_SECRET", "change-me-in-production")

	// SITE_URL is the public origin used in transactional email links.
	// Falls back to FRONTEND_URL because production deploys only set the latter.
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")

	// Prod'da zayıf/varsayılan JWT secret → fail-fast
	if appEnv == "production" {
		if jwtSecret == "" || jwtSecret == "change-me-in-production" || len(jwtSecret) < 32 {
			log.Fatal("GÜVENLİK: JWT_SECRET production'da en az 32 karakter, varsayılan değil olmalı. " +
				"`openssl rand -base64 48` ile üret ve .env'e ekle.")
		}
	}

	return &Config{
		AppEnv:  appEnv,
		AppPort: getEnv("APP_PORT", "8080"),
		SiteURL: getEnv("SITE_URL", frontendURL),

		JWTSecret: jwtSecret,
		JWTExpiry: getEnv("JWT_EXPIRY", "24h"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBName:     getEnv("DB_NAME", "ecommerce"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       redisDB,

		MeilisearchHost: getEnv("MEILISEARCH_HOST", "http://localhost:7700"),
		MeilisearchKey:  getEnv("MEILISEARCH_KEY", ""),

		PayTRMerchantID:   getEnv("PAYTR_MERCHANT_ID", ""),
		PayTRMerchantKey:  getEnv("PAYTR_MERCHANT_KEY", ""),
		PayTRMerchantSalt: getEnv("PAYTR_MERCHANT_SALT", ""),
		PayTRBaseURL:      getEnv("PAYTR_BASE_URL", "https://www.paytr.com"),

		TrendyolSupplierID: getEnv("TRENDYOL_SUPPLIER_ID", ""),
		TrendyolAPIKey:     getEnv("TRENDYOL_API_KEY", ""),
		TrendyolAPISecret:  getEnv("TRENDYOL_API_SECRET", ""),
		TrendyolBaseURL:    getEnv("TRENDYOL_BASE_URL", "https://api.trendyol.com/sapigw"),

		HBMerchantID: getEnv("HB_MERCHANT_ID", ""),
		HBUsername:   getEnv("HB_USERNAME", ""),
		HBPassword:   getEnv("HB_PASSWORD", ""),
		HBBaseURL:    getEnv("HB_BASE_URL", "https://mpop-sit.hepsiburada.com"),

		BizimHesapAPIKey:  getEnv("BIZIMHESAP_API_KEY", ""),
		BizimHesapBaseURL: getEnv("BIZIMHESAP_BASE_URL", "https://api.bizimhesap.com"),

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),

		FrontendURL:   frontendURL,
		UploadDir:     getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSize: maxUpload,
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
