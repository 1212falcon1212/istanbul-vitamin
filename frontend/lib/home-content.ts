export const homeDefaults = {
  seo: {
    title: "İstanbul Vitamin — Dermokozmetik Ürünleri",
    description:
      "Dermokozmetik, cilt bakımı, saç bakımı ve güneş ürünlerini keşfedin.",
  },
  header: {
    utilityText: "Stoktaki ürünlerde aynı gün kargo",
    utilityLinks: [
      { label: "Hakkımızda", href: "/hakkimizda" },
      { label: "Hesabım", href: "/hesabim" },
      { label: "Favorilerim", href: "/hesabim/favorilerim" },
    ],
    trackingLabel: "Sipariş Takibi",
    trackingHref: "/hesabim/siparisler",
    utilitiesEnabled: true,
    menu: [
      { label: "Ana Sayfa", href: "/" },
      { label: "Tüm Ürünler", href: "/magaza" },
      { label: "Markalar", href: "/markalar" },
      { label: "Cilt Bakımı", href: "/cilt-bakimi" },
      { label: "Güneş Ürünleri", href: "/gunes-urunleri" },
      { label: "İletişim", href: "/iletisim" },
    ],
  },
  hero: {
    enabled: true,
    title: "İstanbul Vitamin — Dermokozmetik ve bakım ürünleri",
    eyebrow: "Bakımına iyi gelenler",
    benefitsEnabled: true,
    benefits: [
      {
        icon: "◇",
        title: "Online alışveriş",
        description: "Bakım ihtiyaçlarınızı kolayca keşfedin.",
      },
      {
        icon: "✧",
        title: "Yeni ürünler ve fırsatlar",
        description: "Sevdiğiniz markaların yeniliklerini inceleyin.",
      },
      {
        icon: "♡",
        title: "Dermokozmetik seçkisi",
        description: "Günlük bakımınıza uygun ürünleri bulun.",
      },
      {
        icon: "→",
        title: "Aynı gün kargo",
        description: "Stoktaki ürünleriniz aynı gün kargoda.",
      },
    ],
  },
  sections: [
    { id: "promo_triple", enabled: true },
    { id: "selection", enabled: true },
    { id: "promo_tall", enabled: true },
    { id: "featured", enabled: true },
    { id: "promo_wide", enabled: true },
    { id: "inline", enabled: true },
    { id: "promo_strip", enabled: true },
    { id: "spotlight", enabled: true },
    { id: "categories", enabled: true },
    { id: "brands", enabled: true },
  ],
  selection: {
    title: "Yeni gelenler ve çok satanlar",
    newLabel: "Yeni Gelenler",
    bestLabel: "Çok Satanlar",
    newProductIds: "",
    bestProductIds: "",
  },
  featured: {
    title: "Öne çıkan ürünler",
    description: "Bakım rutinin için seçtiğimiz ürünleri keşfet.",
    linkText: "Tümünü gör →",
    href: "/magaza",
    productIds: "",
  },
  inline: {
    title: "Çok satanlar",
    description: "En çok tercih edilen ürünleri keşfet.",
    linkText: "Tümünü gör →",
    href: "/magaza?sort=trending",
  },
  spotlight: { brandSlug: "", productIds: "" },
  categories: {
    title: "Kategoriden ürünler.",
    description: "Kategorini seç, sana uygun ürünleri keşfet.",
    categoryIds: "",
    defaultCategorySlug: "cilt-bakimi",
  },
  brands: {
    title: "Seçkin markalar",
    description: "Dermokozmetik dünyasının markaları.",
    linkText: "Tümünü gör →",
    href: "/markalar",
    cardText: "Ürünleri keşfet →",
    brandIds: "",
    limit: 6,
  },
  promo: { eyebrow: "Senin için seçtik" },
  footer: {
    introEnabled: true,
    eyebrow: "GÜNLÜK BAKIM, İYİ HİSSETTİREN SEÇİMLER",
    title: "Bakım rutininiz burada başlar.",
    description: "Sevdiğiniz markalar, ihtiyacınıza uygun ürünler.",
    linkText: "Ürünleri keşfet",
    href: "/magaza",
    helpTitle: "Size yardımcı olalım",
    helpText: "İletişim ve destek →",
    helpHref: "/iletisim",
    newsletterEnabled: true,
    newsletterTitle: "Bültene Katıl",
    newsletterDescription:
      "Yeni ürünler ve özel kampanyalardan ilk siz haberdar olun.",
    newsletterButton: "Abone Ol",
    paymentTitle: "Ödeme seçenekleri",
    paymentDescription: "Kart ödemeleri PayTR altyapısıyla işlenir.",
    paymentEnabled: true,
    columns: [
      {
        title: "Kurumsal",
        links: [
          { label: "Hakkımızda", href: "/hakkimizda" },
          { label: "Kariyer", href: "/kariyer" },
          { label: "Blog", href: "/blog" },
          { label: "Basın", href: "/basin" },
          { label: "İletişim", href: "/iletisim" },
        ],
      },
      {
        title: "Yardım",
        links: [
          { label: "Sipariş Takibi", href: "/hesabim/siparisler" },
          { label: "Kargo & Teslimat", href: "/kargo-teslimat" },
          { label: "İade ve Değişim", href: "/iade-degisim" },
          { label: "Sıkça Sorulan Sorular", href: "/sss" },
          { label: "Müşteri Hizmetleri", href: "/musteri-hizmetleri" },
        ],
      },
      {
        title: "Kategoriler",
        links: [
          { label: "Cilt Bakımı", href: "/cilt-bakimi" },
          { label: "Saç Bakımı", href: "/sac-bakimi" },
          { label: "Güneş Ürünleri", href: "/gunes-urunleri" },
          { label: "Anne & Bebek", href: "/anne-bebek" },
          { label: "Vitamin & Takviye", href: "/vitaminler" },
        ],
      },
      {
        title: "Hesabım",
        links: [
          { label: "Giriş Yap", href: "/giris-yap" },
          { label: "Üye Ol", href: "/kayit-ol" },
          { label: "Favorilerim", href: "/hesabim/favorilerim" },
          { label: "Sepetim", href: "/sepet" },
          { label: "Adreslerim", href: "/hesabim/adreslerim" },
        ],
      },
    ],
    legal: [
      { label: "KVKK", href: "/kvkk" },
      { label: "Gizlilik Politikası", href: "/gizlilik-politikasi" },
      { label: "Kullanım Koşulları", href: "/kullanim-kosullari" },
      { label: "Çerez Politikası", href: "/cerez-politikasi" },
    ],
  },
  pwa: {
    enabled: true,
    title: "İstanbul Vitamin elinizin altında.",
    description: "Daha kolay erişmek için ana ekranınıza ekleyin.",
    pushTitle: "Yeniliklerden haberdar olun.",
    pushDescription: "Kampanya ve ürün haberlerini bildirim olarak alın.",
  },
};
export type HomeContent = typeof homeDefaults;
// Accept only known keys/types; retain explicitly blank strings and false values.
function merge(base: unknown, incoming: unknown): unknown {
  if (Array.isArray(base))
    return Array.isArray(incoming)
      ? incoming
          .slice(0, 30)
          .filter((v) => v && typeof v === "object")
          .map((v) => merge(base[0], v))
      : base;
  if (base && typeof base === "object")
    return Object.fromEntries(
      Object.entries(base).map(([k, v]) => [
        k,
        merge(
          v,
          incoming && typeof incoming === "object"
            ? (incoming as Record<string, unknown>)[k]
            : undefined,
        ),
      ]),
    );
  return typeof incoming === typeof base ? incoming : base;
}
export function parseHomeContent(raw?: string): HomeContent {
  try {
    const result = merge(homeDefaults, JSON.parse(raw || "{}")) as HomeContent;
    const seen = new Set<string>();
    result.sections = result.sections.filter(
      (s) =>
        homeDefaults.sections.some((d) => d.id === s.id) &&
        !seen.has(s.id) &&
        !!seen.add(s.id),
    );
    return result;
  } catch {
    return structuredClone(homeDefaults);
  }
}
export function safeContentLink(url: string, fallback = "/magaza") {
  return !/[\\\u0000-\u0020]/.test(url) &&
    (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url))
    ? url
    : fallback;
}
export function selectedByIds<T extends { id: number }>(
  items: T[],
  raw: string,
) {
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0);
  return ids.length
    ? ids.flatMap((id) => items.filter((item) => item.id === id))
    : items;
}
