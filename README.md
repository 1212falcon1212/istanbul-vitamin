# İstanbul Vitamin — yerel geliştirme

Next.js/React arayüzü (`frontend`), Go/Fiber API (`backend`), MySQL,
Redis ve isteğe bağlı Meilisearch kullanır. Arama, Meilisearch indeksi
bulunmadığında MySQL'e döner.

## Hazırlanan yerel ortam

- Site: http://localhost:3000
- Yönetici girişi: http://localhost:3000/yonetim/giris
- API sağlık kontrolü: http://localhost:8080/api/v1/health
- MySQL: `127.0.0.1:33079`, Redis: `127.0.0.1:6389`, Meilisearch: `127.0.0.1:7719`
- Ortam ayarları: `backend/.env`, `frontend/.env.local`
- Yerel yönetici bilgileri: `backend/.env.local-admin`

Ortam ve yönetici dosyaları Git dışında tutulur. Veritabanı bu projeye ait
Docker volume'unda saklanır. 10 Kasım 2026 tarihinde canlı veritabanının
35 tablosu aktarıldı: 5.201 ürün, 5.202 ürün görsel kaydı, 132 kategori,
213 marka, 27 kullanıcı ve 11 sipariş. İçe aktarma anında tüm tabloların
kayıt sayıları canlıdan alınan sayımla eşleşti. Ardından yerel yönetici
yeniden eklendi ve sadece yerel entegrasyon ayarları değiştirildi.

Sunucudaki `uploads` dosyaları kopyalandı. 5.201 ürün görseli mevcut
`cdn.myikas.com` bağlantılarından yüklenir; bu CDN dosyaları diske indirilmedi.
Yerel Meilisearch indeksi 5.201 ürünle oluşturuldu.

Canlı verilerle dış işlem yapılmaması için Aras ve Bizimhesap bağlantıları
yerelde kapatıldı, ilgili kimlik bilgileri yerel ayarlardan temizlendi.
PayTR, SMTP ve pazaryeri ortam bilgileri boş bırakıldı. Canlı şemayı korumak
için `backend/.env` içinde `AUTO_MIGRATE=false` kullanılır; mevcut canlı
kopyanın üzerinde ilk kurulum migration'larını yeniden çalıştırmayın.

Aktarım öncesi yerel yedek, canlı SQL kopyası ve tablo sayımları
`.local-backups/live-import-20261110/` altında Git dışında saklanır.
Bu dizin gerçek müşteri/sipariş verisi içerir; paylaşmayın veya commit etmeyin.

## Yeniden başlatma

Docker Desktop çalışırken proje kökünden:

```sh
docker compose --env-file backend/.env -f compose.local.yml up -d --wait
```

API için ayrı terminalde:

```sh
cd backend
go run ./cmd/server
```

Arayüz için ayrı terminalde:

```sh
cd frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Portlar zaten kullanılıyorsa çalışan proje süreçlerini kullanın; ikinci
bir kopya başlatmayın. Terminal servislerini Ctrl+C ile durdurabilirsiniz.
Veritabanını verileri koruyarak durdurmak için proje kökünden:

```sh
docker compose --env-file backend/.env -f compose.local.yml stop
```

## İlk kurulum ve kontroller

Yeni bir makinede ortam dosyalarını örneklerden hazırlayıp Compose portlarını
ve veritabanı kullanıcı/parolasını eşleştirin. Boş veritabanında API'yi ilk
kez başlatmadan **önce** SQL migration'larını çalıştırın; geliştirme modundaki
GORM AutoMigrate kalan model alanlarını tamamlar.

```sh
REPO_DIR="$PWD" bash deploy/migrate.sh
cd frontend
npm ci
npx tsc --noEmit
```

Backend derleme kontrolü: `cd backend && go test ./...` (mevcut Go paketlerinde
test dosyası bulunmuyor).

10 Kasım 2026 yerel doğrulaması: ana sayfa ve yönetici giriş sayfası HTTP 200;
API sağlık, ürün, kategori, banner, ayar, CMS sayfası ve arama uçları HTTP 200;
yerel yönetici oturumu başarılı; TypeScript ve Go derleme kontrolleri başarılı.
Bu kontroller gerçek ödeme/kargo işlemlerini kapsamaz.

## Ana banner ve üçlü kart yönetimi

`/yonetim/bannerlar` ekranında **Ana Banner (İki Görselli)** pozisyonunun
sıralaması en küçük aktif kaydı gösterilir. Üçlü kart ve kayan marka şeridi
ana sayfadan kaldırılmıştır. Eski üçlü kart kayıtları admin panelinde korunur.
Başlık, açıklama, masaüstü/mobil görsel, sağ görsel, buton yazıları ve
bağlantıları, arka plan rengi, görsel yerleşimi ve yayın tarihleri düzenlenebilir.
Fotoğraflarda “Alanı doldur”, beyaz zeminli ürün fotoğraflarında “Tamamını göster”
kullanılabilir. Banner verileri önbelleksiz alınır; kayıttan sonra ana sayfayı yenileyin.

Bu alanlar `030_banner_editorial_fields.sql` migration'ını gerektirir.
10 Kasım yerel ortamında uygulandı ve migration kaydı işlendi; canlıya uygulanmadı.
Önceki banner kayıtları `.local-backups/banner-redesign-20261110/` altında yedeklendi.
`public/banners/wellness-water.png` bu tasarım için yapay zekâyla üretilmiş
yaşam tarzı fotoğrafıdır. Ürün görselleri mevcut katalog kayıtlarından gelir.

Doğrulama: admin API kaydetme/yeniden okuma ve aktif-pasif akışı; tarayıcıda
admin formundan açıklama değiştirip ana sayfada görme; masaüstü ve 390 px mobil
banner/kart görünümü. Dosya yükleme akışı bu değişiklikte ayrıca denenmedi.


## Lokal ürün kartı önizlemesi

`frontend/.env.local` içindeki `NEXT_PUBLIC_CATALOG_PREVIEW=true`, yalnızca
`development` modunda ve localhost/127.0.0.1 üzerinde örnek puan, yorum sayısı,
karşılaştırma fiyatı ve rozetleri açar. Değerlendirmeler “örnek değerlendirme”
olarak etiketlenir. Gerçek ürün, yorum, favori ve sepet verileri değiştirilmez.
Kapatmak için değişkeni `false` yapın. Production modunda örnek veriler devre dışıdır.
“Aynı gün kargo” stoktaki ürünlerde işletmenin onayladığı kalıcı bilgidir.


## 11 Kasım lokal kalite çalışması

Tek görev ve kanıt raporu: `docs/tasks/2026-11-11-local-quality.md`.
Google kurulum rehberi: `docs/integrations/google-marketing.md`.

Yeni test komutları:

```sh
(cd backend && go test -race ./...)
(cd frontend && npm test)
python3 scripts/test-local-api.py
python3 scripts/test-local-google.py
```

Go modülü en az Go 1.26 ister ve yamalı `go1.27.4` toolchain seçer; Next 16.4.6 kullanılır. Bunlar lokal değişikliktir, canlıya uygulanmadı. `PAYMENT_MOCK_ENABLED` varsayılan kapalıdır: sağlayıcı eksikse ödeme başarılı sayılmaz. Üretimde mock hiçbir zaman açılmaz.
