-- ============================================================
-- Migration 029: Yasal CMS sayfalarını garanti et
-- KVKK, Gizlilik Politikası, Kullanım Koşulları, Çerez Politikası.
-- Mevcut admin düzenlemelerini ezmez; boş alanları doldurur ve sayfayı aktifler.
-- ============================================================

INSERT INTO `pages` (`slug`, `title`, `content`, `is_active`, `meta_title`, `meta_description`, `created_at`, `updated_at`) VALUES
('kvkk', 'KVKK Aydınlatma Metni',
'<p class="lead">İstanbul Vitamin olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.</p>
<h2>1. Veri Sorumlusu</h2>
<p>İstanbul Vitamin, kişisel verilerinizin işlenmesinde veri sorumlusu sıfatıyla hareket eder. İletişim için <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine yazabilirsiniz.</p>
<h2>2. İşlenen Kişisel Veriler</h2>
<ul>
  <li><strong>Kimlik bilgileri:</strong> ad, soyad</li>
  <li><strong>İletişim bilgileri:</strong> e-posta, telefon, teslimat ve fatura adresi</li>
  <li><strong>Müşteri işlem bilgileri:</strong> sipariş geçmişi, sepet, favori ürünler</li>
  <li><strong>Ödeme bilgileri:</strong> ödeme türü, fatura tutarı; kart numarası saklanmaz, PayTR token üzerinden işlenir</li>
  <li><strong>İşlem güvenliği bilgileri:</strong> IP adresi, oturum bilgileri, çerez verileri</li>
</ul>
<h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
<ul>
  <li>Sipariş, teslimat ve faturalandırma süreçlerinin yürütülmesi</li>
  <li>Müşteri hesabının oluşturulması ve yönetilmesi</li>
  <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
  <li>Pazarlama izni vermiş kullanıcılara kampanya bildirimleri gönderilmesi</li>
  <li>Site güvenliği ve dolandırıcılık önleme</li>
</ul>
<h2>4. Verilerin Aktarımı</h2>
<p>Kişisel verileriniz; kargo firmaları, ödeme kuruluşu, e-fatura entegrasyon sağlayıcısı ve mevzuatın öngördüğü resmi makamlar ile sınırlı olarak paylaşılabilir.</p>
<h2>5. Haklarınız</h2>
<p>KVKK 11. madde kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini, silinmesini ve işlemeye itiraz etme haklarına sahipsiniz. Başvurularınızı <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine iletebilirsiniz.</p>',
1, 'KVKK Aydınlatma Metni | İstanbul Vitamin', 'İstanbul Vitamin KVKK kapsamında kişisel verilerinizin nasıl işlendiğini açıklayan aydınlatma metni.', NOW(), NOW()),

('gizlilik-politikasi', 'Gizlilik Politikası',
'<p class="lead">Bu Gizlilik Politikası, İstanbul Vitamin web sitesini kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.</p>
<h2>Hangi Bilgileri Topluyoruz?</h2>
<p>Sitemizde alışveriş yapmak, hesap oluşturmak veya bültene abone olmak için bizimle paylaştığınız bilgileri ve sitedeki davranışlarınızdan otomatik olarak toplanan teknik verileri işleriz.</p>
<h2>Bilgileri Nasıl Kullanıyoruz?</h2>
<ul>
  <li>Siparişlerinizin işlenmesi ve teslim edilmesi</li>
  <li>Hesap güvenliğinin sağlanması</li>
  <li>Yasal yükümlülüklerin yerine getirilmesi</li>
  <li>İzin verdiyseniz kampanya ve yenilik bildirimleri gönderilmesi</li>
</ul>
<h2>Çerezler</h2>
<p>Site deneyimini iyileştirmek için çerezler kullanırız. Detaylar için <a href="/cerez-politikasi">Çerez Politikası</a> sayfamıza bakabilirsiniz.</p>
<h2>Veri Güvenliği</h2>
<p>Kişisel verileriniz SSL ile şifrelenerek iletilir; ödeme bilgileriniz ödeme kuruluşu altyapısıyla işlenir ve kart numaranız sunucularımızda saklanmaz.</p>
<h2>İletişim</h2>
<p>Gizlilik konusundaki sorularınız için <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine yazabilirsiniz.</p>',
1, 'Gizlilik Politikası | İstanbul Vitamin', 'İstanbul Vitamin gizlilik politikası: kişisel verilerin toplanması, kullanılması ve korunması.', NOW(), NOW()),

('kullanim-kosullari', 'Kullanım Koşulları',
'<p class="lead">İstanbul Vitamin web sitesini kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Lütfen kullanmaya başlamadan önce dikkatlice okuyunuz.</p>
<h2>1. Üyelik ve Hesap</h2>
<p>Üye olarak verdiğiniz bilgilerin doğruluğundan siz sorumlusunuz. Hesap güvenliğini sağlamak sizin yükümlülüğünüzdedir.</p>
<h2>2. Sipariş ve Ödeme</h2>
<ul>
  <li>Tüm fiyatlar Türk Lirası cinsinden ve KDV dahildir.</li>
  <li>Sipariş onayından sonra fiyat güncellemesi siparişinizi etkilemez.</li>
  <li>Ödeme güvenli ödeme altyapısı üzerinden alınır.</li>
  <li>Stokta olmayan ürünler için sipariş tutarı iade edilir.</li>
</ul>
<h2>3. Teslimat</h2>
<p>Siparişler, ödeme onayını takip eden iş günleri içinde anlaşmalı kargo ile gönderilir. Teslim süreleri kargo şirketinin yoğunluğuna göre değişebilir.</p>
<h2>4. İade ve Değişim</h2>
<p>Mesafeli Satış Sözleşmesi gereği, ürünü teslim aldığınız tarihten itibaren 14 gün içinde cayma hakkınız vardır. Hijyen koşulları gereği açılmış kozmetik/dermokozmetik ürünler iade kapsamı dışında olabilir.</p>
<h2>5. Fikri Mülkiyet</h2>
<p>Sitedeki tüm içerik İstanbul Vitamin veya ilgili lisans sahiplerine aittir. Yazılı izin olmadan kopyalanamaz veya yeniden yayımlanamaz.</p>',
1, 'Kullanım Koşulları | İstanbul Vitamin', 'İstanbul Vitamin web sitesi kullanım koşulları, üyelik, sipariş, ödeme, teslimat ve iade kuralları.', NOW(), NOW()),

('cerez-politikasi', 'Çerez Politikası',
'<p class="lead">Bu Çerez Politikası, istanbulvitamin.com sitesinde kullanılan çerezleri ve benzeri teknolojileri açıklar.</p>
<h2>Çerez Nedir?</h2>
<p>Çerezler, ziyaret ettiğiniz siteler tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır. Tercihlerinizi hatırlamak ve site deneyimini iyileştirmek için kullanılır.</p>
<h2>Hangi Çerezleri Kullanıyoruz?</h2>
<ul>
  <li><strong>Zorunlu çerezler:</strong> Oturum, sepet ve giriş bilgilerini taşır.</li>
  <li><strong>Performans çerezleri:</strong> Sayfa yüklenme süreleri ve hata istatistikleri toplanır.</li>
  <li><strong>Tercih çerezleri:</strong> Site kullanım tercihlerini saklar.</li>
  <li><strong>Pazarlama çerezleri:</strong> Sadece izin vermeniz halinde kampanya tanıtımları için kullanılır.</li>
</ul>
<h2>Çerezleri Nasıl Yönetirim?</h2>
<p>Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezleri devre dışı bırakırsanız sepet, giriş ve sipariş gibi temel özellikler çalışmayabilir.</p>
<h2>İletişim</h2>
<p>Çerez kullanımı hakkındaki sorularınız için <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine yazabilirsiniz.</p>',
1, 'Çerez Politikası | İstanbul Vitamin', 'İstanbul Vitamin çerez politikası: kullanılan çerez türleri, amaçları ve nasıl yönetebileceğiniz.', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `title` = IF(TRIM(`title`) = '', VALUES(`title`), `title`),
  `content` = IF(TRIM(`content`) = '', VALUES(`content`), `content`),
  `is_active` = 1,
  `meta_title` = IF(TRIM(`meta_title`) = '', VALUES(`meta_title`), `meta_title`),
  `meta_description` = IF(TRIM(`meta_description`) = '', VALUES(`meta_description`), `meta_description`),
  `updated_at` = NOW();
