"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Banner, Product, Category } from "@/types";
import { LOCAL_BANNERS } from "@/lib/placeholder-image";
import { resolveImageUrl } from "@/lib/utils";

interface HeroSectionProps {
  banners: Banner[];
  featuredProducts: Product[];
  categories: Category[];
}

type Item = { image: string; href: string; alt: string };

/**
 * Hero = tek büyük slider (animasyonlu) + altında 3 banner satırı.
 * Tüm görseller admin paneli `banners` tablosundan gelir — pozisyonlara göre:
 *   - position="hero"       : üstteki büyük slider
 *   - position="hero_tile"  : altındaki 3 tile (yoksa hero'dan veya yerel pool'dan doldurulur)
 */
export default function HeroSection({ banners }: HeroSectionProps) {
  const active = (banners ?? []).filter((b) => b.is_active !== false);
  const hero = active.filter((b) => b.position === "hero");
  const tiles = active.filter((b) => b.position === "hero_tile");

  const mapBanner = (b: Banner, fallbackAlt: string): Item => ({
    image: resolveImageUrl(b.image_url) || LOCAL_BANNERS[0],
    href: b.link_url || "/magaza",
    alt: b.title || fallbackAlt,
  });

  const sliderItems: Item[] =
    hero.length > 0
      ? hero.map((b, i) => mapBanner(b, `Kampanya ${i + 1}`))
      : LOCAL_BANNERS.slice(0, 3).map((image, i) => ({
          image,
          href: "/magaza",
          alt: `Kampanya ${i + 1}`,
        }));

  const belowItems: Item[] =
    tiles.length > 0
      ? tiles.slice(0, 3).map((b, i) => mapBanner(b, `Öne çıkan ${i + 1}`))
      : LOCAL_BANNERS.slice(3, 6).map((image, i) => ({
          image,
          href: "/magaza",
          alt: `Öne çıkan ${i + 1}`,
        }));
  // 3 tile doldurulmadıysa yerel pool ile tamamla
  while (belowItems.length < 3) {
    const i = belowItems.length;
    belowItems.push({
      image: LOCAL_BANNERS[(3 + i) % LOCAL_BANNERS.length],
      href: "/magaza",
      alt: `Öne çıkan ${i + 1}`,
    });
  }

  return (
    <section className="w-full py-4 space-y-4">
      {/* Ana slider — tam genişlik */}
      <div className="w-full px-4 md:px-6 lg:px-8">
        <HeroSlider items={sliderItems} />
      </div>

      {/* Alt 3 banner — ortalı */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        {belowItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <Link
              href={item.href}
              aria-label={item.alt}
              className="relative block w-full overflow-hidden rounded-2xl bg-white group aspect-[16/8] sm:aspect-[16/6] lg:aspect-[16/5]"
            >
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(min-width:1024px) 33vw, 100vw"
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
            </Link>
          </motion.div>
        ))}
      </div>
      </div>
    </section>
  );
}

function HeroSlider({ items }: { items: Item[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(id);
  }, [items.length]);

  const current = items[index];
  if (!current) return null;

  return (
    <div className="relative w-full max-w-full rounded-2xl overflow-hidden bg-white aspect-[16/8] sm:aspect-[16/6] md:aspect-[16/5] lg:aspect-[16/4]">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Link
            href={current.href}
            aria-label={current.alt}
            className="block w-full h-full group"
          >
            <Image
              src={current.image}
              alt={current.alt}
              fill
              sizes="100vw"
              priority={index === 0}
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={[
                "h-2 rounded-full transition-all",
                i === index ? "w-8 bg-white" : "w-2 bg-white/60 hover:bg-white/80",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
