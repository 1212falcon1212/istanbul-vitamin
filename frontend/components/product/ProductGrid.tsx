"use client";

import type { Product } from "@/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<number>;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden flex flex-row h-[160px] sm:h-[180px]">
      <div className="shrink-0 w-[140px] sm:w-[160px] animate-shimmer" />
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-primary-soft rounded w-1/3" />
          <div className="h-3.5 bg-primary-soft rounded w-full" />
          <div className="h-3.5 bg-primary-soft rounded w-2/3" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-primary-soft rounded w-1/2" />
          <div className="h-9 bg-primary-soft rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({
  products,
  loading = false,
  onAddToCart,
  onToggleFavorite,
  favoriteIds,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-soft/50 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-10 h-10 text-text-secondary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </div>
        <p className="text-text-secondary text-lg font-medium">
          Urun bulunamadi.
        </p>
        <p className="text-text-secondary/70 text-sm mt-1">
          Farkli bir kategoriyi denemeye ne dersiniz?
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
          onToggleFavorite={
            onToggleFavorite ? () => onToggleFavorite(product) : undefined
          }
          isFavorite={favoriteIds?.has(product.id)}
        />
      ))}
    </div>
  );
}
