"use client";

import { useHomeContent } from "@/lib/use-home-content";
import { safeContentLink } from "@/lib/home-content";
import Link from "next/link";
import FooterNewsletter from "./FooterNewsletter";
import { useSettings } from "@/lib/settings";
import { resolveImageUrl } from "@/lib/utils";

const PAYMENT_LOGOS = [
  { name: "Visa", src: "/payments/visa.png" },
  { name: "Mastercard", src: "/payments/mastercard.svg" },
  { name: "TROY", src: "/payments/troy.svg" },
  { name: "PayTR", src: "/payments/paytr.png" },
];

export default function Footer() {
  const c = useHomeContent().footer;
  const { settings } = useSettings();
  const siteName = settings.site_name || "İstanbul Vitamin";
  const logo = settings.site_logo_url
    ? resolveImageUrl(settings.site_logo_url)
    : "";
  const socials = [
    ["Instagram", settings.instagram],
    ["Facebook", settings.facebook],
    ["YouTube", settings.youtube],
    ["X", settings.twitter],
  ].filter(([, url]) => url && /^https?:\/\//.test(url));
  return (
    <footer className="theme-footer iv-footer">
      <div className="theme-container">
        {c.introEnabled && (
          <div className="iv-footer-intro">
            <div>
              <span className="iv-footer-eyebrow">{c.eyebrow}</span>
              <h2>{c.title}</h2>
              <p>{c.description}</p>
            </div>
            <Link href={safeContentLink(c.href)} className="iv-footer-shop">
              {c.linkText} <span aria-hidden>↗</span>
            </Link>
          </div>
        )}
        <div className="iv-footer-body">
          <div className="iv-footer-brand">
            <Link href="/" aria-label={siteName}>
              {logo ? (
                <img
                  src={logo}
                  alt={siteName}
                  width="180"
                  height="55"
                  loading="lazy"
                />
              ) : (
                <strong>{siteName}</strong>
              )}
            </Link>
            <p>
              {settings.site_description ||
                "Dermokozmetik ve kişisel bakım ürünlerini keşfedin."}
            </p>
            <h3>{c.helpTitle}</h3>
            {settings.phone && (
              <a
                className="iv-footer-phone"
                href={`tel:${settings.phone.replace(/[^+0-9]/g, "")}`}
              >
                {settings.phone}
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            )}
            <Link href={safeContentLink(c.helpHref)}>{c.helpText}</Link>
            <div className="iv-footer-socials">
              {socials.map(([label, url]) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <nav aria-label="Alt menü" className="iv-footer-links">
            {c.columns.map((col) => (
              <div key={col.title}>
                <h3>{col.title}</h3>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={safeContentLink(link.href)}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        {c.newsletterEnabled && <FooterNewsletter />}
        {c.paymentEnabled && (
          <div className="iv-footer-payment">
            <div>
              <h3>{c.paymentTitle}</h3>
              <p>{c.paymentDescription}</p>
            </div>
            <div
              className="iv-payment-badges"
              aria-label="Kart ağları ve ödeme sağlayıcısı"
            >
              {PAYMENT_LOGOS.map((logo) => (
                <span
                  className={`iv-payment-badge ${logo.name === "TROY" ? "iv-payment-troy" : ""}`}
                  key={logo.name}
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    width="64"
                    height="30"
                    loading="lazy"
                  />
                </span>
              ))}
              <span className="iv-payment-badge">Havale / EFT</span>
            </div>
          </div>
        )}
        <div className="iv-footer-legal">
          <p>
            © {new Date().getFullYear()} {siteName}
          </p>
          <nav aria-label="Yasal bilgiler">
            {c.legal.map((link) => (
              <Link key={link.href} href={safeContentLink(link.href)}>
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => window.dispatchEvent(new Event("iv-pwa-settings"))}
            >
              Uygulama ve bildirimler
            </button>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("iv-cookie-settings"))
              }
            >
              Çerez tercihleri
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
