# DermoEczane E-Ticaret Platformu — Master Prompt / CLAUDE.md

## Proje Özeti

Dermoeczane ürünleri satan bir e-ticaret platformu. Yaklaşık 5000 ürün barındıracak. Ürünler JSON feed ile beslenecek. Trendyol ve Hepsiburada marketplace'lerine ürün push, sipariş senkronizasyonu ve stok/fiyat güncelleme yapılacak. BizimHesap ERP ile otomatik fatura kesilecek. PayTR Direkt API ile ödeme alınacak.

**Site tamamen dinamik olacak. Hiçbir hardcoded içerik olmayacak. Tüm metinler, banner'lar, sayfalar, slider'lar, kampanyalar admin panelinden yönetilecek.**

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Go (Golang) — Fiber framework |
| **Frontend** | Next.js 16 (App Router, SSR + SSG) |
| **Veritabanı** | MySQL 8 |
| **ORM** | GORM |
| **Cache** | Redis |
| **Arama** | Meilisearch |
| **Auth** | golang-jwt (JWT tabanlı) |
| **Task Scheduling** | gocron |
| **HTTP Client** | resty |
| **Deployment** | GitHub + manuel deploy (Docker kullanılmayacak) |
| **Process Manager** | systemd (Go binary) + PM2 (Next.js) |
| **Web Server** | Nginx (CloudPanel üzerinden) |
| **Server** | Hostinger KVM 4 VPS — 4 vCPU, 16 GB RAM, 200 GB NVMe |

---

## Proje Mimarisi

```
nginx (CloudPanel)
│
├── example.com/* → Next.js (:3000) — SSR/SSG Frontend
│   ├── Storefront (müşteri yüzü)
│   ├── /yonetim/* → Admin Panel (aynı Next.js app içinde, korumalı route)
│   └── PWA Service Worker
│
└── example.com/api/* → Go Backend (:8080) — reverse proxy
    ├── /api/v1/auth/*        → Kimlik doğrulama
    ├── /api/v1/products/*    → Ürün CRUD
    ├── /api/v1/categories/*  → Kategori CRUD
    ├── /api/v1/orders/*      → Sipariş yönetimi
    ├── /api/v1/cart/*        → Sepet işlemleri
    ├── /api/v1/users/*       → Kullanıcı işlemleri
    ├── /api/v1/payments/*    → PayTR entegrasyonu
    ├── /api/v1/admin/*       → Admin API'leri
    ├── /api/v1/pages/*       → Dinamik sayfa içerikleri
    ├── /api/v1/settings/*    → Site ayarları
    ├── /api/v1/brands/*      → Marka CRUD
    ├── /api/v1/campaigns/*   → Kampanya yönetimi
    ├── /api/v1/favorites/*   → Favori işlemleri
    ├── /api/v1/addresses/*   → Adres yönetimi
    ├── /api/v1/cards/*       → Kayıtlı kart yönetimi
    └── /api/v1/webhooks/*    → PayTR callback, marketplace bildirimleri

Entegrasyon Servisleri (Go içinde, ayrı goroutine'ler):
├── Trendyol Sync Service
├── Hepsiburada Sync Service
├── BizimHesap Fatura Service
└── JSON Ürün Feed Import Service
```

---

## Veritabanı Şeması (MySQL)

### Kullanıcılar & Auth

```sql
-- Müşteriler
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin kullanıcıları
CREATE TABLE admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role ENUM('super_admin', 'admin', 'editor') DEFAULT 'editor',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Kullanıcı adresleri
CREATE TABLE addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(100) NOT NULL, -- Ev, İş vb.
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL, -- İl
    district VARCHAR(100) NOT NULL, -- İlçe
    neighborhood VARCHAR(150), -- Mahalle
    address_line TEXT NOT NULL, -- Açık adres
    postal_code VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Kayıtlı kartlar (PayTR card token)
CREATE TABLE saved_cards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    card_label VARCHAR(100), -- "İş Bankası Visa"
    card_last_four VARCHAR(4) NOT NULL,
    card_token VARCHAR(255) NOT NULL, -- PayTR kart saklama token
    card_brand VARCHAR(50), -- Visa, Mastercard
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Kategoriler (4 Seviye Derinlik)

```sql
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL, -- NULL = kök kategori
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(250) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(500),
    icon_url VARCHAR(500),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    -- Denormalize: Hızlı sorgu için
    depth TINYINT UNSIGNED DEFAULT 0, -- 0: root, 1: child, 2: grandchild, 3: great-grandchild
    path VARCHAR(500), -- "1/5/23/101" — breadcrumb için
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id),
    INDEX idx_slug (slug),
    INDEX idx_depth (depth)
);

-- Örnek veri:
-- id:1 parent:NULL name:"Makyaj" slug:"makyaj" depth:0 path:"1"
-- id:5 parent:1 name:"Yüz Kremleri" slug:"yuz-kremleri" depth:1 path:"1/5"
-- id:23 parent:5 name:"Sıvı Yüz Kremi" slug:"sivi-yuz-kremi" depth:2 path:"1/5/23"
-- id:101 parent:23 name:"Peeling" slug:"peeling" depth:3 path:"1/5/23/101"
-- URL: /makyaj/yuz-kremleri/sivi-yuz-kremi/peeling
```

### Markalar

```sql
CREATE TABLE brands (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(250) NOT NULL UNIQUE,
    logo_url VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Ürünler

```sql
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT UNSIGNED,
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(50),
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(550) NOT NULL UNIQUE,
    short_description TEXT,
    description LONGTEXT,
    price DECIMAL(10,2) NOT NULL, -- Satış fiyatı
    compare_price DECIMAL(10,2), -- Kıyaslama / liste fiyatı (üstü çizili)
    cost_price DECIMAL(10,2), -- Maliyet fiyatı (admin görür)
    currency VARCHAR(3) DEFAULT 'TRY',
    stock INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    weight DECIMAL(8,2), -- gram
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE, -- Öne çıkan ürün
    is_campaign BOOLEAN DEFAULT FALSE, -- Kampanyalı ürün
    tax_rate DECIMAL(5,2) DEFAULT 20.00, -- KDV oranı
    -- Marketplace eşleştirme
    trendyol_id VARCHAR(100),
    trendyol_barcode VARCHAR(100),
    hepsiburada_id VARCHAR(100),
    hepsiburada_sku VARCHAR(100),
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    -- JSON ürün feed kaynak ID
    feed_source_id VARCHAR(100),
    -- İstatistik
    view_count INT UNSIGNED DEFAULT 0,
    sold_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_sku (sku),
    INDEX idx_active_featured (is_active, is_featured),
    INDEX idx_brand (brand_id),
    INDEX idx_price (price),
    FULLTEXT idx_search (name, short_description)
);

-- Ürün-Kategori ilişkisi (many-to-many)
CREATE TABLE product_categories (
    product_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE, -- Ana kategori (breadcrumb için)
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Ürün görselleri
CREATE TABLE product_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
);

-- Ürün varyantları / seçenekleri (opsiyonel: ml, adet vb.)
CREATE TABLE product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL, -- "50 ml", "100 ml"
    sku VARCHAR(100),
    barcode VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Ürün etiketleri
CREATE TABLE product_tags (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    tag VARCHAR(100) NOT NULL, -- "yeni", "çok satan", "indirimli"
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_tag (tag)
);
```

### Siparişler

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL UNIQUE, -- "DE-20260001"
    user_id BIGINT UNSIGNED,
    source ENUM('web', 'trendyol', 'hepsiburada') DEFAULT 'web',
    marketplace_order_id VARCHAR(100), -- Trendyol/HB sipariş no
    status ENUM(
        'pending',          -- Ödeme bekleniyor
        'paid',             -- Ödeme alındı
        'preparing',        -- Hazırlanıyor
        'shipped',          -- Kargoya verildi
        'delivered',        -- Teslim edildi
        'cancelled',        -- İptal edildi
        'refunded'          -- İade edildi
    ) DEFAULT 'pending',
    -- Fiyatlar
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    -- Kupon
    coupon_code VARCHAR(50),
    coupon_discount DECIMAL(10,2) DEFAULT 0,
    -- Teslimat bilgileri
    shipping_first_name VARCHAR(100),
    shipping_last_name VARCHAR(100),
    shipping_phone VARCHAR(20),
    shipping_city VARCHAR(100),
    shipping_district VARCHAR(100),
    shipping_address TEXT,
    shipping_postal_code VARCHAR(10),
    -- Fatura bilgileri
    billing_first_name VARCHAR(100),
    billing_last_name VARCHAR(100),
    billing_phone VARCHAR(20),
    billing_city VARCHAR(100),
    billing_district VARCHAR(100),
    billing_address TEXT,
    billing_tax_office VARCHAR(150), -- Kurumsal fatura
    billing_tax_number VARCHAR(20), -- VKN / TCKN
    billing_company_name VARCHAR(200),
    invoice_type ENUM('individual', 'corporate') DEFAULT 'individual',
    -- Kargo
    cargo_company VARCHAR(100),
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    -- Ödeme
    payment_method ENUM('credit_card', 'bank_transfer') DEFAULT 'credit_card',
    payment_id VARCHAR(100), -- PayTR merchant_oid
    -- Fatura
    bizimhesap_invoice_id VARCHAR(100),
    invoice_number VARCHAR(50),
    invoice_url VARCHAR(500),
    -- Notlar
    customer_note TEXT,
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order_number (order_number),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_source (source),
    INDEX idx_created (created_at)
);

-- Sipariş kalemleri
CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED,
    variant_id BIGINT UNSIGNED,
    product_name VARCHAR(500) NOT NULL, -- Snapshot
    product_sku VARCHAR(100),
    product_image VARCHAR(500),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Sipariş durum geçmişi
CREATE TABLE order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    note TEXT,
    changed_by VARCHAR(100), -- admin email veya "system"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### Sepet

```sql
CREATE TABLE carts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED, -- NULL = misafir
    session_id VARCHAR(100), -- Misafir sepeti
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
);

CREATE TABLE cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

### Favoriler

```sql
CREATE TABLE favorites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

### Kuponlar & Kampanyalar

```sql
CREATE TABLE coupons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2), -- Yüzde indirimlerde tavan
    usage_limit INT, -- Toplam kullanım limiti
    usage_count INT DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    banner_image VARCHAR(500),
    banner_image_mobile VARCHAR(500),
    discount_type ENUM('percentage', 'fixed'),
    discount_value DECIMAL(10,2),
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Kampanyaya dahil ürünler
CREATE TABLE campaign_products (
    campaign_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (campaign_id, product_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

### CMS — Dinamik Sayfalar & İçerikler

```sql
-- Sabit sayfalar (hakkımızda, iletişim, yasal sayfalar vb.)
CREATE TABLE pages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE, -- "hakkimizda", "iletisim", "kvkk"
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    is_active BOOLEAN DEFAULT TRUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Homepage slider
CREATE TABLE sliders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    image_url VARCHAR(500) NOT NULL,
    image_url_mobile VARCHAR(500),
    link_url VARCHAR(500),
    button_text VARCHAR(100),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Banner alanları (farklı pozisyonlar için)
CREATE TABLE banners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    position VARCHAR(50) NOT NULL, -- 'homepage_top', 'homepage_mid', 'category_sidebar'
    title VARCHAR(255),
    image_url VARCHAR(500) NOT NULL,
    image_url_mobile VARCHAR(500),
    link_url VARCHAR(500),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_position (position, is_active)
);

-- Site genel ayarları (key-value)
CREATE TABLE settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    `group` VARCHAR(50) DEFAULT 'general', -- 'general', 'contact', 'social', 'seo', 'shipping', 'payment'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Örnek settings verileri:
-- key: 'site_name', value: 'DermoEczane', group: 'general'
-- key: 'phone', value: '+90 212 xxx xx xx', group: 'contact'
-- key: 'email', value: 'info@example.com', group: 'contact'
-- key: 'address', value: '...', group: 'contact'
-- key: 'instagram', value: 'https://...', group: 'social'
-- key: 'min_free_shipping', value: '500', group: 'shipping'
-- key: 'default_cargo_fee', value: '39.90', group: 'shipping'
-- key: 'meta_title', value: '...', group: 'seo'
-- key: 'meta_description', value: '...', group: 'seo'
-- key: 'google_analytics_id', value: 'G-XXXXX', group: 'seo'
-- key: 'whatsapp_number', value: '+90...', group: 'contact'
```

### Marketplace Senkronizasyon Logları

```sql
CREATE TABLE sync_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    marketplace ENUM('trendyol', 'hepsiburada') NOT NULL,
    sync_type ENUM('product_push', 'stock_update', 'price_update', 'order_fetch') NOT NULL,
    status ENUM('success', 'failed', 'partial') NOT NULL,
    total_items INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_details JSON, -- Hata detayları
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_marketplace_type (marketplace, sync_type),
    INDEX idx_created (created_at)
);
```

---

## Sayfa Yapısı & Route'lar

### Müşteri Tarafı (Storefront)

| Route | Sayfa | Açıklama |
|-------|-------|----------|
| `/` | Ana Sayfa | Slider, öne çıkan ürünler, kampanyalar, markalar — tamamı API'den |
| `/magaza` | Mağaza | Tüm ürünler, filtreleme, sıralama, sayfalama |
| `/one-cikanlar` | Öne Çıkanlar | `is_featured=true` ürünler |
| `/kampanyalar` | Kampanyalar | Aktif kampanya listesi |
| `/kampanyalar/[slug]` | Kampanya Detay | Kampanyaya ait ürünler |
| `/markalar` | Markalar | Tüm markalar listesi (A-Z) |
| `/markalar/[slug]` | Marka Detay | Markaya ait ürünler |
| `/[...categorySlug]` | Kategori | Dinamik kategori sayfası — `/gunes-kremi/bronzlastirici` |
| `/urun/[slug]` | Ürün Detay | Ürün bilgileri, görseller, varyantlar, benzer ürünler |
| `/sepet` | Sepet | Sepet içeriği, kupon uygulama |
| `/odeme` | Ödeme | Adres, kart bilgisi, taksit seçimi, sipariş özeti |
| `/odeme/basarili` | Ödeme Başarılı | Sipariş onay sayfası |
| `/odeme/basarisiz` | Ödeme Başarısız | Hata sayfası |
| `/favoriler` | Favoriler | Kullanıcının favori ürünleri |
| `/hakkimizda` | Hakkımızda | Dinamik sayfa (pages tablosu) |
| `/iletisim` | İletişim | İletişim formu + bilgiler (settings'ten) |
| `/giris-yap` | Giriş | Login formu |
| `/kayit-ol` | Kayıt Ol | Register formu |
| `/sifremi-unuttum` | Şifremi Unuttum | Şifre sıfırlama |
| `/hesabim` | Hesabım | Dashboard |
| `/hesabim/siparisler` | Siparişlerim | Sipariş listesi |
| `/hesabim/siparisler/[id]` | Sipariş Detay | Sipariş detayı + durum takibi |
| `/hesabim/adreslerim` | Adreslerim | Adres CRUD |
| `/hesabim/kartlarim` | Kartlarım | Kayıtlı kartlar (PayTR token) |
| `/hesabim/bilgilerim` | Bilgilerim | Profil güncelleme |
| `/hesabim/favorilerim` | Favorilerim | Favori ürünler |
| `/kvkk` | KVKK | Yasal sayfa |
| `/gizlilik-politikasi` | Gizlilik Politikası | Yasal sayfa |
| `/kullanim-kosullari` | Kullanım Koşulları | Yasal sayfa |
| `/mesafeli-satis-sozlesmesi` | Mesafeli Satış Sözleşmesi | Yasal sayfa |
| `/iade-ve-degisim` | İade ve Değişim | Yasal sayfa |
| `/arama` | Arama Sonuçları | Meilisearch ile arama |

### Admin Panel (`/yonetim/*`)

| Route | Sayfa | Açıklama |
|-------|-------|----------|
| `/yonetim` | Dashboard | Günlük satış, sipariş sayısı, düşük stok uyarısı, ciro grafiği |
| `/yonetim/urunler` | Ürünler | Liste, arama, filtre, toplu düzenleme |
| `/yonetim/urunler/ekle` | Ürün Ekle | Ürün formu |
| `/yonetim/urunler/[id]` | Ürün Düzenle | Ürün düzenleme |
| `/yonetim/urunler/import` | Ürün Import | JSON feed import |
| `/yonetim/kategoriler` | Kategoriler | Ağaç yapısında kategori yönetimi (drag & drop) |
| `/yonetim/markalar` | Markalar | Marka CRUD |
| `/yonetim/siparisler` | Siparişler | Tüm siparişler (web + marketplace), filtreleme |
| `/yonetim/siparisler/[id]` | Sipariş Detay | Sipariş detay, durum güncelleme, kargo bilgisi |
| `/yonetim/musteriler` | Müşteriler | Müşteri listesi |
| `/yonetim/musteriler/[id]` | Müşteri Detay | Müşteri bilgileri, sipariş geçmişi |
| `/yonetim/kampanyalar` | Kampanyalar | Kampanya CRUD |
| `/yonetim/kuponlar` | Kuponlar | Kupon CRUD |
| `/yonetim/sayfalar` | Sayfalar | Dinamik sayfa yönetimi (hakkımızda, yasal vb.) |
| `/yonetim/slider` | Slider | Homepage slider yönetimi |
| `/yonetim/bannerlar` | Banner'lar | Banner yönetimi |
| `/yonetim/marketplace` | Marketplace | Trendyol/HB senkron durumu, loglar |
| `/yonetim/marketplace/trendyol` | Trendyol | Trendyol ayarları, ürün eşleştirme |
| `/yonetim/marketplace/hepsiburada` | Hepsiburada | HB ayarları, ürün eşleştirme |
| `/yonetim/faturalar` | Faturalar | BizimHesap fatura listesi |
| `/yonetim/ayarlar` | Ayarlar | Site ayarları (iletişim, kargo, SEO, sosyal medya) |
| `/yonetim/raporlar` | Raporlar | Satış raporları, en çok satan ürünler |

---

## Entegrasyonlar

### 1. PayTR Direkt API

```
Özellikler:
- Direkt API ile ödeme (iframe değil, kendi formumuz)
- Kart saklama (PayTR token sistemi)
- Kayıtlı karttan ödeme
- Taksit seçenekleri sorgulama ve gösterim
- 3D Secure desteği
- Callback (webhook) ile ödeme onayı

Akış:
1. Müşteri sepeti onaylar → ödeme sayfasına gelir
2. Frontend → Go API: Kart bilgileri + sipariş bilgileri
3. Go API → PayTR: Ödeme başlat (token al)
4. 3D Secure varsa → müşteri banka sayfasına yönlenir
5. PayTR → Go API webhook: Ödeme sonucu (başarılı/başarısız)
6. Go API → Sipariş durumu güncelle + stok düş + BizimHesap fatura kes

Kart Saklama Akışı:
1. İlk ödemede "Kartımı kaydet" seçeneği
2. PayTR'den card_token alınır → saved_cards tablosuna yazılır
3. Sonraki ödemelerde kayıtlı kart seçilir → token ile ödeme yapılır

Taksit Akışı:
1. Sepet toplamına göre PayTR'den taksit seçenekleri çekilir (BIN bazlı)
2. Frontend'de taksit tablosu gösterilir
3. Müşteri taksit seçer → ödeme bu taksitle gerçekleşir
```

### 2. Trendyol Supplier API

```
Özellikler:
- Ürün oluşturma/güncelleme (product push)
- Stok güncelleme (her 15 dk)
- Fiyat güncelleme (her 15 dk)
- Sipariş çekme (her 5 dk)
- Sipariş durumu güncelleme (kargo bilgisi gönderme)
- Kategori eşleştirme (Trendyol kategori ağacı → bizim kategoriler)

Gerekli Bilgiler (admin panelden girilecek):
- Supplier ID
- API Key
- API Secret
- Mağaza adı
```

### 3. Hepsiburada Merchant API

```
Özellikler:
- Ürün listeleme (listing + matching)
- Stok güncelleme
- Fiyat güncelleme
- Sipariş çekme
- Sipariş durumu güncelleme
- Ürün eşleştirme (HB katalogundaki ürünlerle matching)

Gerekli Bilgiler (admin panelden girilecek):
- Merchant ID
- Username
- Password
```

### 4. BizimHesap API

```
Özellikler:
- Sipariş tamamlandığında otomatik e-fatura / e-arşiv fatura oluşturma
- Bireysel / kurumsal fatura desteği
- Fatura PDF'i alma ve sipariş kaydına ekleme
- Cari hesap senkronizasyonu

Akış:
1. Sipariş durumu "paid" olunca → Go API → BizimHesap: Fatura oluştur
2. BizimHesap → Fatura no + PDF URL döner
3. Go API → orders tablosuna invoice bilgilerini yaz
4. Müşteriye email ile fatura PDF gönder

Gerekli Bilgiler (admin panelden girilecek):
- API Key
- Firma bilgileri
```

### 5. JSON Ürün Feed Import

```
Özellikler:
- Elimdeki JSON dosyasından ürün aktarımı
- Kategori eşleştirme (feed kategori → bizim kategori)
- Marka eşleştirme
- Görsel indirme ve optimizasyon
- Tekrarlayan import (stok/fiyat güncelleme)
- Yeni ürün ekleme / mevcut ürün güncelleme (feed_source_id ile eşleşme)

Admin Panel:
- JSON dosyası upload
- Alan eşleştirme (mapping) ekranı
- Import önizleme (ilk 10 ürün)
- Import başlat / import logları
```

---

## Zamanlanmış Görevler (gocron)

| Görev | Sıklık | Açıklama |
|-------|--------|----------|
| Trendyol stok senkron | Her 15 dk | Ürün stoklarını Trendyol'a push |
| Trendyol fiyat senkron | Her 15 dk | Fiyat güncellemelerini push |
| Trendyol sipariş çekme | Her 5 dk | Yeni siparişleri çek → orders tablosuna yaz |
| HB stok senkron | Her 15 dk | Ürün stoklarını HB'ye push |
| HB fiyat senkron | Her 15 dk | Fiyat güncellemelerini push |
| HB sipariş çekme | Her 5 dk | Yeni siparişleri çek |
| Meilisearch index | Her 30 dk | Ürün index'ini güncelle (veya event-based) |
| Düşük stok uyarısı | Günlük 09:00 | Düşük stoklu ürünleri admin'e bildir |
| Sepet temizleme | Günlük 03:00 | 7 günden eski misafir sepetlerini temizle |
| Senkron log temizleme | Haftalık | 30 günden eski logları temizle |

---

## Tasarım & UI

### Renk Paleti — Lavender Dream

```css
:root {
    --font-display: 'DM Serif Display', serif;
    --font-body: 'DM Sans', sans-serif;
    --bg-primary: #f5f0ff;
    --bg-footer: #1e103d;
    --accent: #7c3aed;
    --accent-soft: #ede9fe;
    --text-primary: #1e103d;
    --text-secondary: #8b7aaa;
    --border: #e0d5f5;
    --card-bg: #ffffff;
}
```

### Tipografi

- **Display / Başlıklar**: DM Serif Display (serif) — Google Fonts
- **Body / Genel metin**: DM Sans (sans-serif) — Google Fonts

### Responsive Breakpoint'ler

```
Mobile: 0 — 639px
Tablet: 640px — 1023px
Desktop: 1024px — 1279px
Large Desktop: 1280px+
```

### PWA Gereksinimleri

- `manifest.json` — app name, icons, theme color (#7c3aed), background color (#f5f0ff)
- Service Worker — offline cache stratejisi (stale-while-revalidate)
- App Shell mimarisi
- Push notification altyapısı (opsiyonel, gelecekte)
- Add to Home Screen desteği

---

## Önemli Kurallar

### Türkçe Karakter Uyumu
- Tüm slug'lar Türkçe karakterden arındırılacak: ç→c, ş→s, ğ→g, ü→u, ö→o, ı→i, İ→i
- Tüm UI metinleri, buton yazıları, placeholder'lar, hata mesajları Türkçe olacak
- Para formatı: ₺1.234,56 (nokta binlik ayracı, virgül ondalık)
- Tarih formatı: 07.04.2026 veya 7 Nisan 2026
- Telefon formatı: +90 (5XX) XXX XX XX

### Hardcoded İçerik Yasağı
- Site adı → settings tablosundan
- Telefon, email, adres → settings tablosundan
- Sosyal medya linkleri → settings tablosundan
- Footer metinleri → settings tablosundan
- Slider → sliders tablosundan
- Banner'lar → banners tablosundan
- Kargo ücreti / ücretsiz kargo limiti → settings tablosundan
- SEO meta bilgileri → settings tablosundan veya ilgili kayıttan
- Sayfa içerikleri → pages tablosundan

### SEO
- Her sayfada dinamik meta title + description
- Open Graph / Twitter Card tag'leri
- Ürün sayfalarında JSON-LD (Product schema)
- Sitemap.xml otomatik üretimi
- robots.txt
- Canonical URL'ler
- Breadcrumb yapısı (kategori path'i ile)

### Güvenlik
- CORS yapılandırması
- Rate limiting (özellikle auth ve ödeme endpoint'leri)
- SQL injection koruması (GORM parameterized queries)
- XSS koruması
- CSRF koruması
- Input validation (Go struct tag'leri ile)
- Hassas bilgiler .env'de (DB, API key'ler, JWT secret)
- Admin route'ları JWT + role kontrolü

### Performans
- Redis cache: Ürün listesi, kategori ağacı, site ayarları, sepet
- Meilisearch: Ürün arama, autocomplete, filtreleme
- Görsel optimizasyon: WebP format, lazy loading, responsive srcset
- Next.js: ISR (Incremental Static Regeneration) ürün/kategori sayfaları için
- Go: Connection pooling (MySQL), goroutine bazlı marketplace sync
- Pagination: Cursor-based veya offset-based (tercihe göre)

---

## Dizin Yapısı

### Go Backend

```
backend/
├── cmd/
│   └── server/
│       └── main.go                 -- Entry point
├── internal/
│   ├── config/
│   │   └── config.go               -- .env okuma, struct
│   ├── database/
│   │   ├── mysql.go                 -- GORM bağlantısı
│   │   └── redis.go                 -- Redis bağlantısı
│   ├── middleware/
│   │   ├── auth.go                  -- JWT middleware
│   │   ├── admin.go                 -- Admin role kontrolü
│   │   ├── cors.go                  -- CORS
│   │   └── ratelimit.go            -- Rate limiting
│   ├── models/
│   │   ├── user.go
│   │   ├── product.go
│   │   ├── category.go
│   │   ├── order.go
│   │   ├── cart.go
│   │   ├── brand.go
│   │   ├── campaign.go
│   │   ├── coupon.go
│   │   ├── page.go
│   │   ├── slider.go
│   │   ├── banner.go
│   │   ├── setting.go
│   │   ├── address.go
│   │   ├── saved_card.go
│   │   ├── favorite.go
│   │   └── sync_log.go
│   ├── handlers/
│   │   ├── auth_handler.go
│   │   ├── product_handler.go
│   │   ├── category_handler.go
│   │   ├── order_handler.go
│   │   ├── cart_handler.go
│   │   ├── user_handler.go
│   │   ├── brand_handler.go
│   │   ├── campaign_handler.go
│   │   ├── coupon_handler.go
│   │   ├── page_handler.go
│   │   ├── admin_handler.go
│   │   ├── payment_handler.go
│   │   ├── favorite_handler.go
│   │   ├── address_handler.go
│   │   ├── card_handler.go
│   │   ├── setting_handler.go
│   │   ├── slider_handler.go
│   │   ├── banner_handler.go
│   │   ├── search_handler.go
│   │   └── webhook_handler.go
│   ├── services/
│   │   ├── auth_service.go
│   │   ├── product_service.go
│   │   ├── order_service.go
│   │   ├── cart_service.go
│   │   ├── payment_service.go       -- PayTR iş mantığı
│   │   ├── search_service.go        -- Meilisearch
│   │   ├── cache_service.go         -- Redis cache
│   │   ├── image_service.go         -- Görsel upload/optimize
│   │   └── email_service.go         -- Email gönderimi
│   ├── integrations/
│   │   ├── paytr/
│   │   │   ├── client.go            -- PayTR API client
│   │   │   ├── payment.go           -- Ödeme işlemleri
│   │   │   ├── installment.go       -- Taksit sorgulama
│   │   │   └── card_storage.go      -- Kart saklama
│   │   ├── trendyol/
│   │   │   ├── client.go            -- Trendyol API client
│   │   │   ├── product_sync.go      -- Ürün push
│   │   │   ├── stock_sync.go        -- Stok güncelleme
│   │   │   ├── price_sync.go        -- Fiyat güncelleme
│   │   │   ├── order_sync.go        -- Sipariş çekme
│   │   │   └── category_map.go      -- Kategori eşleştirme
│   │   ├── hepsiburada/
│   │   │   ├── client.go
│   │   │   ├── product_sync.go
│   │   │   ├── stock_sync.go
│   │   │   ├── price_sync.go
│   │   │   ├── order_sync.go
│   │   │   └── matching.go          -- Ürün eşleştirme
│   │   └── bizimhesap/
│   │       ├── client.go            -- BizimHesap API client
│   │       ├── invoice.go           -- Fatura oluşturma
│   │       └── customer.go          -- Cari hesap
│   ├── scheduler/
│   │   └── scheduler.go             -- gocron görev tanımları
│   ├── dto/
│   │   ├── request/                  -- İstek DTO'ları
│   │   └── response/                 -- Yanıt DTO'ları
│   └── utils/
│       ├── slug.go                   -- Türkçe slug üretimi
│       ├── validator.go              -- Input validation
│       ├── pagination.go             -- Sayfalama helper
│       └── helpers.go
├── migrations/
│   └── *.sql                         -- golang-migrate dosyaları
├── .env.example
├── go.mod
├── go.sum
└── Makefile
```

### Next.js Frontend

```
frontend/
├── app/
│   ├── layout.tsx                    -- Root layout (font, theme, PWA)
│   ├── page.tsx                      -- Ana sayfa
│   ├── magaza/
│   │   └── page.tsx
│   ├── one-cikanlar/
│   │   └── page.tsx
│   ├── kampanyalar/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── markalar/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── urun/
│   │   └── [slug]/page.tsx
│   ├── sepet/
│   │   └── page.tsx
│   ├── odeme/
│   │   ├── page.tsx
│   │   ├── basarili/page.tsx
│   │   └── basarisiz/page.tsx
│   ├── favoriler/
│   │   └── page.tsx
│   ├── arama/
│   │   └── page.tsx
│   ├── giris-yap/
│   │   └── page.tsx
│   ├── kayit-ol/
│   │   └── page.tsx
│   ├── sifremi-unuttum/
│   │   └── page.tsx
│   ├── hesabim/
│   │   ├── page.tsx
│   │   ├── siparisler/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── adreslerim/page.tsx
│   │   ├── kartlarim/page.tsx
│   │   ├── bilgilerim/page.tsx
│   │   └── favorilerim/page.tsx
│   ├── yonetim/                      -- Admin Panel
│   │   ├── layout.tsx                -- Admin layout (sidebar, topbar)
│   │   ├── page.tsx                  -- Dashboard
│   │   ├── urunler/
│   │   ├── kategoriler/
│   │   ├── markalar/
│   │   ├── siparisler/
│   │   ├── musteriler/
│   │   ├── kampanyalar/
│   │   ├── kuponlar/
│   │   ├── sayfalar/
│   │   ├── slider/
│   │   ├── bannerlar/
│   │   ├── marketplace/
│   │   ├── faturalar/
│   │   ├── ayarlar/
│   │   └── raporlar/
│   ├── [...categorySlug]/            -- Dinamik kategori route
│   │   └── page.tsx
│   └── [slug]/                       -- Dinamik sayfalar (hakkimizda, kvkk vb.)
│       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── MobileMenu.tsx
│   │   ├── SearchBar.tsx
│   │   └── Breadcrumb.tsx
│   ├── product/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── ProductInfo.tsx
│   │   └── ProductFilters.tsx
│   ├── cart/
│   │   ├── CartDrawer.tsx
│   │   ├── CartItem.tsx
│   │   └── CartSummary.tsx
│   ├── checkout/
│   │   ├── AddressForm.tsx
│   │   ├── PaymentForm.tsx
│   │   ├── InstallmentTable.tsx
│   │   └── OrderSummary.tsx
│   ├── home/
│   │   ├── HeroSlider.tsx
│   │   ├── FeaturedProducts.tsx
│   │   ├── CampaignBanner.tsx
│   │   ├── BrandCarousel.tsx
│   │   └── CategoryGrid.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Spinner.tsx
│   │   ├── Badge.tsx
│   │   ├── Pagination.tsx
│   │   └── Select.tsx
│   └── admin/
│       ├── AdminSidebar.tsx
│       ├── AdminTopbar.tsx
│       ├── DataTable.tsx
│       ├── StatCard.tsx
│       ├── RichTextEditor.tsx
│       ├── ImageUploader.tsx
│       └── CategoryTree.tsx
├── lib/
│   ├── api.ts                        -- Go API client (fetch wrapper)
│   ├── auth.ts                       -- Auth context & hooks
│   ├── cart.ts                       -- Cart context & hooks
│   ├── favorites.ts                  -- Favorites context
│   └── utils.ts                      -- formatPrice, formatDate vb.
├── hooks/
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── useDebounce.ts
│   └── useMeilisearch.ts
├── types/
│   └── index.ts                      -- TypeScript type tanımları
├── public/
│   ├── manifest.json
│   ├── sw.js                         -- Service Worker
│   ├── icons/                        -- PWA ikonları
│   └── images/
├── styles/
│   └── globals.css                   -- Tailwind + CSS variables
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Deployment Notları

### VPS Üzerinde Çalıştırma (CloudPanel)

```bash
# Go backend — systemd servisi olarak
sudo systemctl start ecommerce-api
sudo systemctl enable ecommerce-api

# Next.js — PM2 ile
pm2 start npm --name "ecommerce-web" -- start
pm2 save

# Nginx reverse proxy (CloudPanel üzerinden)
# example.com → Next.js (:3000)
# example.com/api/* → Go (:8080)
```

### Ortam Değişkenleri (.env)

```env
# Uygulama
APP_ENV=production
APP_PORT=8080
JWT_SECRET=xxx
JWT_EXPIRY=24h

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ecommerce
DB_USER=xxx
DB_PASSWORD=xxx

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=5

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=xxx

# PayTR
PAYTR_MERCHANT_ID=xxx
PAYTR_MERCHANT_KEY=xxx
PAYTR_MERCHANT_SALT=xxx
PAYTR_BASE_URL=https://www.paytr.com

# Trendyol
TRENDYOL_SUPPLIER_ID=xxx
TRENDYOL_API_KEY=xxx
TRENDYOL_API_SECRET=xxx
TRENDYOL_BASE_URL=https://api.trendyol.com/sapigw

# Hepsiburada
HB_MERCHANT_ID=xxx
HB_USERNAME=xxx
HB_PASSWORD=xxx
HB_BASE_URL=https://mpop-sit.hepsiburada.com

# BizimHesap
BIZIMHESAP_API_KEY=xxx
BIZIMHESAP_BASE_URL=https://api.bizimhesap.com

# Email (SMTP)
SMTP_HOST=xxx
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASSWORD=xxx
SMTP_FROM=info@example.com

# Genel
FRONTEND_URL=https://example.com
UPLOAD_DIR=/home/ecommerce/uploads
MAX_UPLOAD_SIZE=10485760
```

---

## Geliştirme Sırası (Fazlar)

### Faz 1 — Temel Altyapı
1. Go projesi kurulumu (Fiber, GORM, config, middleware)
2. MySQL migration'lar
3. Auth sistemi (register, login, JWT)
4. Next.js projesi kurulumu (layout, theme, PWA config)
5. Admin giriş sistemi

### Faz 2 — Ürün & Kategori
1. Kategori CRUD (admin) + ağaç yapısı
2. Marka CRUD (admin)
3. Ürün CRUD (admin) + görsel yükleme
4. JSON feed import sistemi
5. Meilisearch entegrasyonu
6. Storefront: ürün listesi, detay, kategori, marka sayfaları

### Faz 3 — Sepet & Ödeme
1. Sepet sistemi (guest + authenticated)
2. Adres yönetimi
3. PayTR entegrasyonu (direkt API + taksit + kart saklama)
4. Sipariş oluşturma akışı
5. Sipariş durum yönetimi

### Faz 4 — CMS & İçerik
1. Dinamik sayfa yönetimi
2. Slider & banner yönetimi
3. Settings sistemi
4. Homepage bileşenleri (frontend)
5. Kampanya & kupon sistemi

### Faz 5 — Marketplace Entegrasyonları
1. Trendyol ürün push + stok/fiyat senkron
2. Trendyol sipariş çekme
3. Hepsiburada ürün push + stok/fiyat senkron
4. Hepsiburada sipariş çekme
5. Senkron logları ve admin panel marketplace sayfası

### Faz 6 — Fatura & Raporlama
1. BizimHesap fatura entegrasyonu
2. Otomatik fatura kesimi
3. Admin raporlama (satış, ürün, ciro)
4. Dashboard grafikleri

### Faz 7 — İnce Ayarlar
1. SEO optimizasyonu (sitemap, schema, meta)
2. Performans optimizasyonu (Redis cache, ISR)
3. Email bildirimleri (sipariş onay, kargo, fatura)
4. Güvenlik sıkılaştırma
5. PWA finalizasyonu
6. Test & QA
