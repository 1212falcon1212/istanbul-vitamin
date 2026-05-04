-- ============================================================
-- Migration 026: Yasal sayfalar seed (footer linkleri)
-- KVKK, Gizlilik Politikası, Kullanım Koşulları, Çerez Politikası.
-- Admin panelinden zengin metin ile düzenlenebilir.
-- ============================================================

-- UP

DELETE FROM `pages` WHERE `slug` IN (
    'kvkk', 'gizlilik-politikasi', 'kullanim-kosullari', 'cerez-politikasi'
);

INSERT INTO `pages` (`slug`, `title`, `content`, `is_active`, `meta_title`, `meta_description`, `created_at`, `updated_at`) VALUES

('kvkk', 'KVKK Aydınlatma Metni',
'<p class="lead">İstanbul Vitamin olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.</p>
<h2>1. Veri Sorumlusu</h2>
<p>İstanbul Vitamin, kişisel verilerinizin işlenmesinde veri sorumlusu sıfatıyla hareket eder. İletişim için <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine yazabilirsiniz.</p>
<h2>2. İşlenen Kişisel Veriler</h2>
<ul>
  <li><strong>Kimlik bilgileri:</strong> ad, soyad</li>
  <li><strong>İletişim bilgileri:</strong> e-posta, telefon, teslimat ve fatura adresi</li>
  <li><strong>Müşteri işlem bilgileri:</strong> sipariş geçmişi, sepet, favori ürünler</li>
  <li><strong>Ödeme bilgileri:</strong> ödeme türü, fatura tutarı (kart numarası saklanmaz, PayTR token üzerinden işlenir)</li>
  <li><strong>İşlem güvenliği bilgileri:</strong> IP adresi, oturum bilgileri, çerez verileri</li>
</ul>
<h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
<ul>
  <li>Sipariş, teslimat ve faturalandırma süreçlerinin yürütülmesi</li>
  <li>Müşteri hesabının oluşturulması ve yönetilmesi</li>
  <li>Hukuki yükümlülüklerin yerine getirilmesi (vergi, fatura, ticari defter)</li>
  <li>Pazarlama izni vermiş kullanıcılara kampanya bildirimleri gönderilmesi</li>
  <li>Site güvenliği ve dolandırıcılık önleme</li>
</ul>
<h2>4. Verilerin Aktarımı</h2>
<p>Kişisel verileriniz; kargo firmaları, ödeme kuruluşu (PayTR), e-fatura entegrasyon sağlayıcısı (Bizimhesap) ve mevzuatın öngördüğü resmi makamlar ile sınırlı olarak paylaşılabilir. Yurt dışına aktarım yapılmaz.</p>
<h2>5. Haklarınız</h2>
<p>KVKK 11. madde kapsamında, kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini, silinmesini ve işlemeye itiraz etme haklarına sahipsiniz. Başvurularınızı <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine iletebilirsiniz.</p>',
1, 'KVKK Aydınlatma Metni | İstanbul Vitamin', 'İstanbul Vitamin KVKK kapsamında veri sorumlusu olarak kişisel verilerinizin nasıl işlendiğini açıklayan aydınlatma metni.', NOW(), NOW()),

('gizlilik-politikasi', 'Gizlilik Politikası',
'<p class="lead">Bu Gizlilik Politikası, İstanbul Vitamin web sitesini kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.</p>
<h2>Hangi Bilgileri Topluyoruz?</h2>
<p>Sitemizde alışveriş yapmak, hesap oluşturmak veya bültene abone olmak için bizimle paylaştığınız bilgileri (ad, e-posta, adres, telefon, ödeme bilgileri) ve sitedeki davranışlarınızdan otomatik olarak toplanan bilgileri (IP, tarayıcı, çerez verileri) işleriz.</p>
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
<p>Kişisel verileriniz 256-bit SSL ile şifrelenerek iletilir, ödeme bilgileriniz PCI DSS uyumlu PayTR altyapısıyla işlenir; kart numaranız sunucularımızda saklanmaz.</p>
<h2>İletişim</h2>
<p>Gizlilik konusundaki sorularınız için <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine yazabilirsiniz.</p>',
1, 'Gizlilik Politikası | İstanbul Vitamin', 'İstanbul Vitamin gizlilik politikası: kişisel verilerin toplanması, kullanılması ve korunması.', NOW(), NOW()),

('kullanim-kosullari', 'Kullanım Koşulları',
'<p class="lead">İstanbul Vitamin web sitesini kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Lütfen kullanmaya başlamadan önce dikkatlice okuyunuz.</p>
<h2>1. Üyelik ve Hesap</h2>
<p>Üye olarak verdiğiniz bilgilerin doğruluğundan siz sorumlusunuz. Hesap güvenliğini sağlamak (parola gizliliği vb.) sizin yükümlülüğünüzdedir.</p>
<h2>2. Sipariş ve Ödeme</h2>
<ul>
  <li>Tüm fiyatlar Türk Lirası (₺) cinsinden ve KDV dahildir.</li>
  <li>Sipariş onayından sonra fiyat güncellemesi siparişinizi etkilemez.</li>
  <li>Ödeme PayTR altyapısı üzerinden 3D Secure ile alınır.</li>
  <li>Stokta olmayan ürünler için sipariş tutarı tam olarak iade edilir.</li>
</ul>
<h2>3. Teslimat</h2>
<p>Siparişler, ödeme onayını takip eden 1-3 iş günü içinde anlaşmalı kargo ile gönderilir. Teslim süreleri kargo şirketinin yoğunluğuna göre değişebilir.</p>
<h2>4. İade ve Değişim</h2>
<p>Mesafeli Satış Sözleşmesi gereği, ürünü teslim aldığınız tarihten itibaren 14 gün içinde cayma hakkınız vardır. Hijyen koşulları gereği açılmış kozmetik/dermokozmetik ürünler iade kapsamı dışındadır. Detaylar için <a href="/iade-degisim">İade ve Değişim</a> sayfasına bakınız.</p>
<h2>5. Fikri Mülkiyet</h2>
<p>Sitedeki tüm içerik (logo, metin, görsel) İstanbul Vitamin\'e veya ilgili lisans sahiplerine aittir. Yazılı izin olmadan kopyalanamaz veya yeniden yayımlanamaz.</p>
<h2>6. Sorumluluk Sınırı</h2>
<p>Site; ürün açıklamalarındaki olası dizgi hataları, geçici erişim kesintileri ve kargo kaynaklı gecikmelerden ötürü doğacak dolaylı zararlardan sorumlu tutulamaz.</p>
<h2>7. Yetkili Mahkeme</h2>
<p>İşbu sözleşmenin uygulanmasından doğacak uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Müdürlükleri yetkilidir.</p>',
1, 'Kullanım Koşulları | İstanbul Vitamin', 'İstanbul Vitamin web sitesi kullanım koşulları, üyelik, sipariş, ödeme, teslimat ve iade kuralları.', NOW(), NOW()),

('cerez-politikasi', 'Çerez Politikası',
'<p class="lead">Bu Çerez Politikası, istanbulvitamin.com sitesinde kullanılan çerezleri (cookies) ve benzeri teknolojileri açıklar.</p>
<h2>Çerez Nedir?</h2>
<p>Çerezler, ziyaret ettiğiniz siteler tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır. Tercihlerinizi hatırlamak ve site deneyimini iyileştirmek için kullanılır.</p>
<h2>Hangi Çerezleri Kullanıyoruz?</h2>
<ul>
  <li><strong>Zorunlu çerezler:</strong> Oturum, sepet ve giriş bilgilerini taşır. Olmazsa site çalışmaz.</li>
  <li><strong>Performans çerezleri:</strong> Sayfa yüklenme süreleri ve hata istatistikleri toplanır.</li>
  <li><strong>Tercih çerezleri:</strong> Dil, kategori filtresi, son görüntülenen ürünler gibi tercihleri saklar.</li>
  <li><strong>Pazarlama çerezleri:</strong> Sadece izin vermeniz halinde, ilgili kampanya tanıtımları için kullanılır.</li>
</ul>
<h2>Çerezleri Nasıl Yönetirim?</h2>
<p>Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezleri devre dışı bırakırsanız sepet, giriş ve sipariş gibi temel özellikler çalışmayabilir.</p>
<h2>Üçüncü Taraf Çerezleri</h2>
<p>Sitemizde anlaşmalı ödeme sağlayıcısı (PayTR), kargo entegrasyonları ve içerik dağıtım ağı (CDN) tarafından yerleştirilen çerezler bulunabilir. Bu çerezler ilgili sağlayıcıların gizlilik politikalarına tabidir.</p>
<h2>İletişim</h2>
<p>Çerez kullanımı hakkındaki sorularınız için <a href="mailto:kvkk@istanbulvitamin.com">kvkk@istanbulvitamin.com</a> adresine yazabilirsiniz.</p>',
1, 'Çerez Politikası | İstanbul Vitamin', 'İstanbul Vitamin çerez politikası: kullanılan çerez türleri, amaçları ve nasıl yönetebileceğiniz.', NOW(), NOW());
