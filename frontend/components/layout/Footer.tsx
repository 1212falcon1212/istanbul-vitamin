"use client";

import Link from "next/link";
import FooterNewsletter from "./FooterNewsletter";
import { useSettings } from "@/lib/settings";
import { resolveImageUrl } from "@/lib/utils";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
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
      { label: "Vitamin & Takviye", href: "/vitamin" },
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
];

const LEGAL_LINKS = [
  { label: "KVKK", href: "/kvkk" },
  { label: "Gizlilik Politikası", href: "/gizlilik-politikasi" },
  { label: "Kullanım Koşulları", href: "/kullanim-kosullari" },
  { label: "Çerez Politikası", href: "/cerez-politikasi" },
];

const TRUST_ITEMS = [
  {
    title: "Orijinal Ürün",
    desc: "100% eczane güvencesi",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Hızlı Kargo",
    desc: "1-3 iş günü teslimat",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9-1.5h10.5a1.5 1.5 0 001.5-1.5V6.75a1.5 1.5 0 00-1.5-1.5H4.5A1.5 1.5 0 003 6.75v10.5a1.5 1.5 0 001.5 1.5H6m9.75-6.75h3.375c.621 0 1.125.504 1.125 1.125V17.25a1.5 1.5 0 01-1.5 1.5h-.375m-5.25 0V6.75A1.5 1.5 0 0013.5 5.25h-9" />
      </svg>
    ),
  },
  {
    title: "Güvenli Ödeme",
    desc: "256-bit SSL • 3D Secure",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Kolay İade",
    desc: "14 gün iade hakkı",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
  },
];

const PAYMENT_LOGOS = ["Visa", "Mastercard", "Troy", "PayTR", "Havale/EFT"];

export default function Footer() {
  const { settings } = useSettings();
  const logoUrl = settings.site_logo_url_dark
    ? resolveImageUrl(settings.site_logo_url_dark)
    : settings.site_logo_url
      ? resolveImageUrl(settings.site_logo_url)
      : "";
  const siteName = settings.site_name || "İstanbul Vitamin";
  const siteDesc =
    settings.site_description ||
    "5.200+ orijinal dermokozmetik ürün. Eczane güvencesi, hızlı kargo, kolay iade.";
  const phone = settings.phone || "0850 123 45 67";
  const email = settings.email || "destek@istanbulvitamin.com";

  const socials: { href?: string; label: string; icon: React.ReactNode }[] = [
    {
      href: settings.instagram,
      label: "Instagram",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 21a4.5 4.5 0 01-4.5-4.5V7.5a4.5 4.5 0 014.5-4.5h10.5a4.5 4.5 0 014.5 4.5v9A4.5 4.5 0 0117.25 21H6.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM17.25 7.5h.008v.008h-.008V7.5z" />
        </svg>
      ),
    },
    {
      href: settings.twitter,
      label: "X",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
        </svg>
      ),
    },
    {
      href: settings.youtube,
      label: "YouTube",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      href: settings.facebook,
      label: "Facebook",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ].filter((s) => s.href); // yalnızca URL'si olanları göster

  return (
    <footer className="mt-20 text-white/80 bg-gradient-to-b from-[#0f0a1e] to-[#1a1530]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-14 pb-6">
        {/* Üst: marka + kolonlar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Marka kolonu */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="inline-block" aria-label={siteName}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="h-12 w-auto object-contain bg-white rounded-lg p-2"
                />
              ) : (
                <span className="font-display text-2xl text-white">
                  İstanbul
                  <span className="text-primary">Vitamin</span>
                </span>
              )}
            </Link>

            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              {siteDesc}
            </p>

            <div className="space-y-2 text-sm">
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-4 h-4 opacity-70">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-4 h-4 opacity-70">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {email}
              </a>
            </div>

            <FooterNewsletter />

            {socials.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-full bg-white/8 hover:bg-primary text-white/80 hover:text-white inline-flex items-center justify-center transition-all hover:scale-105"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link kolonları */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] uppercase tracking-widest text-white font-semibold mb-4">
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-block text-sm text-white/55 hover:text-white hover:translate-x-0.5 transition-all"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Trust row */}
        <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-white/8 text-white flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                <p className="text-[11px] text-white/50 truncate">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alt bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} {siteName}. Tüm hakları saklıdır.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-white/50 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {PAYMENT_LOGOS.map((name) => (
              <span
                key={name}
                className="text-[10px] uppercase tracking-wider text-white/70 bg-white/10 rounded px-2 py-1"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
