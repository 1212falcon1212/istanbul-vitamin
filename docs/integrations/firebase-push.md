# Firebase Web Push — yerel altyapı

13 Kasım 2026: Firebase Console üzerinden `istanbul-vitamin` projesi (Spark) ve `Istanbul Vitamin Web` uygulaması oluşturuldu. Cloud Messaging API v1 etkinliği konsolda doğrulandı. Web uygulamasının dört public yapılandırma alanı yalnız yerel backend `.env` dosyasına kaydedildi. Gemini ve Analytics kurulmadı. Kullanıcı onayıyla VAPID ve servis hesabı özel anahtarı oluşturuldu. Özel anahtar `backend/.private/firebase-service-account.json` dosyasına 0600 izinle taşındı; Git tarafından ignore edildiği doğrulandı. Yerel Firebase ve kontrollü ağ erişimi etkinleştirildi. Sunucu yeniden başlatıldı; API configured/credential_present/network_enabled/storage_ready alanları true. Google OAuth, Firebase Messaging kapsamıyla HTTP 200 döndü. Kayıtlı cihaz sayısı 0; gerçek FCM teslimi **doğrulanmadı**. Son adım: tarayıcıda bildirim izni ve admin panelinden tek cihaz test gönderimi. Canlıya dağıtım yapılmadı.

## Hazır parçalar

- Firebase App + Messaging modülleri yalnız kullanıcının bildirim tercihiyle yüklenir. Firestore/Auth/Analytics paketleri kullanılmaz.
- İlk ziyaret PWA teklifi kurulum olayına bağımlı değildir. Destek varsa yerel kurulum penceresi, yoksa Safari/diğer tarayıcı yönergesi gösterilir. “Daha sonra” tercihi bu tarayıcıda saklanır; footer “Uygulama ve bildirimler” yeniden açar. Ödeme/hesap/admin ekranlarında teklif çıkmaz. Çerez paneli ve modal varken üst üste binmez.
- Proje hazır olduğunda “Bildirimleri aç” düğmesi görünür. Tarayıcı izni yalnız düğmeye basılınca istenir. İzin reddi açıklanır. Açık abonelik sonraki ziyaretlerde getToken ile yenilenir; izin geri çekilmişse sunucu kaydı kaldırılır.
- Cihaz başına rastgele 256-bit silme/güncelleme anahtarı; sunucuda SHA-256 özeti ve FCM tokenı tutulur. Kullanıcı e-postası veya müşteri bilgisi kaydedilmez. Tokenlar public/admin status cevaplarında dönmez. Token DB yedeği erişimi korunmalıdır.
- Tek PWA worker `/sw.js` FCM HTTP v1 **data-only** sözleşmesini işler: arka planda sistem bildirimi, açık görünür sekmede uygulama içi mesaj. `notification`+`data` birlikte gönderilmez; çift bildirim oluşmaz. Tıklama yalnız aynı origin'e gider. Bu native Push API alıcısı FCM Console'un notification-payload kampanyaları için tasarlanmadı; gönderim sunucudaki v1 istemcisi üzerinden yapılmalı.
- Go sunucusu servis hesabı RSA imzasıyla kısa ömürlü OAuth token alır ve sabit Google endpoint'ine v1 isteği gönderir. 15 saniye HTTP sınırı, hata cevabında sır maskeleme, `FIREBASE_ALLOW_NETWORK` varsayılan kapalı.
- `/yonetim/bildirimler`: yapılandırma, servis hesabı, tablo ve cihaz sayısı; yalnız super-admin için bu tarayıcıya test gönderimi. Toplu kampanya/otomatik sipariş bildirimi veya job kuyruğu bu aşamada eklenmedi.

## Birlikte proje oluşturulduğunda

1. Firebase projesinde Web App ve Cloud Messaging API v1 açılır. Web Push certificates bölümünden VAPID public key alınır.
2. Backend `.env`/secret manager: `FIREBASE_ENABLED=true`, `FIREBASE_WEB_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_SENDER_ID`, `FIREBASE_VAPID_KEY` doldurulur. Bunlar public web kimlikleridir.
3. İlgili projeye yetkili servis hesabı JSON dosyası webroot dışında, 0600 izinle tutulur. Yolu `FIREBASE_SERVICE_ACCOUNT_FILE` olur. JSON hiçbir public setting'e veya frontend'e yazılmaz. Anahtar repo'ya eklenmez.
4. Yayın sırasında `backend/migrations/028_push_subscriptions.sql` uygulanır. Bu görevde yalnız yerel `istanbul_vitamin_local` tablosu oluşturuldu.
5. Gerçek test için `FIREBASE_ALLOW_NETWORK=true` yalnız kontrollü ortamda açılır. Admin → Firebase Bildirimleri → bu tarayıcıda izin → test gönderimi. Arka plan/kapalı sekme, açık sekme, tıklama ve abonelikten çıkma fiziksel cihazlarda doğrulanır.
6. HTTPS gerekir; localhost geliştirme istisnasıdır. iOS/iPadOS'ta desteklenen sürümde uygulama ana ekrana eklenip oradan açılmalıdır. OS/battery/browser ayarları teslimi etkileyebilir. 90 günden eski cihaz kayıtları gönderim hedefi sayılmaz; üretim operasyonunda eski token temizliği planlanmalıdır.

API: `GET /push/config`, `POST /push/subscribe`, `POST /push/unsubscribe`, super-admin `GET /admin/push/status`, `POST /admin/push/test`. Cihaz uçları IP başına dakikada 10 istekle sınırlı. Test isteği `{device,title,body,path}` biçimindedir; cihaz capability istemci localStorage'dadır ve loglanmamalıdır.

Kaynaklar: [Firebase web başlangıç](https://firebase.google.com/docs/cloud-messaging/web/get-started), [mesaj alma](https://firebase.google.com/docs/cloud-messaging/web/receive-messages), [FCM HTTP v1 yetkilendirme](https://firebase.google.com/docs/cloud-messaging/send/v1-api).
