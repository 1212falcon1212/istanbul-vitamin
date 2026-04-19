# Ana Sayfa Build Prompt — DermoEczane

> Bu prompt'u Claude Code, Cursor veya Antigravity'de kullanabilirsin. CLAUDE.md ile birlikte projenin kök dizinine koy. Bu doküman ana sayfanın tasarım ve teknik gereksinimlerini içerir.

---

## Görev

Next.js 16 (App Router) tabanlı dermoeczane e-ticaret sitesinin **ana sayfasını** (`app/page.tsx`) ve gerekli tüm bileşenlerini sıfırdan oluştur. Tasarım editöryal, ürün yoğun ve banner zengini olmalı. Lüks dermokozmetik markalarının web sitelerinden ilham al (Net-a-Porter, SSENSE, Cult Beauty, Aesop).

**Tüm içerik Go backend API'sinden gelecek. Hardcoded içerik kesinlikle yasak.** Yer tutucu veriler yerine API client'ı kur ve gerçek endpoint'lerden veri çek.

---

## Tasarım Felsefesi

**Editöryal lüks**, e-ticaret klişesi değil. Anahtar prensipler:

- **Tipografi kahraman** — DM Serif Display'i 36-64px arasında devasa kullan. Italic varyasyonlarla ritim yarat. Kelimeler arasına italic karışımı ekle (örn. "Cilt için _sessiz_ devrim").
- **Asimetrik bento gridler** — Eşit kolonlu sıralı gridler yerine farklı boyutlarda kutular. Görsel ritim çeşitliliği zorunlu — aynı tip section'ı tekrar etme.
- **Numaralandırma sistemi** — Her ana bölümün başında "N° 001 — KATEGORİ ADI" formatında küçük caps etiket. Editöryal his için kritik.
- **Vertical text labels** — Sayfanın sol kenarında 90 derece döndürülmüş "— SS / 2026" gibi etiketler.
- **Negative space + dolu alan dengesi** — Bol breathing room, ama boş hissettirmeyen dolu section'lar arası geçiş.
- **2 weight tipografi** — DM Sans 400 (regular) ve 500 (medium). 600/700 kullanma — fazla ağır durur.
- **Sentence case her zaman** — ALL CAPS ve Title Case yok. Sadece küçük caps etiketlerde uppercase kullan.
- **Renk minimum** — Beyaz/krem dominant, mor accent. Aynı section içinde 2 ramp'tan fazla renk kullanma.

---

## Renk Paleti (CSS Variables)

```css
:root {
    --font-display: 'DM Serif Display', Georgia, serif;
    --font-body: 'DM Sans', system-ui, sans-serif;
    --bg-primary: #faf7ff;
    --bg-card: #ffffff;
    --bg-accent-soft: #ede9fe;
    --bg-accent-mid: #d4c5f9;
    --bg-accent-strong: #b8a4f0;
    --bg-footer: #1e103d;
    --bg-footer-soft: #3d2363;
    --accent: #7c3aed;
    --text-primary: #1e103d;
    --text-secondary: #8b7aaa;
    --text-tertiary: #d4c5f9;
    --border: #e0d5f5;
    --border-soft: rgba(124, 58, 237, 0.08);
}
```

Google Fonts'tan DM Serif Display + DM Sans ekle (`next/font/google` ile).

---

## Ana Sayfa Bölümleri (Sıralı)

### 0. Header (Sticky)
- Sol: küçük mor nokta + "dermoeczane" (DM Serif Display, 18px)
- Orta: 8 menü linki, 11px küçük caps, letter-spacing 1.2px ("YENİ" mor renkte)
- Sağ: arama, favori, hesap ikonları + "SEPET 2" pill (mor arka plan)
- Beyaz arka plan, alt border `--border-soft`
- Scroll'a göre biraz küçülen sticky davranış (Framer Motion `useScroll`)

### 1. Hero — 3 Kolon Bento (`HeroSection.tsx`)
3 kolon grid: `1fr 1.6fr 1fr`, sol kenarda vertical text "— SS / 2026"

**Sol kolon (üst-alt iki kart):**
- Üst: editor's pick ürün kartı, `--bg-accent-soft` arka plan, küçük etiket + ürün adı
- Alt: "Bugün — Flash fırsatlar" koyu mor arka plan, beyaz tipografi

**Orta kolon (ana hero):**
- `linear-gradient(160deg, #d4c5f9, #ede9fe)` arka plan
- "N° 001 — YENİ KOLEKSİYON" üst etiket
- Devasa serif başlık (56px): "Cilt için" + italic mor "sessiz devrim."
- Açıklama metni (12px, opacity 0.7)
- Alt: koyu mor pill button + "5200+ ürün" sayacı
- Sağ üst köşe: 64px yuvarlak "YENİ SEZON" badge

**Sağ kolon (üst-alt iki kart):**
- Üst: "Çok satan" beyaz kart + ürün
- Alt: "Kampanya — Güneş koruma -30%" `--bg-accent-mid` kart

**API:** `GET /api/v1/homepage/hero` — döndürülecek: heroBlocks (5 adet kart), her birinin tipi (`featured_product`, `main_message`, `campaign`), içeriği

### 2. Marquee Marka Şeridi (`BrandMarquee.tsx`)
- Tam genişlik, koyu mor arka plan
- Marka isimleri DM Serif Display 26px, ortada `✦` ayraç (mor)
- Her ikinci marka italic
- Sürekli sol yatay scroll (CSS `@keyframes` veya Framer Motion infinite)
- Hover: animation-play-state paused
- **Logo değil — isim kullan**, çok daha şık durur
- **API:** `GET /api/v1/brands?featured=true&limit=12`

### 3. Kategori Bento Grid (`CategoryBento.tsx`)
- Header: numaralı etiket + "Bir _ritüel_ seç." başlığı + sağda "TÜM KATEGORİLER →" linki
- 4 kolon × 2 row grid, ilk kart 1/3 row (büyük)
- 7 kategori kartı:
  - **01 Cilt bakımı** — büyük kart, koyu mor, içinde görsel placeholder + büyük serif başlık + ürün sayısı
  - **02 Güneş koruma** — `--bg-accent-soft`
  - **03 Saç bakımı** — `--bg-accent-mid`
  - **04 Anne & bebek** — `--bg-primary` + border
  - **05 Vitamin & takviye** — beyaz + border
  - **06 Makyaj & parfüm** — `--bg-accent-soft`
  - **07 Erkek bakımı** — koyu mor
- Her kartta: küçük "— 0X" etiketi + görsel placeholder + serif başlık (italic karışımlı) + ürün sayısı
- Hover: `scale(1.02)` + `translateY(-2px)`
- **API:** `GET /api/v1/categories?root=true&with_count=true`

### 4. Tam Genişlik Sezonluk Banner (`SeasonalBanner.tsx`)
- `linear-gradient(110deg, #1e103d 0%, #3d2363 60%, #7c3aed 100%)` arka plan
- Sağ alt köşede dev tipografi "SS26" `font-size: 220px`, opacity 0.06 (parallax efekti için)
- Sol içerik (max 60% genişlik):
  - "— SEZONLUK KAMPANYA" küçük caps
  - "Yaza hazırlık." + italic "SPF günü." (52px serif)
  - Açıklama metni
  - 2 button: beyaz "ALIŞVERİŞE BAŞLA →" + outline "SPF REHBERİ"
- Scroll-triggered parallax: arka plan tipografisi ters yönde hareket
- **API:** `GET /api/v1/banners?position=hero_main`

### 5. Trending Wall — 8 Ürün (`TrendingWall.tsx`)
- Header: "N° 003 — TRENDING" + "Bu hafta _çok aranan_." başlığı
- Sağda kategori filtre tab'leri (TÜMÜ / CİLT / SAÇ / MAKYAJ / VİTAMİN), aktif olan altı çizili
- 4 kolon × 2 row = 8 ürün
- Ürün kartları **alternatif arka plan renkleri** (monoton durmasın):
  - Pattern: `accent-soft` → `accent-mid` → `dark` → `white-bordered` (tekrarla)
- Her kart:
  - Aspect ratio 4:5
  - Sol üstte rozet: "YENİ" / "-25%" / "-40%" (farklı renklerde)
  - Sağ altta dairesel "+" sepet butonu
  - Marka adı (9px, küçük caps, secondary text)
  - Ürün adı (DM Serif Display 13px)
  - Fiyat (mor) + üstü çizili eski fiyat (varsa)
- Hover: cursor magnetic effect, "+" butonu cursor'ı takip eder (3-4px)
- **API:** `GET /api/v1/products?sort=trending&limit=8&category={filter}`

### 6. Marka Spotlight (`BrandSpotlight.tsx`)
- 2 kolon: `1.2fr 2fr`
- **Sol — marka hikayesi kartı:**
  - Koyu mor arka plan, beyaz tipografi
  - "N° 004 — MARKA SPOTLIGHT" üst etiket
  - "La Roche" + italic "— Posay." (38px serif)
  - Açıklama metni
  - Stat'lar: "240+ ÜRÜN", "15 SERİ" (DM Serif Display sayılar)
  - Beyaz pill button "MARKAYI KEŞFET →"
- **Sağ — 6 ürünlük grid (3×2):**
  - Her kart farklı arka plan rengi (alternatif)
  - Ürün görseli + ad + fiyat
- Bu bölüm haftalık değişebilen feature olmalı — admin panelden "spotlight markası" seçilebilmeli
- **API:** `GET /api/v1/brands/spotlight` (current spotlight + 6 products)

### 7. Cilt Sorununa Göre Bul (`SkinConcerns.tsx`)
- Header: "N° 005 — CİLT TANI" + "Cilt sorununa _göre bul_."
- 6 kolon grid, kare kartlar (aspect-ratio 1:1)
- Her kart: alternatif arka plan (white-bordered, accent-soft, accent-mid, dark)
- İçerik: dairesel ikon (üstte) + serif başlık + ürün sayısı (alt)
- 6 sorun: Akne, Leke, Yaşlanma, Kuru cilt, Hassas, Saç dökülmesi
- Hover: dairesel ikon hafif rotate + scale
- **API:** `GET /api/v1/skin-concerns` (admin tarafından yönetilebilir)

### 8. Çift Kampanya Banner (`DualBanner.tsx`)
- 2 kolonlu grid, eşit boyutlu
- **Sol:** "2 al, 3. bedava." gradient `accent-soft` → `accent-mid`
- **Sağ:** "Stoklarla sınırlı %70" gradient `dark` → `dark-soft`, beyaz tipografi
- Her ikisinde de:
  - Sol üst küçük caps etiket
  - Devasa serif başlık (32px) + italic alt satır
  - Açıklama
  - Sol alt CTA link "→"
- Hover: gradient yönü değişir (animasyon)
- **API:** `GET /api/v1/banners?position=mid_dual&limit=2`

### 9. Yeni Gelenler Carousel (`NewArrivals.tsx`)
- Header: "N° 006 — YENİ GELENLER" + "Bu hafta _gelenler_."
- Sağda ← → navigation butonları
- 6 kolon grid (carousel olarak çalışacak)
- Daha küçük kartlar (Trending Wall'dan farklı):
  - Aspect ratio 3:4
  - "YENİ" rozeti
  - 8px küçük caps marka adı
  - 11px ürün adı (serif)
  - 10px fiyat
- **Embla Carousel** kullan, snap-to-grid
- **API:** `GET /api/v1/products?sort=newest&limit=12`

### 10. Tüm Markalar Grid (`BrandGrid.tsx`)
- Header: "N° 007 — TÜM MARKALAR" + "120+ _marka_."
- 8 kolon × 2 row = 16 kart
- Her kart kare (aspect-ratio 1:1), beyaz arka plan + border
- İçerik: marka adı DM Serif Display 11px, her ikinci italic
- **Logo değil, isim** — daha şık ve yönetimi kolay
- Son kart: koyu mor "+105 →" (toplam marka sayısını gösterir)
- Hover: arka plan `--bg-accent-soft`, hafif scale
- **API:** `GET /api/v1/brands?limit=15` + `count` döndürür

### 11. Newsletter (`NewsletterCTA.tsx`)
- Tam genişlik koyu mor arka plan
- 2 kolonlu grid:
  - **Sol:** "N° 008 — JURNAL" + "Bültenimize" + italic "katılın." (38px serif)
  - **Sağ:** açıklama + email input (alt çizgili minimal stil) + "ABONE OL →"
- Email input: `border-bottom: 1px solid #b8a4f0`, transparan, tipografik
- Submit'te toast bildirimi (sonner kullan)
- **API:** `POST /api/v1/newsletter/subscribe`

### 12. Footer (`Footer.tsx`)
- `--bg-primary` arka plan, küçük tipografi (9px)
- 3 kolonlu flex: copyright | yasal linkler | sosyal medya
- Üstünde 1px border
- **API:** `GET /api/v1/settings?group=general,contact,social,legal`

---

## Animasyon Stratejisi

Animasyonlar **kontrollü ve hızlı** olmalı, sayfa yorucu olmamalı.

### Kütüphane Stack
```bash
npm install framer-motion @studio-freight/lenis gsap embla-carousel-react react-countup sonner
```

### Global Animasyonlar

**Lenis Smooth Scroll** — `app/layout.tsx`'de provider olarak kur:
```tsx
// LenisProvider içinde useEffect ile lenis instance başlat
// Tüm sayfalarda smooth scroll çalışsın
```

**Framer Motion Page Reveal** — Her section scroll'a girince stagger ile gelir:
```tsx
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};
```

**Stagger Container** — Grid item'lar sırayla:
```tsx
const stagger = {
  whileInView: { transition: { staggerChildren: 0.08 } }
};
```

### Bölüm Bazlı Animasyonlar

| Bölüm | Animasyon | Kütüphane |
|-------|-----------|-----------|
| Header | Scroll'a göre küçülme + shadow ekleme | Framer Motion `useScroll` |
| Hero kartları | İlk yüklemede stagger pop-in (sol → orta → sağ) | Framer Motion |
| Hero başlık | Kelime kelime reveal (clip-path) | Framer Motion |
| Marquee marka şeridi | Sürekli yatay scroll, hover'da yavaşlar | CSS keyframes |
| Bento kategori | Hover scale(1.02) + translateY(-2px) | Framer Motion `whileHover` |
| Sezonluk banner | Arka plan dev tipografi parallax (ters yön) | GSAP ScrollTrigger |
| Trending Wall ürünler | Cursor magnetic effect (kart imleci takip eder) | Framer Motion + mouse position |
| Trending Wall "+" butonu | Cursor'a doğru çekilir | Framer Motion |
| Marka spotlight | Stat sayıları görünür olunca 0'dan animate | react-countup |
| Cilt sorunları kartları | Hover'da dairesel ikon rotate(360deg) + scale | Framer Motion |
| Çift kampanya banner | Hover gradient yön değişir | CSS transition |
| Yeni gelenler carousel | Embla snap, momentum scrolling | embla-carousel-react |
| Brand grid | Stagger reveal (20ms intervals) | Framer Motion |
| Newsletter input | Focus'ta border alt çizgi animate | CSS |

### Performans Kuralları

- **Tüm animasyonlar `transform` ve `opacity` üzerinden** — width/height/top/left animasyonu yasak
- **`will-change` sadece animasyon süresince** — sürekli değil
- **`viewport.once: true`** kullan — bir kere oynayıp dursun
- **Reduced motion desteği** — `prefers-reduced-motion` kontrolü ile animasyonları kapat
- **Lazy load** — fold'un altındaki section'ları `next/dynamic` ile yükle

---

## Teknik Gereksinimler

### Dosya Yapısı

```
app/
├── layout.tsx                    -- Root layout, font, Lenis provider
├── page.tsx                       -- Ana sayfa (composition)
├── providers/
│   ├── LenisProvider.tsx
│   └── CartProvider.tsx
└── api-client.ts                  -- Go backend fetch wrapper

components/
├── home/
│   ├── Header.tsx
│   ├── HeroSection.tsx
│   ├── BrandMarquee.tsx
│   ├── CategoryBento.tsx
│   ├── SeasonalBanner.tsx
│   ├── TrendingWall.tsx
│   ├── BrandSpotlight.tsx
│   ├── SkinConcerns.tsx
│   ├── DualBanner.tsx
│   ├── NewArrivals.tsx
│   ├── BrandGrid.tsx
│   ├── NewsletterCTA.tsx
│   └── Footer.tsx
├── ui/
│   ├── ProductCard.tsx           -- Reusable, props: variant (small/medium/large)
│   ├── SectionLabel.tsx          -- "N° 001 — KATEGORİ"
│   ├── SerifHeading.tsx          -- Italic karışımlı serif başlık
│   └── PillButton.tsx
└── animations/
    ├── FadeUp.tsx                -- Reusable scroll-triggered fade
    ├── StaggerContainer.tsx
    └── MagneticHover.tsx         -- Cursor magnetic wrapper

lib/
├── api.ts                        -- API client functions
└── animations.ts                 -- Framer Motion variants
```

### API Client

```typescript
// app/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function fetchHomepage() {
  const [hero, categories, trending, spotlight, concerns, newArrivals, brands, banners] = 
    await Promise.all([
      fetch(`${API_BASE}/homepage/hero`).then(r => r.json()),
      fetch(`${API_BASE}/categories?root=true&with_count=true`).then(r => r.json()),
      fetch(`${API_BASE}/products?sort=trending&limit=8`).then(r => r.json()),
      fetch(`${API_BASE}/brands/spotlight`).then(r => r.json()),
      fetch(`${API_BASE}/skin-concerns`).then(r => r.json()),
      fetch(`${API_BASE}/products?sort=newest&limit=12`).then(r => r.json()),
      fetch(`${API_BASE}/brands?limit=15&with_count=true`).then(r => r.json()),
      fetch(`${API_BASE}/banners?positions=hero_main,mid_dual`).then(r => r.json()),
    ]);
  return { hero, categories, trending, spotlight, concerns, newArrivals, brands, banners };
}
```

### Sayfa Komposisyonu

```tsx
// app/page.tsx
import { fetchHomepage } from './api-client';
import Header from '@/components/home/Header';
// ... diğer importlar

export const revalidate = 300; // 5 dk ISR

export default async function HomePage() {
  const data = await fetchHomepage();
  
  return (
    <>
      <Header />
      <main>
        <HeroSection data={data.hero} />
        <BrandMarquee brands={data.brands.featured} />
        <CategoryBento categories={data.categories} />
        <SeasonalBanner banner={data.banners.hero_main} />
        <TrendingWall products={data.trending} />
        <BrandSpotlight spotlight={data.spotlight} />
        <SkinConcerns concerns={data.concerns} />
        <DualBanner banners={data.banners.mid_dual} />
        <NewArrivals products={data.newArrivals} />
        <BrandGrid brands={data.brands.all} totalCount={data.brands.total} />
        <NewsletterCTA />
        <Footer />
      </main>
    </>
  );
}
```

### Responsive Davranış

- **Desktop (1024px+):** Yukarıda anlatılan tam tasarım
- **Tablet (768-1023px):**
  - Hero 3 kolon → 2 kolon (orta + sağ üst)
  - Bento kategori 4 kolon → 3 kolon
  - Trending Wall 4 kolon → 3 kolon
  - Brand grid 8 kolon → 6 kolon
- **Mobile (< 768px):**
  - Header menü → hamburger
  - Hero tek kolon, dikey stack
  - Bento kategori 2 kolon
  - Trending Wall 2 kolon
  - Yeni gelenler 2 kolon (yatay scroll)
  - Brand grid 3 kolon
  - Marquee aynı

### SEO & Metadata

```tsx
// app/page.tsx
export async function generateMetadata() {
  const settings = await fetch(`${API_BASE}/settings?group=seo`).then(r => r.json());
  return {
    title: settings.meta_title,
    description: settings.meta_description,
    openGraph: { /* settings'ten */ },
  };
}
```

### PWA

- `app/manifest.json` — theme color `#7c3aed`, background `#faf7ff`
- Service Worker — Workbox ile cache stratejisi (stale-while-revalidate)
- Add to Home Screen prompt — ilk ziyaret 2. günde tetiklenir

---

## Yapılması Gerekenler (Sıralı)

1. Next.js 16 projesi kur (App Router, TypeScript, Tailwind)
2. Google Fonts'tan DM Serif Display + DM Sans ekle (`next/font/google`)
3. Tailwind config'e CSS variables'ı ekle (`@theme` directive ile)
4. Gerekli paketleri yükle (Framer Motion, Lenis, GSAP, Embla, react-countup, sonner)
5. `app/api-client.ts` — Go backend fetch wrapper
6. `LenisProvider` kur ve `app/layout.tsx`'e ekle
7. Reusable UI bileşenlerini oluştur (`ProductCard`, `SectionLabel`, `SerifHeading`, `PillButton`)
8. Animasyon helper'larını oluştur (`FadeUp`, `StaggerContainer`, `MagneticHover`)
9. Section bileşenlerini sırayla oluştur (yukarıdaki listede 0'dan 12'ye)
10. `app/page.tsx`'de hepsini kompoze et
11. ISR ayarla (`revalidate = 300`)
12. Responsive testleri yap
13. Lighthouse skoru 90+ olana kadar optimize et

---

## Önemli Uyarılar

- **Hardcoded içerik yok.** Eğer API endpoint henüz yoksa, mock data oluştur ama mutlaka API client'tan gelsin.
- **Türkçe karakter desteği.** Tüm string'ler UTF-8, slug'larda Türkçe karakterler latinize edilmiş olmalı.
- **Para formatı:** `₺1.234,56` (Intl.NumberFormat ile, locale `tr-TR`).
- **Rounded number.** Tüm sayılar `Math.round()` veya `toFixed()` ile yuvarlansın.
- **Erişilebilirlik.** Her görselin `alt`'ı, her butonun `aria-label`'i olsun.
- **Image optimizasyonu.** Tüm görseller `next/image` ile, WebP format, lazy load.
- **Reduced motion.** `prefers-reduced-motion: reduce` durumunda animasyonları kapat.
- **Dark mode YOK** — bu site sadece light tema, lavanta paleti üzerinde çalışır.

---

## Çıktı Beklentisi

- `app/page.tsx` ve tüm component dosyaları oluşturulmuş olmalı
- `npm run dev` ile çalıştırıldığında ana sayfa render olmalı
- Mock data ile bile sayfa görsel olarak yukarıda anlatılan editöryal lüks tasarımı yansıtmalı
- Tüm animasyonlar çalışır durumda olmalı
- Responsive davranış desktop/tablet/mobile için test edilmiş olmalı
- Performans: Lighthouse Performance 85+, Accessibility 95+
