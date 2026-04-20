package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/istanbulvitamin/backend/internal/config"
	"github.com/istanbulvitamin/backend/internal/database"
	"github.com/istanbulvitamin/backend/internal/handlers"
	"github.com/istanbulvitamin/backend/internal/middleware"
	"github.com/istanbulvitamin/backend/internal/models"
	"github.com/istanbulvitamin/backend/internal/scheduler"
)

func main() {
	// Load config
	cfg := config.Load()

	// Connect databases
	db := database.ConnectMySQL(cfg)
	rdb := database.ConnectRedis(cfg)
	_ = rdb

	// Auto-migrate models — prod'da kapalı (schema drift'i engellemek için)
	if cfg.AppEnv != "production" {
		if err := models.AutoMigrate(db); err != nil {
			log.Fatalf("Migration hatası: %v", err)
		}
	} else {
		log.Println("Production modunda AutoMigrate atlandı. Migration dosyalarını elle uygula.")
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "İstanbul Vitamin API",
		BodyLimit:    int(cfg.MaxUploadSize),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(helmet.New(helmet.Config{
		XSSProtection:             "1; mode=block",
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "SAMEORIGIN",
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		CrossOriginEmbedderPolicy: "unsafe-none",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "cross-origin",
		PermissionPolicy:          "geolocation=(), microphone=(), camera=()",
		// HSTS sadece prod'da (dev localhost'ta zararlı)
		HSTSMaxAge:            hstsMaxAge(cfg.AppEnv),
		HSTSExcludeSubdomains: cfg.AppEnv != "production",
		HSTSPreloadEnabled:    cfg.AppEnv == "production",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.FrontendURL,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Session-ID, X-CSRF-Token",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// CSRF: Origin/Referer doğrulaması (cookie auth için gerekli)
	allowedOrigins := strings.Split(cfg.FrontendURL, ",")
	app.Use(middleware.OriginCheck(allowedOrigins))

	// Static files (uploads)
	app.Static("/uploads", cfg.UploadDir)

	// Setup routes
	setupRoutes(app, cfg, db)

	// Background scheduler (cart cleanup vb.)
	// NOT: Bizimhesap retry cron'u manuel mod için nil geçilerek kapatıldı.
	sched, schedErr := scheduler.Start(nil)
	if schedErr != nil {
		log.Printf("Scheduler başlatılamadı: %v", schedErr)
	}
	defer func() {
		if sched != nil {
			_ = sched.Shutdown()
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := app.Listen(fmt.Sprintf(":%s", cfg.AppPort)); err != nil {
			log.Fatalf("Sunucu başlatma hatası: %v", err)
		}
	}()

	log.Printf("İstanbul Vitamin API başlatıldı — port %s", cfg.AppPort)

	<-quit
	log.Println("Sunucu kapatılıyor...")
	if err := app.Shutdown(); err != nil {
		log.Printf("Sunucu kapatma hatası: %v", err)
	}
}

func setupRoutes(app *fiber.App, cfg *config.Config, db interface{}) {
	api := app.Group("/api/v1")

	// Health check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "İstanbul Vitamin API çalışıyor",
		})
	})

	// Auth routes — hassas endpoint'ler rate-limited
	auth := api.Group("/auth")
	authHandler := handlers.NewAuthHandler(cfg)

	// IP başına 5 istek / dakika (login, register, reset)
	authLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "Çok fazla istek. Lütfen birkaç dakika sonra tekrar deneyin.",
			})
		},
	})

	// Şifre sıfırlama isteği — saatte 3, spam/enumeration'ı engelle
	forgotLimiter := limiter.New(limiter.Config{
		Max:        3,
		Expiration: 1 * time.Hour,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "Çok fazla şifre sıfırlama isteği. Lütfen 1 saat sonra tekrar deneyin.",
			})
		},
	})

	auth.Post("/register", authLimiter, authHandler.Register)
	auth.Post("/login", authLimiter, authHandler.Login)
	auth.Post("/admin/login", authLimiter, authHandler.AdminLogin)
	auth.Post("/refresh", authHandler.RefreshToken)
	auth.Post("/forgot-password", forgotLimiter, authHandler.ForgotPassword)
	auth.Post("/reset-password", authLimiter, authHandler.ResetPassword)
	auth.Post("/verify-email", authHandler.VerifyEmail)
	auth.Get("/verify-email", authHandler.VerifyEmail)

	// Auth middleware (used inline for protected routes)
	userMiddleware := middleware.NewAuthMiddleware(cfg)
	requireAuth := userMiddleware.Authenticate

	// User (protected)
	api.Get("/users/me", requireAuth, authHandler.GetMe)
	api.Put("/users/me", requireAuth, authHandler.UpdateProfile)
	api.Put("/users/me/password", requireAuth, authHandler.ChangePassword)
	api.Post("/users/me/resend-verification", requireAuth, authHandler.ResendVerification)
	auth.Post("/logout", requireAuth, authHandler.Logout)

	// Products (public)
	productHandler := handlers.NewProductHandler()
	api.Get("/products", productHandler.List)
	api.Get("/products/featured", productHandler.Featured)
	api.Get("/products/:slug", productHandler.GetBySlug)

	// Categories (public)
	categoryHandler := handlers.NewCategoryHandler()
	api.Get("/categories", categoryHandler.List)
	api.Get("/categories/tree", categoryHandler.Tree)
	api.Get("/categories/showcase", categoryHandler.Showcase)
	api.Get("/categories/:slug", categoryHandler.GetBySlug)

	// Brands (public)
	brandHandler := handlers.NewBrandHandler()
	api.Get("/brands", brandHandler.List)
	// Spotlight must be registered before /:slug to avoid route conflict
	brandSpotlightHandler := handlers.NewBrandSpotlightHandler()
	api.Get("/brands/spotlight", brandSpotlightHandler.GetSpotlight)
	api.Get("/brands/:slug", brandHandler.GetBySlug)

	// Skin concerns (public, static list with real DB counts)
	skinConcernsHandler := handlers.NewSkinConcernsHandler()
	api.Get("/skin-concerns", skinConcernsHandler.List)
	api.Get("/skin-concerns/:slug", skinConcernsHandler.GetBySlug)

	// Campaigns (public)
	campaignHandler := handlers.NewCampaignHandler()
	api.Get("/campaigns", campaignHandler.List)
	api.Get("/campaigns/:slug", campaignHandler.GetBySlug)

	// Pages (public)
	pageHandler := handlers.NewPageHandler()
	api.Get("/pages/:slug", pageHandler.GetBySlug)

	// Sliders (public)
	sliderHandler := handlers.NewSliderHandler()
	api.Get("/sliders", sliderHandler.List)

	// Banners (public)
	bannerHandler := handlers.NewBannerHandler()
	api.Get("/banners", bannerHandler.List)
	api.Get("/banners/:position", bannerHandler.GetByPosition)

	// Settings (public)
	settingHandler := handlers.NewSettingHandler()
	api.Get("/settings", settingHandler.GetAll)
	api.Get("/settings/:group", settingHandler.GetByGroup)

	// Search (public)
	searchHandler := handlers.NewSearchHandler()
	api.Get("/search", searchHandler.Search)
	api.Get("/search/autocomplete", searchHandler.Autocomplete)

	// Cart
	cartHandler := handlers.NewCartHandler()
	api.Get("/cart", cartHandler.Get)
	api.Post("/cart/items", cartHandler.AddItem)
	api.Put("/cart/items/:id", cartHandler.UpdateItem)
	api.Delete("/cart/items/:id", cartHandler.RemoveItem)
	api.Post("/cart/coupon", cartHandler.ApplyCoupon)
	api.Delete("/cart/coupon", cartHandler.RemoveCoupon)
	api.Post("/cart/merge", requireAuth, cartHandler.Merge)

	// Favorites (protected)
	favoriteHandler := handlers.NewFavoriteHandler()
	api.Get("/favorites", requireAuth, favoriteHandler.List)
	api.Post("/favorites", requireAuth, favoriteHandler.Add)
	api.Delete("/favorites/:productId", requireAuth, favoriteHandler.Remove)

	// Addresses (protected)
	addressHandler := handlers.NewAddressHandler()
	api.Get("/addresses", requireAuth, addressHandler.List)
	api.Post("/addresses", requireAuth, addressHandler.Create)
	api.Put("/addresses/:id", requireAuth, addressHandler.Update)
	api.Delete("/addresses/:id", requireAuth, addressHandler.Delete)

	// Saved Cards (protected)
	cardHandler := handlers.NewCardHandler()
	api.Get("/cards", requireAuth, cardHandler.List)
	api.Delete("/cards/:id", requireAuth, cardHandler.Delete)

	// Orders (protected)
	orderHandler := handlers.NewOrderHandler()
	// NOT: Shipped geçişindeki otomatik Bizimhesap tetikleyicisi şimdilik kapalı —
	// fatura admin panelinden "Fatura Kes" butonu ile manuel tetiklenecek.
	// Gerçek akış doğrulandıktan sonra aşağıdaki satır aktifleştirilecek:
	// orderHandler.Service().SetInvoiceTrigger(func(orderID uint64) {
	// 	bizimhesap.GenerateInvoiceForOrder(database.DB, settingHandler.Service(), orderID)
	// })
	api.Get("/orders", requireAuth, orderHandler.List)
	api.Get("/orders/:id", requireAuth, orderHandler.GetByID)
	api.Post("/orders", requireAuth, orderHandler.Create)

	// Payment (protected)
	paymentHandler := handlers.NewPaymentHandler(cfg)
	api.Post("/payments/start", requireAuth, paymentHandler.StartPayment)
	api.Get("/payments/installments", requireAuth, paymentHandler.GetInstallments)
	api.Post("/webhooks/paytr", paymentHandler.PayTRCallback)

	// Reviews (public + auth)
	reviewHandler := handlers.NewReviewHandler()
	api.Get("/products/:productID/reviews", reviewHandler.List)
	api.Post("/reviews", requireAuth, reviewHandler.Create)
	api.Delete("/reviews/:id", requireAuth, reviewHandler.Delete)

	// Newsletter (public)
	newsletterHandler := handlers.NewNewsletterHandler()
	api.Post("/newsletter/subscribe", newsletterHandler.Subscribe)
	api.Get("/newsletter/unsubscribe", newsletterHandler.Unsubscribe)

	// Admin routes
	// Admin paneli ayrı cookie (`admin_token`) üzerinden çalışır; user oturumu
	// ile aynı tarayıcıda çakışmaz. AdminAuthenticate hem token parse hem rol kontrolü yapar.
	_ = middleware.NewAdminMiddleware(cfg) // legacy — artık RequireAdmin kullanılmıyor
	requireAdminAuth := userMiddleware.AdminAuthenticate
	admin := api.Group("/admin", requireAdminAuth)

	// Admin - Session
	admin.Get("/users/me", authHandler.AdminGetMe)
	admin.Post("/logout", authHandler.Logout)

	// Admin - Products
	admin.Get("/products", productHandler.AdminList)
	admin.Get("/products/:id", productHandler.AdminGetByID)
	admin.Post("/products", productHandler.Create)
	admin.Put("/products/:id", productHandler.Update)
	admin.Delete("/products/:id", productHandler.Delete)

	// Admin - Categories
	admin.Get("/categories", categoryHandler.AdminList)
	admin.Post("/categories", categoryHandler.Create)
	admin.Put("/categories/:id", categoryHandler.Update)
	admin.Delete("/categories/:id", categoryHandler.Delete)

	// Admin - Brands
	admin.Get("/brands", brandHandler.AdminList)
	admin.Post("/brands", brandHandler.Create)
	admin.Put("/brands/:id", brandHandler.Update)
	admin.Delete("/brands/:id", brandHandler.Delete)

	// Admin - Uploads (görsel)
	uploadHandler := handlers.NewUploadHandler(cfg)
	admin.Post("/uploads/image", uploadHandler.UploadImage)

	// Admin - Variations
	variationHandler := handlers.NewVariationHandler()
	admin.Get("/variations/types", variationHandler.ListTypes)
	admin.Post("/variations/types", variationHandler.CreateType)
	admin.Put("/variations/types/:id", variationHandler.UpdateType)
	admin.Delete("/variations/types/:id", variationHandler.DeleteType)
	admin.Post("/variations/values", variationHandler.CreateValue)
	admin.Put("/variations/values/:id", variationHandler.UpdateValue)
	admin.Delete("/variations/values/:id", variationHandler.DeleteValue)

	// Public - aktif varyasyonlar (ürün filtreleri için)
	api.Get("/variations", variationHandler.PublicListTypes)

	// Admin - Orders
	admin.Get("/orders", orderHandler.AdminList)
	admin.Get("/orders/:id", orderHandler.AdminGetByID)
	admin.Put("/orders/:id/status", orderHandler.UpdateStatus)
	admin.Post("/orders/:id/invoice/regenerate", orderHandler.RegenerateInvoice)

	// Admin - Campaigns
	admin.Get("/campaigns", campaignHandler.AdminList)
	admin.Post("/campaigns", campaignHandler.Create)
	admin.Put("/campaigns/:id", campaignHandler.Update)
	admin.Delete("/campaigns/:id", campaignHandler.Delete)

	// Admin - Coupons
	couponHandler := handlers.NewCouponHandler()
	admin.Get("/coupons", couponHandler.List)
	admin.Post("/coupons", couponHandler.Create)
	admin.Put("/coupons/:id", couponHandler.Update)
	admin.Delete("/coupons/:id", couponHandler.Delete)

	// Admin - Pages
	admin.Get("/pages", pageHandler.AdminList)
	admin.Post("/pages", pageHandler.Create)
	admin.Put("/pages/:id", pageHandler.Update)
	admin.Delete("/pages/:id", pageHandler.Delete)

	// Admin - Sliders
	admin.Get("/sliders", sliderHandler.AdminList)
	admin.Post("/sliders", sliderHandler.Create)
	admin.Put("/sliders/:id", sliderHandler.Update)
	admin.Delete("/sliders/:id", sliderHandler.Delete)

	// Admin - Banners
	admin.Get("/banners", bannerHandler.AdminList)
	admin.Post("/banners", bannerHandler.Create)
	admin.Put("/banners/:id", bannerHandler.Update)
	admin.Delete("/banners/:id", bannerHandler.Delete)

	// Admin - Reviews (moderation)
	admin.Get("/reviews", reviewHandler.AdminList)
	admin.Patch("/reviews/:id/approval", reviewHandler.SetApproval)
	admin.Delete("/reviews/:id", reviewHandler.AdminDelete)

	// Admin - Settings
	admin.Put("/settings", settingHandler.Update)
	admin.Post("/settings/bizimhesap/test", settingHandler.TestBizimhesap)

	// Admin - Customers
	customerHandler := handlers.NewCustomerHandler()
	admin.Get("/customers", customerHandler.List)
	admin.Get("/customers/:id", customerHandler.GetByID)

	// Admin - Dashboard
	dashboardHandler := handlers.NewDashboardHandler()
	admin.Get("/dashboard/stats", dashboardHandler.Stats)
	admin.Get("/dashboard/chart", dashboardHandler.SalesChart)

	// Admin - Marketplace
	marketplaceHandler := handlers.NewMarketplaceHandler()
	admin.Get("/marketplace/sync-logs", marketplaceHandler.SyncLogs)
	admin.Post("/marketplace/trendyol/sync", marketplaceHandler.TriggerTrendyolSync)
	admin.Post("/marketplace/hepsiburada/sync", marketplaceHandler.TriggerHBSync)

	// Admin - Import
	importHandler := handlers.NewImportHandler()
	admin.Post("/import/products", importHandler.ImportProducts)
	admin.Post("/import/preview", importHandler.Preview)
}

// hstsMaxAge prod'da 1 yıl, aksi halde 0 (localhost'ta strict transport zararlı).
func hstsMaxAge(env string) int {
	if env == "production" {
		return 31536000
	}
	return 0
}
