"use client";

import type { Product } from "@/types";
import SerifHeading from "@/components/ui/SerifHeading";
import ProductCard from "@/components/product/ProductCard";
import FadeUp from "@/components/animations/FadeUp";

interface RecommendedProductsProps {
  products: Product[];
}

export default function RecommendedProducts({ products }: RecommendedProductsProps) {
  const items = products.slice(0, 9);
  if (items.length === 0) return null;

  return (
    <FadeUp>
      <section className="py-6">
        <div className="bg-white/60 border border-border rounded-3xl p-5 md:p-8">
          <div className="mb-6">
            <SerifHeading size="md">
              Sizin için <em>seçtiklerimiz.</em>
            </SerifHeading>
            <p className="text-sm text-text-secondary mt-2 max-w-lg">
              Dermatoloji onaylı, en çok tercih edilen ürünler size özel.
            </p>
          </div>

          <div className="catalog-product-grid">
            {items.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
