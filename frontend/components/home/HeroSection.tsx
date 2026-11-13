"use client";
import { useHomeContent } from "@/lib/use-home-content";
import { safeContentLink } from "@/lib/home-content";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Banner, Product, Category } from "@/types";
import { resolveImageUrl } from "@/lib/utils";
import CategoryMenu from "@/components/layout/CategoryMenu";
import BannerPicture from "./BannerPicture";

interface HeroSectionProps {
  banners: Banner[];
  children?: ReactNode;
  featuredProducts: Product[];
  categories: Category[];
}
function bannerHref(value?: string) {
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  if (value && /^https?:\/\//i.test(value)) return value;
  return "/magaza";
}
export default function HeroSection({
  banners,
  children,
  categories,
}: HeroSectionProps) {
  const c = useHomeContent();
  const [index, setIndex] = useState(0);
  const active = banners
    .filter((b) => b.is_active && b.position === "hero")
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const hero = active[index % (active.length || 1)];
  const readyArtwork = hero?.image_fit === "artwork";
  return (
    <section aria-label="Öne çıkan kampanyalar" className="shop-hero-section">
      {readyArtwork && <h1 className="sr-only">{c.hero.title}</h1>}
      <div className="shop-hero-container">
        <div className="shop-hero-grid">
          <aside
            className="shop-hero-categories"
            aria-label="Ürün kategorileri"
          >
            <CategoryMenu categories={categories} />
          </aside>
          {hero && (
            <div
              data-banner-id={hero.id}
              data-banner-position="hero"
              className={`shop-hero-slide ${readyArtwork || !hero.secondary_image_url ? "shop-hero-artwork" : ""} ${readyArtwork ? "shop-hero-ready" : ""}`}
              style={{ backgroundColor: hero.background_color || "#f0f0ef" }}
            >
              <div className="shop-hero-art">
                {readyArtwork ? (
                  <BannerPicture banner={hero} eager />
                ) : hero.secondary_image_url ? (
                  <Image
                    src={resolveImageUrl(hero.secondary_image_url)}
                    alt={hero.secondary_image_alt || hero.title || "Kampanya"}
                    fill
                    priority
                    sizes="(min-width:1024px) 45vw, 100vw"
                    className={
                      hero.image_fit === "contain"
                        ? "object-contain"
                        : "object-cover"
                    }
                  />
                ) : (
                  <picture>
                    {hero.image_url_mobile && (
                      <source
                        media="(max-width:767px)"
                        srcSet={resolveImageUrl(hero.image_url_mobile)}
                      />
                    )}
                    <img
                      src={resolveImageUrl(hero.image_url)}
                      alt={hero.title || "Kampanya"}
                      fetchPriority="high"
                      className="h-full w-full object-cover"
                    />
                  </picture>
                )}
              </div>
              {(readyArtwork ||
                (!hero.title && !hero.subtitle && !hero.button_text)) && (
                <Link
                  className="shop-hero-full-link"
                  href={bannerHref(hero.link_url)}
                  aria-label={hero.title || "Kampanyayı keşfet"}
                />
              )}
              {!readyArtwork &&
                (hero.title || hero.subtitle || hero.button_text) && (
                  <div className="shop-hero-copy">
                    <span className="shop-hero-label">{c.hero.eyebrow}</span>
                    {hero.title && <h1>{hero.title}</h1>}
                    {hero.subtitle && <p>{hero.subtitle}</p>}
                    {hero.link_url && (
                      <Link
                        className="shop-hero-cta"
                        href={bannerHref(hero.link_url)}
                      >
                        {hero.button_text || "Ürünleri keşfet"}
                        <span aria-hidden>→</span>
                      </Link>
                    )}
                    {hero.secondary_link_url && hero.secondary_button_text && (
                      <Link
                        className="shop-hero-secondary"
                        href={bannerHref(hero.secondary_link_url)}
                      >
                        {hero.secondary_button_text} →
                      </Link>
                    )}
                  </div>
                )}
              {active.length > 1 && (
                <div className="shop-hero-dots" aria-label="Banner seçimi">
                  {active.map((b, i) => (
                    <button
                      key={b.id}
                      aria-label={`${i + 1}. banner`}
                      aria-pressed={i === index}
                      onClick={() => setIndex(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {c.hero.benefitsEnabled && (
          <div className="shop-benefits">
            {c.hero.benefits.map(({ icon, title, description }) => (
              <div key={title}>
                <span aria-hidden className="shop-benefit-icon">
                  {icon}
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
