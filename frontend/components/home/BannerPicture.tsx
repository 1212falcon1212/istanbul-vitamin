import { getImageProps } from "next/image";
import type { Banner } from "@/types";
import { resolveImageUrl } from "@/lib/utils";

const dimensions: Record<string, [number, number]> = {
  hero: [1800, 880], promo_triple: [900, 460], promo_tall: [660, 820],
  promo_wide: [1380, 580], promo_inline: [880, 880], promo_strip: [2083, 755], promo_brand: [660, 880],
};

/** Native picture art direction with Next's responsive image optimization. */
export default function BannerPicture({ banner, className, eager = false }: { banner: Banner; className?: string; eager?: boolean }) {
  const [width, height] = dimensions[banner.position] || [900, 460];
  const sizes = banner.position === "hero" ? "(max-width: 1023px) 100vw, 1085px"
    : banner.position === "promo_strip" ? "(max-width: 1439px) 100vw, 1410px"
    : banner.position === "promo_wide" ? "(max-width: 767px) 100vw, 690px"
    : banner.position === "promo_tall" ? "(max-width: 1023px) 50vw, 330px"
    : "(max-width: 767px) 100vw, 460px";
  const { props } = getImageProps({ src: resolveImageUrl(banner.image_url), alt: "", width, height, sizes, loading: eager ? "eager" : "lazy", fetchPriority: eager ? "high" : undefined });
  const [mobileWidth, mobileHeight] = banner.position === "hero" ? [880, 1100] : banner.position === "promo_strip" ? [1000, 500] : [width, height];
  const mobile = banner.image_url_mobile ? getImageProps({ src: resolveImageUrl(banner.image_url_mobile), alt: "", width: mobileWidth, height: mobileHeight, sizes: "100vw" }).props : null;
  return <picture className={className}>
    {mobile && <source media="(max-width:767px)" srcSet={mobile.srcSet} sizes={mobile.sizes} width={mobileWidth} height={mobileHeight} />}
    {/* getImageProps supplies optimized src/srcSet for this art-directed picture. */}
    <img {...props} alt="" />
  </picture>;
}
