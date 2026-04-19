-- ============================================================
-- Migration 024: Temel CMS sayfaları seed
-- Footer ve admin panelinde düzenlenebilir 10 sayfa.
-- İçerik HTML — admin panelden zengin değiştirilebilir.
-- ============================================================

-- UP

-- Önce aynı slug'lar varsa temizle (idempotent çalışsın)
DELETE FROM `pages` WHERE `slug` IN (
    'hakkimizda', 'kariyer', 'blog', 'basin', 'iletisim',
    'siparis-takibi', 'kargo-teslimat', 'iade-degisim', 'sss', 'musteri-hizmetleri'
);

INSERT INTO `pages` (`slug`, `title`, `content`, `is_active`, `meta_title`, `meta_description`, `created_at`, `updated_at`) VALUES

-- KURUMSAL
('hakkimizda', 'Hakkımızda',
'<p class="lead">İstanbul Vitamin, dermokozmetik ve sağlıklı yaşam ürünlerinde güvenilir bir çevrimiçi eczane ve markadır.</p>
<h2>Misyonumuz</h2>
<p>Her ciltten, her bütçeden müşterimize orijinal dermokozmetik ürünleri hızlı ve güvenli teslim etmek. Eczane standartlarını e-ticaretin rahatlığıyla birleştirmek.</p>
<h2>Ürün Yelpazemiz</h2>
<p>5.000+ orijinal ürün, 200+ marka. Cilt bakımı, güneş ürünleri, saç bakımı, vitaminler, anne-bebek ürünleri ve daha fazlası.</p>
<h2>Neden Biz?</h2>
<ul>
  <li><strong>Orijinal Ürün Garantisi:</strong> Tüm ürünlerimiz yetkili distribütörlerden gelir.</li>
  <li><strong>Hızlı Kargo:</strong> Aynı gün kargoya verme, 1-3 iş günü teslimat.</li>
  <li><strong>Güvenli Ödeme:</strong> 256-bit SSL, 3D Secure desteği.</li>
  <li><strong>Eczacı Danışmanlığı:</strong> Ürün seçiminde profesyonel destek.</li>
</ul>',
1, 'Hakkımızda | İstanbul Vitamin', 'İstanbul Vitamin dermokozmetik ve sağlıklı yaşam ürünlerinde güvenilir çevrimiçi eczane.', NOW(), NOW()),

('kariyer', 'Kariyer',
'<p class="lead">İstanbul Vitamin ailesinin bir parçası olmak ister misiniz?</p>
<h2>Neden Bizde Çalışmalısınız?</h2>
<p>Dinamik, genç ve sürekli büyüyen bir ekibiz. Müşteri memnuniyetini ön planda tutan, öğrenmeye ve gelişmeye açık insanlarla çalışmayı seviyoruz.</p>
<h2>Açık Pozisyonlar</h2>
<p>Şu an açık pozisyonumuz bulunmamaktadır. Özgeçmişinizi yine de <a href="mailto:kariyer@istanbulvitamin.com">kariyer@istanbulvitamin.com</a> adresine gönderebilirsiniz; ileride uygun bir pozisyon açıldığında sizinle iletişime geçelim.</p>
<h2>Başvuru İçin Gerekenler</h2>
<ul>
  <li>Detaylı özgeçmiş (PDF)</li>
  <li>Kısa bir motivasyon metni</li>
  <li>Başvurduğunuz alan veya beklentiniz</li>
</ul>',
1, 'Kariyer | İstanbul Vitamin', 'İstanbul Vitamin ekibinde kariyer fırsatları.', NOW(), NOW()),

('blog', 'Blog',
'<p class="lead">Cilt bakımı, sağlık, güzellik ve yaşam üzerine uzman yazılar.</p>
<h2>Yakında</h2>
<p>Blog içeriklerimiz hazırlanıyor. Dermokozmetik ürünlerini doğru seçme, mevsimsel cilt bakımı, vitamin takviyeleri ve daha fazlası üzerine düzenli içerik yayımlayacağız.</p>
<p>Güncellemelerden haberdar olmak için footer bölümündeki bültenimize abone olabilirsiniz.</p>',
1, 'Blog | İstanbul Vitamin', 'Cilt bakımı, sağlık ve güzellik blog yazıları.', NOW(), NOW()),

('basin', 'Basın',
'<p class="lead">Basın bültenlerimiz, medya kitimiz ve iletişim bilgileri.</p>
<h2>Basın İletişim</h2>
<p>Medya talepleri ve röportaj için: <a href="mailto:basin@istanbulvitamin.com">basin@istanbulvitamin.com</a></p>
<h2>Medya Kiti</h2>
<p>Logo, marka yönergesi ve yüksek çözünürlüklü görseller için bizimle iletişime geçin.</p>
<h2>Yayınlar ve Bahsi Geçen Yerler</h2>
<p>Yakında burada yayınlayacağız.</p>',
1, 'Basın | İstanbul Vitamin', 'İstanbul Vitamin basın bültenleri ve medya kiti.', NOW(), NOW()),

('iletisim', 'İletişim',
'<p class="lead">Size yardımcı olmaktan memnuniyet duyarız. Aşağıdaki kanallardan bize ulaşabilirsiniz.</p>
<h2>Müşteri Hizmetleri</h2>
<ul>
  <li><strong>Telefon:</strong> <a href="tel:08501234567">0850 123 45 67</a> (Pzt-Cmt 09:00–18:00)</li>
  <li><strong>E-posta:</strong> <a href="mailto:destek@istanbulvitamin.com">destek@istanbulvitamin.com</a></li>
  <li><strong>WhatsApp:</strong> 0850 123 45 67 (mesaj)</li>
</ul>
<h2>Adres</h2>
<p>İstanbul Vitamin<br>Örnek Mah. Deneme Sk. No: 1<br>Kadıköy / İstanbul</p>
<h2>Kurumsal İletişim</h2>
<ul>
  <li>Basın: <a href="mailto:basin@istanbulvitamin.com">basin@istanbulvitamin.com</a></li>
  <li>Kariyer: <a href="mailto:kariyer@istanbulvitamin.com">kariyer@istanbulvitamin.com</a></li>
  <li>İş Birlikleri: <a href="mailto:b2b@istanbulvitamin.com">b2b@istanbulvitamin.com</a></li>
</ul>',
1, 'İletişim | İstanbul Vitamin', 'İstanbul Vitamin iletişim bilgileri ve müşteri hizmetleri.', NOW(), NOW()),

-- YARDIM
('siparis-takibi', 'Sipariş Takibi',
'<p class="lead">Siparişinizin durumunu kolayca takip edebilirsiniz.</p>
<h2>Üye Girişi ile Takip</h2>
<p><a href="/hesabim/siparisler">Hesabım → Siparişlerim</a> sayfasından tüm siparişlerinizi ve güncel durumlarını görebilirsiniz.</p>
<h2>Sipariş Durumları</h2>
<ul>
  <li><strong>Sipariş Oluşturuldu:</strong> Ödemeniz onaylandı, sipariş hazırlanıyor.</li>
  <li><strong>Kargolandı:</strong> Siparişiniz kargo firmasına teslim edildi; takip numarası hesabınızda görünür.</li>
  <li><strong>Tamamlandı:</strong> Siparişiniz teslim edildi.</li>
</ul>
<h2>Kargo Takibi</h2>
<p>Kargonuz çıktıktan sonra size e-posta ile takip linki gönderilir. Kargo firmalarının sitelerinden de takip numaranızla sorgulama yapabilirsiniz.</p>',
1, 'Sipariş Takibi | İstanbul Vitamin', 'İstanbul Vitamin sipariş takibi ve kargo durumu.', NOW(), NOW()),

('kargo-teslimat', 'Kargo & Teslimat',
'<p class="lead">Hızlı, güvenli ve ücretsiz kargo seçeneklerimiz.</p>
<h2>Kargo Firmaları</h2>
<p>Yurtiçi Kargo ve MNG Kargo ile Türkiye''nin her yerine teslimat yapılır.</p>
<h2>Kargo Ücreti</h2>
<ul>
  <li><strong>Standart Kargo:</strong> 39,90 TL (500 TL üzeri alışverişte ücretsiz)</li>
  <li><strong>Hızlı Kargo:</strong> 59,90 TL (aynı gün kargoya verilir)</li>
</ul>
<h2>Teslimat Süreleri</h2>
<ul>
  <li><strong>Standart:</strong> 2-3 iş günü</li>
  <li><strong>Hızlı:</strong> 1 iş günü (büyük şehirler)</li>
</ul>
<h2>Aynı Gün Kargo</h2>
<p>Hafta içi 14:00''e kadar verilen siparişler aynı gün kargoya verilir.</p>',
1, 'Kargo & Teslimat | İstanbul Vitamin', 'Kargo ücretleri, teslimat süreleri ve kargo firmaları.', NOW(), NOW()),

('iade-degisim', 'İade ve Değişim',
'<p class="lead">14 gün içinde iade hakkı — sorunsuz, hızlı çözüm.</p>
<h2>İade Koşulları</h2>
<ul>
  <li>Ürünü teslim aldığınız tarihten itibaren <strong>14 gün</strong> içinde iade edebilirsiniz.</li>
  <li>Ürün orijinal ambalajında, kullanılmamış ve satılabilir durumda olmalıdır.</li>
  <li>Hijyen gereği açılmış kozmetik ürünler iade edilemez.</li>
</ul>
<h2>İade Süreci</h2>
<ol>
  <li><a href="/hesabim/siparisler">Siparişlerim</a> sayfasından ilgili siparişi seçin.</li>
  <li>İade talebinizi açıklamasıyla birlikte iletin.</li>
  <li>Onayımızdan sonra anlaşmalı kargo ile ücretsiz iade edebilirsiniz.</li>
  <li>Ürünümüze ulaştığında 3 iş günü içinde incelenir ve iadeniz başlatılır.</li>
</ol>
<h2>Para İadesi</h2>
<p>İade onaylandığında ödemenin yapıldığı karta 3-5 iş günü içinde para iadesi yapılır.</p>',
1, 'İade ve Değişim | İstanbul Vitamin', '14 gün içinde ücretsiz iade ve değişim koşulları.', NOW(), NOW()),

('sss', 'Sıkça Sorulan Sorular',
'<p class="lead">En çok merak edilenlere cevaplar.</p>

<h3>Ürünleriniz orijinal mi?</h3>
<p>Evet. Tüm ürünlerimiz yetkili distribütör veya doğrudan marka kaynağından gelir; orijinal, lot numaralı ve Türkçe etiketlidir.</p>

<h3>Kargo ne zaman gelir?</h3>
<p>Hafta içi 14:00''e kadar verilen siparişler aynı gün kargoya verilir. Teslimat süresi 1-3 iş günüdür.</p>

<h3>500 TL üzeri alışveriş gerçekten kargo bedava mı?</h3>
<p>Evet, 500 TL üzeri tüm siparişlerde standart kargo tamamen ücretsizdir.</p>

<h3>Hangi ödeme yöntemlerini kabul ediyorsunuz?</h3>
<p>Kredi kartı (Visa, Mastercard, Troy), banka kartı, havale/EFT ve online ödeme çözümleri (PayTR).</p>

<h3>Kredi kartı bilgilerim güvende mi?</h3>
<p>Kart bilgileriniz sitemizde saklanmaz; 256-bit SSL ve 3D Secure ile korunmalı olarak doğrudan PayTR altyapısına iletilir.</p>

<h3>İade yaparsam kargo ücreti bana ait mi?</h3>
<p>Hayır. Anlaşmalı kargo firmamızla iade kargosu tamamen ücretsizdir.</p>

<h3>Üye olmadan alışveriş yapabilir miyim?</h3>
<p>Evet, üye olmadan sipariş verebilirsiniz. Ancak siparişlerinizi takip etmek ve hızlı yeniden alışveriş için üyelik önerilir.</p>',
1, 'Sıkça Sorulan Sorular | İstanbul Vitamin', 'Ürün, kargo, ödeme ve iade ile ilgili sık sorulan sorular.', NOW(), NOW()),

('musteri-hizmetleri', 'Müşteri Hizmetleri',
'<p class="lead">Size yardımcı olmak için buradayız.</p>
<h2>Çalışma Saatlerimiz</h2>
<ul>
  <li><strong>Pazartesi – Cumartesi:</strong> 09:00 – 18:00</li>
  <li><strong>Pazar:</strong> Kapalı</li>
</ul>
<h2>İletişim Kanalları</h2>
<ul>
  <li><strong>Telefon:</strong> <a href="tel:08501234567">0850 123 45 67</a></li>
  <li><strong>E-posta:</strong> <a href="mailto:destek@istanbulvitamin.com">destek@istanbulvitamin.com</a> (24 saat içinde yanıt)</li>
  <li><strong>WhatsApp:</strong> 0850 123 45 67</li>
  <li><strong>Canlı Destek:</strong> Sağ alttaki destek balonundan anlık sohbet başlatabilirsiniz.</li>
</ul>
<h2>Hangi Konularda Destek?</h2>
<ul>
  <li>Ürün önerileri ve eczacı danışmanlığı</li>
  <li>Sipariş durumu ve kargo bilgisi</li>
  <li>İade ve değişim</li>
  <li>Fatura ve ödeme</li>
  <li>Kullanıcı hesabı sorunları</li>
</ul>',
1, 'Müşteri Hizmetleri | İstanbul Vitamin', 'İstanbul Vitamin müşteri hizmetleri, canlı destek ve iletişim kanalları.', NOW(), NOW());
