"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product, ProductVariant } from "@/types";
import { formatPrice, calcDiscount, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

interface ProductInfoProps {
  product: Product;
  onAddToCart?: (quantity: number, variantId?: number) => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export default function ProductInfo({
  product,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
}: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );

  const activePrice = selectedVariant?.price ?? product.price;
  const activeComparePrice =
    selectedVariant?.compare_price ?? product.compare_price;
  const activeStock = selectedVariant?.stock ?? product.stock;
  const outOfStock = activeStock <= 0;

  const discount = activeComparePrice
    ? calcDiscount(activePrice, activeComparePrice)
    : 0;

  function handleQuantityChange(delta: number) {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > activeStock) return activeStock;
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Brand */}
      {product.brand && (
        <Link
          href={`/markalar/${product.brand.slug}`}
          className="text-sm text-text-secondary uppercase tracking-wide hover:text-primary transition-colors"
        >
          {product.brand.name}
        </Link>
      )}

      {/* Name */}
      <h1 className="font-display text-2xl md:text-3xl text-text-primary leading-snug">
        {product.name}
      </h1>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {product.is_featured && <Badge variant="info">Öne Çıkan</Badge>}
        {product.is_campaign && <Badge variant="danger">Kampanyalı</Badge>}
        {outOfStock ? (
          <Badge variant="warning">Stok Tükendi</Badge>
        ) : (
          <Badge variant="success">Stokta</Badge>
        )}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3 mt-1">
        <span className="text-3xl font-bold text-primary price">
          {formatPrice(activePrice)}
        </span>
        {activeComparePrice && activeComparePrice > activePrice && (
          <>
            <span className="text-lg text-text-secondary line-through price">
              {formatPrice(activeComparePrice)}
            </span>
            <Badge variant="danger">%{discount} indirim</Badge>
          </>
        )}
      </div>

      {/* Short description */}
      {product.short_description && (
        <p className="text-text-secondary text-sm leading-relaxed mt-1">
          {product.short_description}
        </p>
      )}

      {/* Variants */}
      {product.variants && product.variants.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            Seçenekler
          </h3>
          <div className="flex flex-wrap gap-2">
            {product.variants
              .filter((v) => v.is_active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((variant) => (
                <button
                  key={variant.id}
                  onClick={() =>
                    setSelectedVariant(
                      selectedVariant?.id === variant.id ? null : variant
                    )
                  }
                  disabled={variant.stock <= 0}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-sm transition-colors",
                    selectedVariant?.id === variant.id
                      ? "border-primary bg-primary-soft text-primary font-medium"
                      : variant.stock <= 0
                        ? "border-border text-text-secondary opacity-50 cursor-not-allowed"
                        : "border-border text-text-primary hover:border-primary hover:text-primary"
                  )}
                >
                  {variant.name}
                  {variant.price !== product.price && (
                    <span className="ml-1 text-xs text-text-secondary">
                      ({formatPrice(variant.price)})
                    </span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Quantity + Add to cart */}
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        {/* Quantity selector */}
        <div className="flex items-center border border-border rounded-xl overflow-hidden shrink-0">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="w-10 h-12 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Azalt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          </button>
          <span className="w-12 h-12 flex items-center justify-center text-sm font-medium text-text-primary border-x border-border">
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= activeStock}
            className="w-10 h-12 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Artır"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Add to cart button */}
        <button
          onClick={() => onAddToCart?.(quantity, selectedVariant?.id)}
          disabled={outOfStock}
          className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {outOfStock ? "Stokta Yok" : "Sepete Ekle"}
        </button>

        {/* Favorite button */}
        <button
          onClick={onToggleFavorite}
          className={cn(
            "inline-flex items-center justify-center w-12 h-12 rounded-xl border transition-colors shrink-0",
            isFavorite
              ? "border-red-300 bg-red-50 text-red-500"
              : "border-border text-text-secondary hover:border-primary hover:text-primary"
          )}
          aria-label={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={isFavorite ? 0 : 1.5}
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      </div>

      {/* Low stock warning */}
      {!outOfStock && activeStock <= product.low_stock_threshold && (
        <p className="text-sm text-orange-600 font-medium">
          Son {activeStock} ürün! Acele edin.
        </p>
      )}

      {/* Product meta */}
      <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs text-text-secondary">
        <p>
          <span className="font-medium text-text-primary">SKU:</span>{" "}
          {product.sku}
        </p>
        {product.barcode && (
          <p>
            <span className="font-medium text-text-primary">Barkod:</span>{" "}
            {product.barcode}
          </p>
        )}
        {product.categories && product.categories.length > 0 && (
          <p>
            <span className="font-medium text-text-primary">Kategoriler:</span>{" "}
            {product.categories.map((cat, i) => (
              <span key={cat.id}>
                <Link
                  href={`/${cat.slug}`}
                  className="text-primary hover:text-primary-dark transition-colors"
                >
                  {cat.name}
                </Link>
                {i < product.categories!.length - 1 && ", "}
              </span>
            ))}
          </p>
        )}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {product.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2.5 py-0.5 rounded-full bg-primary-soft text-primary text-xs"
              >
                {tag.tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
