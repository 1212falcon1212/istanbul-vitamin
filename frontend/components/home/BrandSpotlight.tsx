"use client";

import Link from "next/link";
import type { Product, Brand } from "@/types";
import SectionLabel from "@/components/ui/SectionLabel";
import SerifHeading from "@/components/ui/SerifHeading";
import PillButton from "@/components/ui/PillButton";
import FadeUp from "@/components/animations/FadeUp";
import { formatPrice } from "@/lib/utils";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface BrandSpotlightData {
  brand: Brand;
  products: Product[];
  product_count: number;
}

interface BrandSpotlightProps {
  spotlight: BrandSpotlightData | null;
}

// ----------------------------------------------------------------
// Mini product card background pattern
// ----------------------------------------------------------------

const MINI_CARD_BG: string[] = [
  "bg-white border border-border",
  "bg-white border border-border",
  "bg-white border border-border",
  "bg-white border border-border",
];

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function BrandSpotlight({ spotlight }: BrandSpotlightProps) {
  if (!spotlight) return null;

  const { brand, products, product_count } = spotlight;
  const displayProducts = products.slice(0, 6);

  // Split brand name: first word normal, rest italic
  const nameParts = brand.name.split(" ");
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(" ");

  return (
    <FadeUp>
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-0 rounded-3xl overflow-hidden">
          {/* Left column */}
          <div className="bg-footer text-white p-8 md:p-10 flex flex-col justify-between">
            <div>
              <SectionLabel
                number="004"
                title="MARKA SPOTLIGHT"
                className="text-white/50"
              />
              <SerifHeading size="md" className="mt-4 text-white">
                {firstName}
                {restName ? (
                  <>
                    {" "}
                    <em>{restName}</em>
                  </>
                ) : null}
              </SerifHeading>
              <p className="text-white/70 text-sm mt-3 max-w-xs">
                {brand.description ??
                  "Dermatoloji uzmanları tarafından formüle edilmiş, hassas ciltler için özel bakım serisi."}
              </p>
            </div>

            <div>
              {/* Stats */}
              <div className="flex gap-8 mt-6">
                <div>
                  <p className="font-display text-3xl text-white">
                    {product_count}+
                  </p>
                  <p className="text-[9px] uppercase tracking-widest text-white/50 mt-0.5">
                    ÜRÜN
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl text-white">15</p>
                  <p className="text-[9px] uppercase tracking-widest text-white/50 mt-0.5">
                    SERİ
                  </p>
                </div>
              </div>

              {/* CTA */}
              <PillButton variant="white" href={`/markalar/${brand.slug}`} className="mt-6">
                Markayı keşfet →
              </PillButton>
            </div>
          </div>

          {/* Right column */}
          <div className="bg-white p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-full">
              {displayProducts.map((product, index) => {
                const primaryImage =
                  product.images?.find((i) => i.is_primary) ?? product.images?.[0];

                return (
                  <Link
                    key={product.id}
                    href={`/urun/${product.slug}`}
                    className={[
                      "rounded-xl overflow-hidden aspect-square relative block",
                      MINI_CARD_BG[index % MINI_CARD_BG.length],
                    ].join(" ")}
                  >
                    {/* Product image — full fit, white bg */}
                    <div className="absolute inset-0 bg-white flex items-center justify-center p-4 pb-12">
                      {primaryImage?.image_url ? (
                        <img
                          src={primaryImage.image_url}
                          alt={primaryImage.alt_text ?? product.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="rounded-lg bg-primary-soft w-14 h-14" />
                      )}
                    </div>

                    {/* Bottom strip */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/80 p-2">
                      <p className="text-[10px] text-text-primary line-clamp-1 font-body">
                        {product.name}
                      </p>
                      <p className="text-primary text-[11px] font-semibold">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
