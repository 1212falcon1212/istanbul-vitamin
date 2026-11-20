"use client";

import Link from "next/link";
import FooterNewsletter from "./FooterNewsletter";
import { useHomeContent } from "@/lib/use-home-content";
import { safeContentLink } from "@/lib/home-content";
import { useSettings } from "@/lib/settings";
import { useFooterCatalog } from "@/lib/footer-context";
import { footerSelection, type FooterLink } from "@/lib/footer-catalog";
import { storefrontLogo } from "@/lib/utils";

const PAYMENT_LOGOS = [
  { name: "Visa", src: "/payments/visa.png" },
  { name: "Mastercard", src: "/payments/mastercard.svg" },
  { name: "TROY", src: "/payments/troy.svg" },

  { name: "Bonus", src: "/payments/bonus.png" },
  { name: "World", src: "/payments/world.webp" },
  { name: "Axess", src: "/payments/axess.png" },
  { name: "Maximum", src: "/payments/maximum.svg" },
  { name: "QNB Kredi Kartı", src: "/payments/qnb.png" },
];

function ServiceIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    truck: "M3 5h11v12H3z M14 9h4l3 4v4h-7 M5 17a2 2 0 1 0 4 0 M15 17a2 2 0 1 0 4 0",
    support: "M4 13v-2a8 8 0 0 1 16 0v2 M4 12H2v7h4v-7z M20 12h2v7h-4v-7z M20 19c0 3-5 3-8 3",
    return: "M4 8a8 8 0 1 1-1 8 M4 3v5h5",
    card: "M3 5h18v14H3z M3 10h18 M6 15h4",
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.support} /></svg>;
}

function CatalogLinks({ title, links }: { title: string; links: FooterLink[] }) {
  if (!links.length) return null;
  return <nav className="commerce-footer-group" aria-label={title}>
    <h3>{title}</h3>
    <ul>{links.map(link => <li key={link.href}><Link prefetch={false} href={link.href}>{link.label}</Link></li>)}</ul>
  </nav>;
}

export default function Footer() {
  const c = useHomeContent().footer;
  const { settings } = useSettings();
  const catalog = useFooterCatalog();
  const siteName = settings.site_name || "İstanbul Vitamin";
  const logo = storefrontLogo(settings.site_logo_url);
  const categories = footerSelection(catalog.categories, c.categoryIds, c.categoryLimit);
  const brands = footerSelection(catalog.brands, c.brandIds, c.brandLimit);
  const products = footerSelection(catalog.products, c.productIds, c.productLimit, 12);
  const socials = [
    ["Instagram", settings.instagram], ["Facebook", settings.facebook],
    ["YouTube", settings.youtube], ["X", settings.twitter],
  ].filter(([, url]) => url && /^https?:\/\//.test(url));
  const columns = c.columns.filter(col => !(c.catalogEnabled && categories.length && col.title.toLocaleLowerCase("tr") === "kategoriler"));
  const helpIndex = columns.findIndex(col => col.title.toLocaleLowerCase("tr").includes("yardım"));
  const help = helpIndex >= 0 ? columns[helpIndex] : null;
  const secondaryColumns = columns.filter((_, i) => i !== helpIndex);
  return <footer className="theme-footer iv-footer commerce-footer">
    <div className="theme-container">
      <div className="commerce-footer-main">
        <div className="commerce-footer-identity">
          <Link href="/" aria-label={siteName}>
            {logo ? <img src={logo} alt={siteName} width="180" height="55" loading="lazy" /> : <strong>{siteName}</strong>}
          </Link>
          {c.brandTagline && <h2 className="commerce-footer-tagline">{c.brandTagline}</h2>}
          <p>{settings.site_description || "Dermokozmetik ve kişisel bakım ürünleri."}</p>
          <div className="iv-footer-socials">{socials.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label}</a>)}</div>
          <div className="commerce-footer-contact">
          <h3>{c.helpTitle}</h3>
          {settings.phone && <a className="commerce-footer-phone" href={`tel:${settings.phone.replace(/[^+0-9]/g, "")}`}>{settings.phone}</a>}
          {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
          <Link href={safeContentLink(c.helpHref)}>{c.helpText}</Link>
          </div>
        </div>
        {c.catalogEnabled && <>
          <CatalogLinks title={c.categoryTitle} links={categories} />
          <CatalogLinks title={c.brandTitle} links={brands} />
        </>}

        {c.catalogEnabled && <CatalogLinks title={c.productTitle} links={products} />}
        {secondaryColumns.map((col, i) => <CatalogLinks key={`${col.title}-${i}`} title={col.title} links={col.links.map((link, id) => ({ id, label: link.label, href: safeContentLink(link.href) }))} />)}
        {c.blogEnabled && <CatalogLinks title={c.blogTitle} links={catalog.articles} />}

        {help && <CatalogLinks title={help.title} links={help.links.map((link, id) => ({ id, label: link.label, href: safeContentLink(link.href) }))} />}
      </div>

      {c.discoveryLinks.length > 0 && <nav className="commerce-footer-shortcuts" aria-label="Alışveriş keşfi">
        {c.discoveryLinks.map((link, i) => <Link key={`${link.href}-${i}`} href={safeContentLink(link.href)}>{link.label}<span aria-hidden="true">↗</span></Link>)}
      </nav>}

      {c.introEnabled && <div className="commerce-footer-note"><div><h3>{c.title}</h3><p>{c.description}</p></div><Link href={safeContentLink(c.href)}>{c.linkText} →</Link></div>}
      <div className="commerce-footer-bottom">
      {c.newsletterEnabled && <FooterNewsletter />}
      {c.paymentEnabled && <div className="iv-footer-payment">
        <div><h3>{c.paymentTitle}</h3><p>{c.paymentDescription}</p></div>
        <div className="footer-payment-row">
          <span className="footer-paytr"><img src="/payments/paytr-current.png" alt="PayTR" loading="lazy" /> ile öde</span>
          {PAYMENT_LOGOS.map(logo => <img key={logo.name} src={logo.src} alt={logo.name} loading="lazy" />)}
          {settings.bank_transfer_enabled === "true" && <small>Havale / EFT</small>}
        </div>
      </div>}
      </div>
      {c.servicesEnabled && c.services.length > 0 && <nav className="commerce-footer-services" aria-label="Alışveriş hizmetleri">
        {c.services.map((service, i) => <Link key={i} href={safeContentLink(service.href)}><span className="commerce-footer-service-icon"><ServiceIcon name={service.icon} /></span><span><strong>{service.title}</strong><small>{service.description}</small></span></Link>)}
      </nav>}
      <div className="iv-footer-legal">
        <p>© {new Date().getFullYear()} {siteName}</p>
        <nav aria-label="Yasal bilgiler">
          {c.legal.map((link, i) => <Link prefetch={false} key={`${link.href}-${i}`} href={safeContentLink(link.href)}>{link.label}</Link>)}
          <button type="button" onClick={() => window.dispatchEvent(new Event("iv-pwa-settings"))}>Uygulama ve bildirimler</button>
          <button type="button" onClick={() => window.dispatchEvent(new Event("iv-cookie-settings"))}>Çerez tercihleri</button>
        </nav>
      </div>
    </div>
  </footer>;
}
