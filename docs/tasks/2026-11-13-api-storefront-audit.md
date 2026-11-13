# Yerel API ve mağaza akışları incelemesi — 13 Kasım 2026

Kapsam: kategori/marka/fiyat/stok filtreleri, ürün detayı ve yorumlar, favoriler, müşteri oturumu. Çalışma yereldir; canlıya dağıtım yapılmadı.

## Düzeltilenler

- Stok filtresi ön yüzde gönderiliyor ama API tarafından uygulanmıyordu. `in_stock` artık sorguya uygulanıyor.
- Çoklu marka seçimi yalnız ilk markayı gönderiyordu. `brand_ids` çoklu seçim destekliyor; marka seçenekleri bütün sayfalardan alınıyor.
- Filtre değişirken sürmekte olan istek yeni isteği engelliyor, eski sonuçlar ekrana yazılabiliyordu. İstek iptali, ilk sayfaya dönüş, hata/tekrar dene durumu eklendi.
- Öne çıkanlar filtresi toplam sayıldıktan sonra uygulanıyordu. Sayım ve liste artık aynı filtreyi kullanıyor; sıralamada ürün ID eşitlik bozucu olarak kullanılıyor.
- Kampanya ürün filtresi işlenmiyordu; `campaign_id` uygulanıyor. Geçersiz ID/fiyat/stok değerleri 400 dönüyor.
- Kategori ağacı değer kopyaladığı için derin alt kategoriler sıralamaya göre kaybolabiliyordu. Özyinelemeli ağaç oluşturuluyor.
- Favori sağlayıcısı sadece ilk 20 kaydı biliyordu. Bütün sayfaları alıyor; aynı ürüne eşzamanlı işlemi engelliyor; eski oturum yanıtlarını yok sayıyor.
- Favori ekleme/çıkarma tekrarları artık idempotent. Favori sayfası silmeden sonra liste/toplam/sayfayı yeniliyor.
- Yorum olmayan üründe `reviews:null` UI hatasına yol açabiliyordu. API boş dizi dönüyor, UI null'a dayanıklı.
- Genel API normalizasyonu yorum dizisiyle beraber istatistik dönen yanıtı bozabiliyordu. Yalnız tek liste alanlı sarmallar açılıyor.
- Yorum başlığı/gövdesi için API uzunluk sınırları eklendi. Ürün değişince yorum bileşeni durumu sıfırlanıyor.
- Ürün kartı detay yanıtındaki `product` sarmalını açmadığı için varyasyon kontrolü atlanıyordu; düzeltildi.
- Admin oturumu müşteri oturumu sayılıyordu; müşteri giriş durumu artık yalnız müşteri hesabına bağlı.
- Müşteri oturumu HttpOnly cookie ile geri yüklenebiliyor; geçici ağ hatasında saklı token silinmiyor. Sekmeler arası oturum değişimi takip ediliyor, eski oturum yükleme yanıtları engelleniyor.
- Müşteri çıkışı API başarısı beklenerek yapılıyor. Süresi dolmuş token da logout üzerinden cookie'yi temizleyebiliyor.
- Giriş sonrası yönlendirme yalnız site içi yolları kabul ediyor.
- Yerel `NEXT_PUBLIC_CATALOG_PREVIEW` kapatıldı: kart değerlendirmeleri ve fiyatları gerçek veriden geliyor.

## Doğrulama

- `go test -race ./...`: başarılı.
- `npm test`: 17 test başarılı; yeni testler yanıt normalizasyonu, güvenli yönlendirme, favori sayfalama/eşzamanlılık/oturum yarışı davranışını kapsıyor.
- `npx tsc --noEmit`: başarılı.
- `npm run build`: başarılı (son değişikliklerden sonra tekrar kontrol edildi).
- `scripts/test-local-storefront-audit.py`: 64 API kontrolü başarılı. Çoklu marka, stok, fiyat sıralaması, hatalı filtre, kayıt/giriş/cookie/çıkış, 25 favori ile ikinci sayfa, tekrar ekleme/çıkarma, kullanıcı izolasyonu, yorum oluşturma/onaylama/istatistik/silme test edildi.
- Geçici `qa-audit-...@example.invalid` hesapları ve ilişkili yorum/favori/doğrulama kayıtları temizlendi. SMTP kapalıydı; dış sağlayıcı çağrısı yapılmadı.
- Tarayıcıda marka+stok birleşimi, fiyat sıralaması, ürün detayı, boş değerlendirme ve misafir giriş yönlendirmesi incelendi. Girişli favori ve yorum onayı API katmanında doğrulandı; tam girişli tarayıcı turu ve fiziksel mobil cihaz testi yapılmadı.

Kanıt: `output/api-audit-20261113/api-checks.json`, `filters.png`, `reviews.png`.

Bu inceleme tam güvenlik/penetrasyon testi değildir; ödeme, kargo ve dış sağlayıcı akışları bu turun kapsamı dışındadır.
