# E-posta ve push akışları — 13 Kasım 2026

Yerel uygulama. Canlıya dağıtılmadı. Kullanıcı SMTP bilgilerini daha sonra verecek; `NOTIFICATION_WORKER_ENABLED=false`. Yeni olaylar kuyrukta tutulur, gönderim yapılmaz. Yerel 029 migration uygulandı. Firebase mevcut anahtarları değiştirilmedi.

## Olaylar

- Sipariş oluşturma: `order_received` (ödeme onayı anlamına gelmez).
- Doğrulanmış başarılı PayTR callback: `payment_confirmed`.
- Sipariş durum geçmişi: `shipped`, `delivered`, `cancelled`, `refunded`.
- İptal/iade talebi: requested, approved, rejected, completed ayrı mesajlar.
- `refund_completed`: yalnız refund_status=completed ve sağlayıcı referansı varsa; DEV referansları gönderilmez. Metin bankaya yansımayı garanti etmez.
- Kayıt: hoş geldin ve doğrulama; şifremi unuttum: sıfırlama. Artık dayanıklı e-posta kuyruğunu kullanır. Doğrulama/şifre bağlantıları loglanmaz; süresi dolan e-postalar atlanır.
- Kampanya: super-admin panelinde açıkça oluşturulan gönderim; e-posta/push kanalı ve zaman seçimi. Bülten aboneliği ve ayrı kampanya push tercihi gönderim anında tekrar kontrol edilir. Otomatik kampanya oluşturma tetikleyicisi yoktur.

Sipariş alıcıları aktif web müşterileridir. Marketplace ve e-postası/müşteri bağlantısı olmayan misafir kayıtlarına bildirim gönderilmez. Push hesabı sunucunun doğruladığı oturumdan alınır; giriş/kayıt sonrası eşlenir, çıkış öncesi cihaz kaydı kaldırılır; hesap bağı 24 saatte dolar. E-posta ayrı kanaldır, tarayıcı izni gerektirmez. Kampanya push onayı varsayılan kapalıdır. Kilit ekranındaki sipariş push metni numara/tutar/isim içermez; detay için oturum gerekir.

## Kuyruk

`notification_events` iş işlemiyle aynı transaction içinde yazılır. Olay anahtarı unique; rollback olay kaydını da geri alır. Worker alıcıları `notification_deliveries` tablosuna tek kez açar; teslim anahtarı unique. Atomic pending→sending geçişi eşzamanlı işçilerin aynı kaydı almasını önler. Başarısız teslim en fazla 5 kez artan aralıklarla denenir. Çalışan süreç kaybında 10 dakikadan eski sending kayıtları uncertain olur; körlemesine tekrar gönderilmez.

SMTP/FCM uçlarında sağlayıcı idempotency garantisi yoktur: ağ hatasında sağlayıcı kabul etmiş fakat yanıt kaybolmuşsa kesin exactly-once teslim iddiası yapılamaz. `sent`, sağlayıcı çağrısının başarılı olduğu anlamına gelir; açılma/okunma veya cihaz teslim kanıtı değildir. SMTP eksikse email, Firebase ağ erişimi kapalıysa push pending kalır. Hatalar panelde genel, alıcılar/tokenlar/mesaj gövdeleri API geçmişinde gizlidir. DB loglarında parametreler maskelenir.

## Panel ve önizleme

- `/yonetim/bildirimler`: mevcut tek cihaz testi + kampanya formu, zamanlama, alıcı sayıları, son 100 gönderim.
- `/bulten-iptal`: e-posta aboneliğini kapatma; footer PWA seçenekleri: push kapatma ve ayrı kampanya tercihi.
- `go run ./cmd/notification-preview` (backend): 19 örnek HTML üretir; `output/notification-templates/index.html`.

## Doğrulama

Go test/race, frontend TypeScript ve üretim build; şablon HTML kaçışları; abonelikten çıkma ve cihaz sahiplik yeniden kontrolü; işçi kapalıyken dış çağrı yapılmaması. Opt-in `IV_LOCAL_NOTIFICATION_TEST=1 go test ./internal/services -run TestLocalNotificationTransactions -v`: yalnız localhost:33079/istanbul_vitamin_local, transaction rollback, tek olay/tek teslim, başarısız ve başarılı refund ayrımı; test verisi kalmaz. Önizleme tarayıcıda incelendi.

Gerçek SMTP, fiziksel cihaz, e-posta istemcileri ve canlı sipariş sağlayıcı akışları henüz uçtan uca test edilmedi. SMTP geldiğinde tek test adresi/cihazıyla doğrulanmalı; bekleyen test kayıtları incelenmeden worker açılmamalı. Üretimde 029 migration yayın öncesi bir kez uygulanmalı (ALTER tekrar çalıştırılmaz).
