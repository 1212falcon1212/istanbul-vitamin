"use client";

import Link from "next/link";
import { useSettings } from "@/lib/settings";
import { resolveImageUrl } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}

/**
 * Giriş / Kayıt için full-screen split layout — bağımsız, Header/Footer yok.
 * - Mobile: tek kolon, üstte özet brand panel, altında form
 * - Desktop: iki kolonlu kart, ekran dikey/yatayda ortalı
 */
export default function AuthShell({ children, title, subtitle }: AuthShellProps) {
  const { settings } = useSettings();

  const logoUrl = settings?.site_logo_url
    ? resolveImageUrl(settings.site_logo_url)
    : "";

  const siteName = settings?.site_name || "İstanbul Vitamin";

  return (
    <div className="min-h-screen w-full relative flex flex-col bg-bg-primary overflow-hidden">
      {/* Ambient gradient blobs */}
      <div
        className="absolute -top-40 -left-20 w-[520px] h-[520px] rounded-full opacity-40 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(closest-side, #c4b5fd, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -right-20 w-[560px] h-[560px] rounded-full opacity-40 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(closest-side, #a78bfa, transparent 70%)" }}
      />

      {/* Top bar */}
      <header className="relative z-10 px-6 md:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="shrink-0 mr-6">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={siteName}
              width={160}
              height={40}
              className="h-auto max-h-[40px] object-contain"
            />
          ) : (
            <span className="font-display text-xl md:text-2xl text-text-primary">
              {siteName}
            </span>
          )}
        </Link>
        <Link
          href="/"
          className="text-xs md:text-sm text-text-secondary hover:text-primary transition inline-flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ana sayfa
        </Link>
      </header>

      {/* Centered card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-6 pb-10">
        <div className="w-full max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] rounded-[28px] overflow-hidden shadow-[0_30px_80px_-20px_rgba(88,28,135,0.35)] bg-white">
          {/* Left — Brand / illustration */}
          <div
            className="hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white relative overflow-hidden min-h-[640px]"
            style={{
              background:
                "linear-gradient(135deg, #4c1d95 0%, #6d28d9 40%, #7c3aed 80%, #8b5cf6 100%)",
            }}
          >
            {/* Soft glow */}
            <div
              className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(closest-side, #c4b5fd, transparent 70%)" }}
              aria-hidden
            />
            <div
              className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full opacity-30 blur-3xl"
              style={{ background: "radial-gradient(closest-side, #ede9fe, transparent 70%)" }}
              aria-hidden
            />

            {/* Decorative stars */}
            <div className="absolute inset-0 pointer-events-none">
              {[
                { top: "10%", left: "14%", size: 3, o: 0.9 },
                { top: "22%", left: "76%", size: 4, o: 0.8 },
                { top: "8%", left: "50%", size: 2, o: 0.7 },
                { top: "38%", left: "88%", size: 3, o: 0.6 },
                { top: "18%", left: "38%", size: 2, o: 0.85 },
                { top: "62%", left: "8%", size: 2, o: 0.5 },
                { top: "72%", left: "78%", size: 3, o: 0.6 },
                { top: "88%", left: "22%", size: 2, o: 0.5 },
              ].map((s, i) => (
                <span
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    top: s.top,
                    left: s.left,
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                    opacity: s.o,
                    boxShadow: "0 0 10px rgba(255,255,255,0.85)",
                  }}
                />
              ))}
            </div>

            {/* Top — brand */}
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] bg-white/10 backdrop-blur border border-white/15 rounded-full px-3.5 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a7f3d0]" />
                Dermatoloji onaylı
              </span>

              <h2 className="mt-6 font-display text-[30px] xl:text-[40px] leading-[1.1] tracking-tight max-w-[400px]">
                Eczane güvencesiyle
                <br />
                <span className="relative inline-block">
                  dermokozmetik.
                  <span className="absolute -right-4 -top-1 w-2 h-2 rounded-full bg-[#c4b5fd]" />
                </span>
              </h2>

              <p className="mt-5 text-[13px] xl:text-sm text-white/75 leading-relaxed max-w-[360px]">
                5.200+ orijinal ürün, dermatoloji onaylı markalar ve eczane
                rahatlığı tek bir yerde. Aynı gün kargo, kolay iade, güvenli
                ödeme.
              </p>
            </div>

            {/* Center — illustration */}
            <div className="relative z-10 flex-1 flex items-center justify-center my-6">
              <BrandIllustration />
            </div>

            {/* Bottom — metrics */}
            <div className="relative z-10">
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/10">
                {[
                  { v: "5.200+", t: "Ürün" },
                  { v: "213+", t: "Marka" },
                  { v: "1-3 gün", t: "Hızlı Kargo" },
                ].map((s) => (
                  <div key={s.t} className="text-left">
                    <p className="font-display text-xl xl:text-2xl leading-none">
                      {s.v}
                    </p>
                    <p className="mt-1.5 text-[10px] uppercase tracking-widest text-white/55">
                      {s.t}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white p-6 sm:p-10 xl:p-14 flex items-center min-h-[560px]">
            <div className="w-full max-w-[380px] mx-auto">
              <h1 className="font-display text-[32px] md:text-[36px] text-text-primary leading-[1.1] tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-text-secondary mt-3">{subtitle}</p>
              )}
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dekoratif illüstrasyon — dermokozmetik ürünleri (krem kavanozu, damlalıklı şişe,
 * tüp, tablet blister) ay + yıldız sahnesinde. Tamamen inline SVG.
 */
function BrandIllustration() {
  return (
    <svg
      viewBox="0 0 320 220"
      width="100%"
      height="auto"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dermokozmetik ürün illüstrasyonu"
      className="max-w-[360px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
    >
      <defs>
        <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ede9fe" />
        </linearGradient>
        <linearGradient id="bottleBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ede9fe" />
        </linearGradient>
        <linearGradient id="serumBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="jarBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fce7f3" />
          <stop offset="100%" stopColor="#fbcfe8" />
        </linearGradient>
        <linearGradient id="tubeBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
      </defs>

      {/* Shadow / reflection on ground */}
      <ellipse cx="160" cy="205" rx="120" ry="7" fill="black" opacity="0.25" />

      {/* Moon */}
      <g>
        <circle cx="255" cy="38" r="22" fill="url(#moonGrad)" />
        <circle cx="263" cy="33" r="3" fill="#ede9fe" opacity="0.6" />
        <circle cx="252" cy="45" r="2" fill="#ede9fe" opacity="0.5" />
        <circle cx="248" cy="30" r="1.5" fill="#ede9fe" opacity="0.4" />
      </g>

      {/* Platform/podium */}
      <ellipse cx="160" cy="190" rx="135" ry="14" fill="#fff" opacity="0.08" />
      <ellipse cx="160" cy="186" rx="120" ry="10" fill="#fff" opacity="0.06" />

      {/* Back bottle — pump bottle */}
      <g transform="translate(62,84)">
        <rect x="0" y="18" width="38" height="80" rx="5" fill="url(#bottleBody)" />
        <rect x="10" y="6" width="18" height="14" rx="2" fill="#1e103d" />
        <rect x="14" y="-4" width="10" height="10" rx="2" fill="#1e103d" />
        <rect x="4" y="38" width="30" height="22" rx="2" fill="#7c3aed" opacity="0.15" />
        <text x="19" y="52" textAnchor="middle" fontSize="6" fill="#5b21b6" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1">HYDRA</text>
        <rect x="4" y="58" width="30" height="1" fill="#7c3aed" opacity="0.2" />
      </g>

      {/* Jar (pink) */}
      <g transform="translate(114,110)">
        <ellipse cx="25" cy="8" rx="25" ry="6" fill="#be185d" opacity="0.3" />
        <rect x="0" y="6" width="50" height="10" rx="1" fill="#ec4899" />
        <rect x="0" y="14" width="50" height="52" rx="3" fill="url(#jarBody)" />
        <ellipse cx="25" cy="66" rx="25" ry="5" fill="#f472b6" opacity="0.3" />
        <rect x="6" y="34" width="38" height="16" rx="2" fill="#fff" opacity="0.7" />
        <text x="25" y="45" textAnchor="middle" fontSize="7" fill="#9d174d" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1.5">CREAM</text>
      </g>

      {/* Serum dropper (amber) */}
      <g transform="translate(174,88)">
        <rect x="10" y="0" width="20" height="6" rx="1" fill="#1e103d" />
        <rect x="13" y="-5" width="14" height="6" rx="1.5" fill="#fbbf24" />
        <rect x="0" y="22" width="40" height="72" rx="4" fill="url(#serumBody)" />
        <rect x="8" y="6" width="24" height="18" rx="1" fill="#1e103d" />
        <rect x="6" y="52" width="28" height="18" rx="2" fill="#fff" opacity="0.8" />
        <text x="20" y="64" textAnchor="middle" fontSize="6" fill="#78350f" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1">SERUM</text>
        <line x1="10" y1="30" x2="30" y2="30" stroke="#d97706" strokeWidth="0.8" opacity="0.4" />
      </g>

      {/* Tube (mint) */}
      <g transform="translate(224,108)">
        <rect x="2" y="0" width="30" height="7" rx="1" fill="#1e103d" />
        <path
          d="M0 7 L34 7 L28 70 Q28 78 17 78 Q6 78 6 70 Z"
          fill="url(#tubeBody)"
        />
        <rect x="9" y="32" width="16" height="24" rx="1.5" fill="#fff" opacity="0.75" />
        <text x="17" y="43" textAnchor="middle" fontSize="5" fill="#065f46" fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="1">SPF</text>
        <text x="17" y="52" textAnchor="middle" fontSize="8" fill="#065f46" fontFamily="Inter, sans-serif" fontWeight="800">50+</text>
      </g>

      {/* Leaf (decorative) */}
      <g transform="translate(46,152) rotate(-20)">
        <path d="M0 0 Q10 -18 24 -4 Q14 14 0 0 Z" fill="#a7f3d0" opacity="0.8" />
        <path d="M2 -2 Q12 -10 22 -4" stroke="#059669" strokeWidth="0.8" fill="none" opacity="0.6" />
      </g>

      {/* Small sparkle */}
      <g transform="translate(250,135)">
        <path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#fde68a" />
      </g>
      <g transform="translate(280,85)">
        <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fff" opacity="0.8" />
      </g>
    </svg>
  );
}
