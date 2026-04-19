"use client";

import type { Product } from "@/types";
import ProductGrid from "@/components/product/ProductGrid";

interface FeaturedProductsProps {
  products: Product[];
  title?: string;
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<number>;
}

export default function FeaturedProducts({
  products,
  title = "One Cikan Urunler",
  onAddToCart,
  onToggleFavorite,
  favoriteIds,
}: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="font-display text-2xl md:text-3xl text-text-primary mb-6">
          {title}
        </h2>
        <ProductGrid
          products={products}
          onAddToCart={onAddToCart}
          onToggleFavorite={onToggleFavorite}
          favoriteIds={favoriteIds}
        />
      </div>
    </section>
  );
}
