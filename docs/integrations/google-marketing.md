# Google Analytics / Ads — lokal hazırlık

Yönetim ekranı: `/yonetim/ayarlar/google` (yalnız super_admin).

## Hazır akış

- `GET /api/v1/tracking/config`: yalnız herkese açık etiket kimlikleri.
- `GET /api/v1/admin/google/status`: yapılandırma ve eksik alanlar; sırların sadece kayıtlı olup olmadığı.
- `PUT /api/v1/admin/google/config`: AES-256-GCM ile şifreli atomik dosya kaydı; boş secret alanları korunur, açık silme seçeneği mevcut. Dosya 0600, dizin 0700.
- `POST /api/v1/admin/google/report/analytics`: OAuth refresh → GA4 Data API `properties:runReport` (son 7 gün kullanıcı/oturum/satın alma).
- `POST /api/v1/admin/google/report/ads`: OAuth refresh → Ads API v26 `googleAds:searchStream` (son 7 gün gösterim/tıklama/maliyet/dönüşüm). Reklam değiştiren/oluşturan endpoint yok.
- OAuth hataları ve sağlayıcı yanıtları secret sızdırmadan genel HTTP durumuyla döner; 15 saniye timeout ve 1 MB yanıt sınırı.

`GOOGLE_CONFIG_KEY`: sunucu secret manager/env içinde 32 byte base64 anahtar. Anahtarın kaybı şifreli yapılandırmayı okunamaz yapar; aynı güvenli yedekleme politikasında saklanmalıdır. `.private/google.enc` ve env Git dışındadır. Docker/release düzeninde dosya yolu kalıcı özel volume olarak belirlenmeli.

`GOOGLE_ALLOW_NETWORK=false`: lokal varsayılan. Report endpointleri 409 döner; hiçbir gerçek hesap çağrısı yapılmaz. Sunucuda bilinçli olarak true yapılmadan UI doğrulama butonları kapalıdır. Bu görevde true yapılmadı.

## Sonradan girilecek bilgiler

GA4 ölçüm kimliği, sayısal mülk numarası; Ads etiket kimliği, dönüşüm etiketi, 10 haneli müşteri numarası ve varsa yönetici hesap numarası; OAuth client ID/client secret/refresh token; Ads developer token.

Google Cloud projesinde Analytics Data API ve Google Ads API erişimi, mülk/hesap yetkileri ve uygun developer token erişim seviyesi gerekir. Refresh token, `https://www.googleapis.com/auth/analytics.readonly` ve `https://www.googleapis.com/auth/adwords` kapsamlarını kapsamalıdır. Bu sürüm tek işletme için önceden yetkilendirilmiş refresh tokenı admin ekranından alır; tarayıcı OAuth yönlendirme/onay akışı sağlamaz. Google hesabında yetkilendirme ve token temini hesap sahibi tarafından yapılır. Sırlar sohbet içine yazılmaz.

## Takip ve izin

Temel izin modeli: izin verilmeden Google scripti veya ping yüklenmez. Analitik/reklam ayrı seçilir; tercih 180 gün saklanır ve footer'dan değiştirilebilir. Ret/revokasyonda ölçüm çerezleri silinir ve sayfa yenilenerek önceki runtime durdurulur. Localhost/127.0.0.1/::1 üzerinde izin verilse bile Google scripti açılmaz.

GA4 page_view (aynı rota tekrarını filtreler), view_item, başarılı add_to_cart, begin_checkout ve purchase; Ads yalnız doğrulanmış purchase için conversion gönderir. `GET /tracking/purchase/:number`, oturum sahibine ait siparişi DB'de doğrular; DEV ödemesi, ödenmemiş/iptal/iade siparişleri satın alma sayılmaz. Tekilleştirme sağlayıcı başına transaction_id + yerel işaret kullanır; sağlayıcı kabulünün kanıtı değildir. Başarı URL'sindeki numara tek başına dönüşüm oluşturmaz. E-posta/adres/kart/vergi bilgileri eventlere eklenmez; sayfa query string ve referrer aktarılmaz.

Sunucu Measurement Protocol / offline conversion upload bu sürümde yoktur; tarayıcıda consent verilen olaylar tek gönderim yoludur. Reklam engelleyici, tarayıcı kapanması ve izin reddi ölçümü azaltabilir. Gerçek DebugView / Ads dönüşüm alımı ve hesap raporlarının doğruluğu sağlayıcı doğrulamasında bekliyor.

## Resmi sözleşme kaynakları

- https://developers.google.com/analytics/devguides/reporting/data/v1/basics
- https://developers.google.com/google-ads/api/rest/common/search
- https://developers.google.com/google-ads/api/docs/oauth/single-user-authentication
- https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic

## Test

`cd backend && go test -race ./...`
`cd frontend && npm test`
Lokal servisler açıkken proje kökünden `python3 scripts/test-local-google.py`.
Son script mevcut sırlar doluysa durur; boş konfigürasyona dummy değerler yazıp şifreleme/redaksiyon/network guard kontrolünden sonra ilk boş konfigürasyonu geri yükler. Gerçek Google bağlantısı kurmaz.
