import type { Brand } from "@/types";

interface BrandMarqueeProps {
  brands: Brand[];
}

const PLACEHOLDER_BRANDS = [
  "La Roche-Posay",
  "Vichy",
  "CeraVe",
  "Avène",
  "SVR",
  "Bioderma",
];

export default function BrandMarquee({ brands }: BrandMarqueeProps) {
  const displayBrands =
    brands.length > 0 ? brands.map((b) => b.name) : PLACEHOLDER_BRANDS;

  // Duplicate for seamless loop
  const items = [...displayBrands, ...displayBrands];

  return (
    <div className="w-full bg-bg-footer py-5 overflow-hidden">
      <div className="animate-marquee">
        {items.map((name, i) => (
          <span
            key={i}
            className="px-8 flex items-center gap-3 shrink-0"
            aria-hidden={i >= displayBrands.length}
          >
            <span
              className={`font-display text-2xl text-white${
                i % 2 === 0 ? "" : " italic"
              }`}
            >
              {name}
            </span>
            <span className="text-primary text-xl select-none" aria-hidden>
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
