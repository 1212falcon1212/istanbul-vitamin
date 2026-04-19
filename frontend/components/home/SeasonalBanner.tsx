"use client";

import Link from "next/link";
import type { Banner } from "@/types";
import FadeUp from "@/components/animations/FadeUp";
import { bannerImage } from "@/lib/placeholder-image";

interface SeasonalBannerProps {
  banners: Banner[];
}

/**
 * Tek büyük banner: görsel + link. Yazı/buton yok.
 * Admin panel `banners` tablosundan `image_url` ve `link_url` düzenler.
 */
export default function SeasonalBanner({ banners }: SeasonalBannerProps) {
  const banner =
    banners?.find((b) => b.position === "seasonal") ?? banners?.[0];
  const href = banner?.link_url || "/magaza";
  const src = banner?.image_url || bannerImage(undefined, "seasonal");
  const alt = banner?.title || "Kampanya";

  return (
    <FadeUp>
      <section>
        <Link
          href={href}
          aria-label={alt}
          className="block relative w-full max-w-full overflow-hidden rounded-2xl aspect-[16/9] sm:aspect-[16/6] md:aspect-[24/7] bg-white group"
        >
          <img
            src={src}
            alt={alt}
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      </section>
    </FadeUp>
  );
}
