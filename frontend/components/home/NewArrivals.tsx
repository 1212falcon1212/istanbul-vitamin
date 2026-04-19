"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import SerifHeading from "@/components/ui/SerifHeading";
import FadeUp from "@/components/animations/FadeUp";
import { formatPrice, cn } from "@/lib/utils";

interface NewArrivalsProps {
  products: Product[];
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  const items = products.slice(0, 9);

  return (
    <FadeUp>
      <section>
        <div>
          <div className="bg-white/60 border border-border rounded-3xl p-5 md:p-8">
          <div className="mb-6">
            <SerifHeading size="md">
              Bu hafta <em>gelenler.</em>
            </SerifHeading>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((product) => {
              const img =
                product.images?.find((i) => i.is_primary)?.image_url ??
                product.images?.[0]?.image_url ??
                "/placeholder-product.png";

              return (
                <div
                  key={product.id}
                  className="group relative bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow flex flex-row min-h-[200px] sm:min-h-[220px]"
                >
                  <Link
                    href={`/urun/${product.slug}`}
                    className="relative shrink-0 w-1/2 overflow-hidden bg-white"
                  >
                    <Image
                      src={img}
                      alt={product.name}
                      fill
                      sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full">
                      Yeni
                    </span>
                  </Link>

                  <div className="flex-1 flex flex-col justify-between p-4 min-w-0">
                    <div>
                      {product.brand?.name && (
                        <p className="text-[10px] uppercase tracking-widest text-text-secondary">
                          {product.brand.name}
                        </p>
                      )}
                      <Link href={`/urun/${product.slug}`}>
                        <h3 className="text-sm font-medium text-text-primary mt-1 hover:text-primary transition-colors leading-snug break-words">
                          {product.name}
                        </h3>
                      </Link>
                    </div>

                    <div>
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(product.price)}
                      </p>
                      <Link
                        href={`/urun/${product.slug}`}
                        className={cn(
                          "mt-2 block text-center py-2 rounded-lg text-xs font-medium",
                          "bg-primary text-white hover:bg-primary-hover transition-colors"
                        )}
                      >
                        İncele
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
