"use client";
import { useHomeContent } from "@/lib/use-home-content";
import { safeContentLink } from "@/lib/home-content";
import Link from "next/link";
import type { Banner } from "@/types";
import { resolveImageUrl } from "@/lib/utils";
import { bannerLink, bannersAt, bannerPositions } from "@/lib/banner-slots";
import BannerPicture from "./BannerPicture";

export function PromoBanner({
  banner,
  variant = "triple",
}: {
  banner: Banner;
  variant?: string;
}) {
  const c = useHomeContent();
  const readyArtwork = banner.image_fit === "artwork";
  const hasCopy =
    !readyArtwork &&
    Boolean(banner.title || banner.subtitle || banner.button_text);
  return (
    <Link
      href={bannerLink(banner.link_url)}
      aria-label={banner.title || "Kampanyayı keşfet"}
      data-banner-id={banner.id}
      data-banner-position={banner.position}
      className={`theme-promo banner-slot banner-slot-${variant} ${banner.image_fit === "contain" ? "banner-slot-product" : "banner-slot-artwork"} ${readyArtwork ? "banner-slot-ready" : ""} ${readyArtwork && banner.image_url.endsWith("/delivery-strip.png") ? "banner-slot-ribbon-export" : ""}`}
      style={{ backgroundColor: banner.background_color || "#f3f0ec" }}
    >
      {readyArtwork ? (
        <BannerPicture banner={banner} className="banner-slot-visual" />
      ) : (
        <picture className="banner-slot-visual">
          {banner.image_url_mobile && (
            <source
              media="(max-width:767px)"
              srcSet={resolveImageUrl(banner.image_url_mobile)}
            />
          )}
          {/* Native picture preserves the separately editable mobile artwork. */}
          <img src={resolveImageUrl(banner.image_url)} alt="" loading="lazy" />
        </picture>
      )}
      {hasCopy && (
        <div className="theme-promo-copy">
          {variant !== "strip" && <span>{c.promo.eyebrow}</span>}
          {banner.title && <h2>{banner.title}</h2>}
          {banner.subtitle && <p>{banner.subtitle}</p>}
          {banner.button_text && (
            <b>
              {banner.button_text}
              <span aria-hidden="true">→</span>
            </b>
          )}
        </div>
      )}
    </Link>
  );
}

export default function ThemePromos({
  banners,
  position,
}: {
  banners: Banner[];
  position: string;
}) {
  const items = bannersAt(banners, position);
  if (!items.length) return null;
  const variant = position.replace("promo_", "");
  return (
    <section
      className={`theme-promos theme-promos-${variant}`}
      aria-label={bannerPositions.find((p) => p.value === position)?.label}
    >
      {items.map((banner) => (
        <PromoBanner key={banner.id} banner={banner} variant={variant} />
      ))}
    </section>
  );
}
