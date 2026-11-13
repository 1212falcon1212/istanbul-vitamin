# Şeffaf logolar, Firebase/PWA ve yönetilebilir ana sayfa

Yalnız yerel `codex/local-quality-20261111`. Önceki çalışma ve yerel servisler korunuyor; commit/push/deploy yok. Firebase projesi henüz oluşturulmadı, gerçek bildirim gönderilmedi.

## Yapılanlar

- Visa, Mastercard, TROY ve PayTR resmi şeffaf görselleri; kutu, border ve renkli rozet zemini kaldırıldı. Referanstaki Garanti logosu mevcut ödeme entegrasyonuna ait olmadığı için eklenmedi. Kaynaklar: `docs/integrations/payment-assets.md`.
- İlk ziyaret PWA teklifi artık `beforeinstallprompt` gelmesini beklemiyor. Yerel kurulum desteklenirse düğme açar; iOS/diğer tarayıcı yönergesi alternatifi var. Kapatma saklanır, footer tercihlerinden yeniden açılır. Bildirim izni kullanıcı eylemiyle istenir.
- Firebase App/Messaging istemcisi, cihaz kaydı/yenileme/silme, shared service worker foreground/background alıcısı, same-origin tıklama, Go OAuth + FCM HTTP v1 data-only gönderim istemcisi hazır. Super-admin test ekranı `/yonetim/bildirimler`. Varsayılan ağ gönderimi kapalı. Kurulum ve gerçek proje adımları `docs/integrations/firebase-push.md`.
- Ayar ekranında grup adları sekme adlarından farklı olsa da mevcut değerlerin okunması sağlandı: ekran artık anahtar bazında tüm redakte admin ayarlarını okuyor. Alan etiketleri inputlara bağlandı; yükleme hatasında kaydetme engelleniyor.
- Genel ayarlar: üst şerit türü `Metin duyurusu / Görsel banner`, masaüstü ve mobil görsel yükleme, alternatif metin ve bağlantı. Boş mobil görsel masaüstüne düşer. Üst şerit gizlenebilir; yardımcı üst menü ayrı gizlenebilir.
- `/yonetim/anasayfa`: aşağıdaki kaynak eşlemesiyle sabit pazarlama alanları düzenlenebilir. İsteğe bağlı ürün ID'leri gerçek public API'dan aktif ürünleri çeker; liste sırası korunur. Boş ID = mevcut otomatik seçki.

## Ana sayfa kaynak denetimi

| Alan | Yönetim kaynağı / yeni kontrol |
| --- | --- |
| Sayfa title/description | Ana Sayfa İçerikleri → SEO |
| Logo, iletişim, sosyal hesaplar | Site Ayarları → Marka / İletişim / Sosyal Medya |
| Üst şerit metni/görseli/linki | Site Ayarları → Genel |
| Üst yardımcı metin/linkler, ana navigasyon | Ana Sayfa İçerikleri → Üst menü |
| Slider görsel, mobil görsel, başlık, link, renk, sıralama, zaman | Bannerlar → Ana slider (mevcut) |
| Slider erişilebilir başlık, üst yazı, dört avantaj | Ana Sayfa İçerikleri → Ana slider ve avantajlar |
| Ana sayfa bölümleri | Görünürlük ve yukarı/aşağı sıra; hero ayrıca aç/kapa |
| 3'lü, 4'lü, ikili, ürün arası, şerit, marka bannerı | Bannerlar (mevcut); bölüm görünürlüğü/sırası yeni içerik ekranında |
| Yeni gelen/çok satan sekmeleri | Başlık, sekme adları, manuel ürün ID'leri veya otomatik |
| Öne çıkan ürünler | Başlık/açıklama/link ve manuel ürün ID'leri veya otomatik |
| Bannerlı ürün satırları | Başlık/açıklama/link; çok satan seçkisindeki ürünler |
| Marka vitrini | Marka slug ve manuel ürün seçimi veya mevcut otomatik marka |
| Kategori ürünleri | Başlık/açıklama, kategori ID sırası, başlangıç kategori slug; ürünler katalogdan |
| Markalar satırı | Başlık/açıklama/link, kart metni, marka ID sırası ve adet |
| Banner üst yazısı | Ana Sayfa İçerikleri → Banner üst yazısı |
| Footer giriş/iletişim yönlendirmesi/kolonlar/yasal linkler | Ana Sayfa İçerikleri → Alt alan |
| Bülten ve ödeme metinleri/görünürlüğü | Ana Sayfa İçerikleri → Alt alan |
| PWA ve bildirim teklif metinleri/görünürlüğü | Ana Sayfa İçerikleri → Uygulama ve bildirim teklifi |
| Ürün adı/fiyat/stok/görseller, kategori/marka adları | İlgili katalog yönetimi (mevcut) |

Sepet, giriş, arama, hata/erişilebilirlik yönergeleri gibi işlevsel arayüz etiketleri uygulama kodunda kalır. Resmi ödeme markaları dosya olarak korunur. Kullanılmayan eski homepage bileşenleri görünür alan sayılmadı. Scoped Graphify AST taraması 23 home kaynak dosyasında 76 düğüm/229 ilişki üretti; gerçek render ağacı ve admin kaynakları ayrıca elle karşılaştırıldı. Bu tarama tüm repo grafiği değildir.

## Doğrulama

- Next production derlemesi ve TypeScript geçti.
- 11 frontend testi: önceki marketing/offline kontrollerine ek olarak içerik tipleri/boş değerler/bölüm tekilliği, background ve foreground bildirim, site dışı tıklama engeli.
- `go test -race ./... -count=1` geçti. Firebase mock transport ile OAuth assertion + FCM data-only sözleşmesi, ağ kapatma ve bağlantı doğrulama testleri eklendi; gerçek sağlayıcı çağrısı yok.
- `scripts/test-local-content-push.py`: kimlik doğrulama, ağ ve girdi engelleri, public sır kontrolü, yerel tablo, ayar yaz/oku/geri-al, bozuk JSON reddi, manuel ürün filtresi geçti.
- Chrome'da admin formundan başlık değiştir/kaydet → ana sayfada başlık görüldü → başlangıç içeriği geri alındı. PWA v3 güncellemesi ve ilk ziyaret teklifi görüldü. Ödeme logoları kutusuz/şeffaf doğrulandı. Üst şerit panelden kaydedildi; desktop kaynak ve 390px mobilde ayrı mobile kaynak loaded=true, yatay taşma yok; deneme görselleri başlangıç ayarına geri alındı.
- Yalnız lokal `push_subscriptions` tablosu eklendi; üretim migration uygulanmadı. API ve tarayıcı test ayarları geri alındı; boş yeni ayar satırları varsayılan görünümü kullanır. Mevcut guest sepet korunuyor.
- Bağımlılıklar yalnız `@firebase/app` ve `@firebase/messaging`; kullanılmayan Firestore paketi eklenmedi. npm'de önceden var olan 7 orta geliştirme/lint bulgusu sürüyor; kritik/yüksek yok.

Kanıt dizini: `output/local-quality-20261111-followup/`.

## Dış doğrulama bekleyenler

Firebase projesi/Web App/VAPID/servis hesabı bağlantısı, gerçek HTTPS cihazda izin/teslim/tıklama/abonelikten çıkma ve iOS/Android uygulama kabulü. Toplu bildirim kampanyası veya otomatik sipariş bildirimi bu altyapıya ayrıca eklenebilir; şu an admin testi yalnız kaydedilen tarayıcıya yöneliktir.
