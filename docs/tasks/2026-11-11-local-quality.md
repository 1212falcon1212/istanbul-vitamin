# İstanbul Vitamin — lokal PWA, footer, Google ve kalite görevi

> Devam çalışması: kutusuz resmi ödeme logoları, Firebase/PWA ve ana sayfa içerik yönetimi için [güncel rapor](2026-11-11-push-home-content.md). Aşağıdaki ilk tur Mastercard bekleme maddesi bu çalışmayla kapandı.

Kapsam: yalnız lokal checkout ve izole servisler. Push, deploy, üretime yazma ve gerçek ödeme/kargo/e-posta/reklam işlemleri yok.

- [x] Yerel dosyaları yedekle, f6b6b79 yayın tabanıyla uzlaştır; env ve DB koru.
- [x] PWA manifest/ikon/kurulum, güvenli offline fallback ve güncelleme.
- [x] Grogin footer, zeminli doğrulanmış ödeme logoları, bağlantılar.
- [x] GA4/Google Ads izinli takip ve gerçek API altyapısı, güvenli yapılandırma, mock testleri.
- [x] Lokal masaüstü/mobil UX, erişilebilirlik ve performans ölçümleri.
- [x] Güvenlik incelemesi ve doğrulanmış düzeltmeler.
- [x] Go backend otomatik testleri ve izole API kontrolleri.
- [x] Kanıtlar ve dış erişim gerektiren bekleyenlerin raporu.

## Başlangıç

Yerel HEAD: 9a7da03. Yayın tabanı: f6b6b79. Çalışan portlar: 3000/8080.
Yerel değişiklikler ve env dosyaları `.local-backups/task-20261111/local-before.tar.gz` içinde yedeklendi; bu özel arşiv Git'e eklenmez.

## Uygulama ilerlemesi

- Checkout `codex/local-quality-20261111`, HEAD `f6b6b79`; eski kaynak ve untracked içerik iki Git stash ve özel arşivde korunuyor. Yayın tabanı ile yerel AutoMigrate/env/bootstrap farkları korundu.
- PWA: 192/512 + maskable + Apple ikonları, offline-only service worker, kullanıcı kontrollü güncelleme. VM sözleşme testleri geçti; tarayıcı kurulum olayı gözlendi.
- Footer: Grogin paleti, dört kolon, bülten/iletişim, zeminli ödeme rozetleri. 13 CMS yardım/kurumsal bağlantısı lokal API'da 200. Yanlış `/vitamin` bağlantısı `/vitaminler` oldu.
- Google: şifreli sunucu yapılandırması, super-admin API/UI, OAuth refresh + GA4 Data API ve Ads read-only rapor sözleşmeleri. Gerçek çağrılar kapalı; kimlikler yok. İzin arayüzü ve e-ticaret eventleri; localhost Google gönderimleri engelli.
- Güvenlik: auth middleware hata sonrası handler'a devam etmesi, public settings sızıntısı, içerik doğrulamayan upload, eksik sağlayıcıda otomatik ödeme başarısı ve stok kontrolünün DB hatasında açık kalması düzeltildi.
- Lokal API: 25 kontrol geçti (benzersiz QA guest sepetleri, stok/miktar/başka sepete erişim); müşteri/sipariş/provider yazımı yok.
- npm ilk tarama: 21 bulgu (1 kritik, 10 yüksek). Next 16.4.6 ve uyumlu transitive güncellemeler sonrası kritik/yüksek 0; 7 orta dereceli dev lint bağımlılık bulgusu kaldı.
- Go ilk tarama: kullanılan kodda 15 bulgu; Go 1.27.4 toolchain ve kitaplık güncellemelerinden sonra kullanılan sembollerde 0 bulgu. İçe aktarılan paketlerde 3, modüllerde 5 çağrılmayan bulgu ayrıca raporlanıyor.

## Sonuç ve doğrulama

Çalışma yalnız `codex/local-quality-20261111` üzerinde, commit/push/deploy yapılmadan bırakıldı. Önizleme http://localhost:3000, API http://localhost:8080. Mevcut env değerleri ve yerel DB korundu; yalnız yerel Google şifreleme anahtarı ve ağ kapatma ayarı eklendi. Migration çalıştırılmadı. Önceki guest sepetindeki 3 ürün korundu; tarayıcı denemesinde eklenen Nuxe ürünü kaldırıldı. API testlerinin benzersiz QA guest sepetleri boş bırakıldı.

### Geçen kontroller

- `cd backend && go test -race ./... -count=1`: geçti. JWT hata/algoritma/süre/rol ayrımı, CSRF, upload içerik doğrulama, sepet stok ve sahiplik, ödeme yapılandırması, Google şifreleme ve HTTP sözleşmeleri kapsanıyor. Tüm iş kurallarının tam kapsaması iddia edilmiyor.
- `cd frontend && npm test`: 8/8. Service worker cache sınırları ve güncelleme, manifest, izin/localhost engeli, event ve purchase deduplikasyonu.
- `cd frontend && npm run build`: production derlemesi ve TypeScript kontrolü geçti.
- `python3 scripts/test-local-api.py`: 25/25 lokal HTTP kontrolü.
- `python3 scripts/test-local-google.py`: admin erişimi, şifreli kayıt, sır maskeleme, public kimlikler ve iki sağlayıcı için 409 ağ engeli geçti; başlangıçtaki boş yapılandırma geri yüklendi.
- Chrome masaüstü ve 390×844 mobil görünüm: ana sayfa, kategori, arama, sonuç bulunamaması, ürün detayı, miktar/sepet/çıkarma, misafir ödeme giriş yönlendirmesi kontrol edildi. Yatay taşma gözlenmedi. Mobil menü Escape ile kapandı, odak Menü düğmesine döndü; kapalı paneller inert/aria-hidden. Temiz sunucu ile açılan son QA sekmesinde console error bulunmadı.
- PWA kurulum teklifi ve kullanıcı onaylı v1→v2 güncelleme görüldü. Yerel frontend durdurulup sayfa yenilendiğinde generic offline ekranı gösterildi; sunucu açılınca tekrar erişildi. Fiyat/stok/sepet/API cevapları service worker cache'ine alınmıyor.
- Google yönetim ekranı mobilde görüntülendi; rapor düğmeleri lokal ağ engeli nedeniyle kapalı. Gerçek Google isteği yapılmadı.

Kanıtlar: `output/local-quality-20261111/` altında build, test, tarama, HTTP ölçüm JSON dosyaları ve `footer-desktop.png`, `footer-mobile.png`, `offline-mobile.png`, `google-admin-mobile.png`.

### Performans ölçümleri

Üç HTTP isteğinin son ikisinin ortalaması, milisaniye. Önce/sonra geliştirme modu aynı yöntemle; düşük örnek sayısı, derleyici ve makine yükü nedeniyle sonuçlar genel performans garantisi değildir. Production sonrası ayrı moddur, önceki dev ile doğrudan karşılaştırılmaz. LCP/INP/Lighthouse ölçülmedi.

| Yol | Dev önce ms | Dev sonra ms | Production sonra ms |
| --- | ---: | ---: | ---: |
| / | 190,6 | 412,0 | 151,0 |
| /magaza | 225,1 | 38,5 | 2,2 |
| /cilt-bakimi | 66,5 | 196,2 | 15,8 |
| /arama?q=nuxe | 56,8 | 64,7 | 12,0 |
| /sepet | 53,2 | 48,1 | 3,5 |
| /odeme | 40,2 | 56,0 | 4,1 |

Ana sayfa ve kategori dev süreleri arttı; dinamik/no-store ticari veri doğruluğu tercihi ve dev derleme yükü mevcut. Tüm rotalarda hızlanma iddiası yok. HTML boyutları ölçülen rotalarda azaldı. Font dosyaları 2.293.424 bayttan 797.168 bayta düştü (%65,2); orijinal fontlar/lisanslar korundu.

### Açık maddeler ve kabul sınırları

- **Google gerçek doğrulama bekliyor:** GA4 property/measurement kimlikleri, Ads customer/conversion kimlikleri, OAuth client/refresh token ve developer token sağlanınca yetkili ortamda read-only rapor ve DebugView/dönüşüm kabulü test edilmeli. OAuth tarayıcı yetkilendirme sihirbazı yok; önceden yetkilendirilmiş refresh token güvenli yönetim formundan giriliyor. Reklam kampanyası oluşturma/harcama ve offline conversion upload bu kapsamda yok. Lokal ağ engeli açık kalıyor.
- **Mastercard resmi görsel bekliyor:** resmi indirme erişimi sağlanamadığından metin rozeti kullanıldı. Visa, TROY ve PayTR kaynakları `docs/integrations/payment-assets.md` içinde; banka logosu/ortaklık iddiası eklenmedi.
- OS düzeyinde uygulama kurma ve gerçek iOS/Android cihaz kabulü yapılmadı. Chrome responsive kontrolü fiziksel cihaz testi değildir.
- Gerçek müşteriyle ödeme/sipariş tamamlama, PayTR/kargo/e-posta ve iade akışları bu görevde çalıştırılmadı. Üretim taraması veya yük/eşzamanlı stok testi yapılmadı.
- npm audit: kritik/yüksek 0, geliştirme amaçlı ESLint zincirinde 7 orta bulgu kalıyor. Zorunlu majör bağımlılık kırılması uygulanmadı. Go reachable sembollerde 0 bulgu; çağrılmayan paket/modül bulguları ayrıca yukarıda belirtildi. Bu sonuçlar kapsamlı sızma testi sertifikası değildir.
- Yerel değişiklikler kullanıcı kabulünden sonra ayrıca gözden geçirilip commit/release yapılmalı; bu görev üretimi değiştirmedi.
