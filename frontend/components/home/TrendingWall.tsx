"use client";

import type { Product } from "@/types";
import SerifHeading from "@/components/ui/SerifHeading";
import ProductCard from "@/components/product/ProductCard";

interface TrendingWallProps {
  products: Product[];
}

export default function TrendingWall({ products }: TrendingWallProps) {
  if (!products || products.length === 0) return null;

  return (
    <section>
      <div className="bg-white/60 border border-border rounded-3xl p-5 md:p-8">
        <div className="mb-6">
          <SerifHeading size="md">
            Bu hafta <em>çok aranan.</em>
          </SerifHeading>
          <p className="text-sm text-text-secondary mt-2 max-w-lg">
            Bu hafta en çok tercih edilen dermokozmetik ürünler.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              variant="horizontal"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
