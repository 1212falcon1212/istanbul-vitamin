"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { formatPrice, calcDiscount, cn, resolveImageUrl } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartDrawer } from "@/lib/cart-drawer";
import { useFavorites } from "@/lib/favorites";

interface ProductCardProps {
  product: Product;
  index?: number;
  /** Override için opsiyonel; verilmezse dahili useCart.addItem kullanılır. */
  onAddToCart?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  variant?: "horizontal" | "vertical";
}

const staggerDelays: Record<number, string> = {
  0: "",
  1: "delay-75",
  2: "delay-150",
  3: "delay-225",
  4: "delay-300",
  5: "delay-375",
  6: "delay-450",
};

export default function ProductCard({
  product,
  index = 0,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
  variant = "horizontal",
}: ProductCardProps) {
  const primaryImage =
    product.images?.find((img) => img.is_primary) ?? product.images?.[0];
  const imageUrl = primaryImage?.image_url
    ? resolveImageUrl(primaryImage.image_url)
    : "/placeholder-product.png";
  const discount = product.compare_price
    ? calcDiscount(product.price, product.compare_price)
    : 0;

  const delayClass = staggerDelays[index % 7] ?? "";

  const { addItem } = useCart();
  const { open: openDrawer } = useCartDrawer();
  const { isFavorite: inFavorites, toggle: toggleFav } = useFavorites();
  const [adding, setAdding] = useState(false);
  const favored = onToggleFavorite ? isFavorite : inFavorites(product.id);

  async function handleToggleFav() {
    if (onToggleFavorite) {
      onToggleFavorite();
      return;
    }
    try {
      await toggleFav(product.id);
      toast.success(
        inFavorites(product.id)
          ? "Favorilerden çıkarıldı"
          : "Favorilere eklendi"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "İşlem gerçekleştirilemedi"
      );
    }
  }

  async function handleAddToCart() {
    if (onAddToCart) {
      onAddToCart();
      return;
    }
    if (product.stock <= 0 || adding) return;
    setAdding(true);
    try {
      await addItem(product.id, 1);
      openDrawer();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ürün sepete eklenemedi"
      );
    } finally {
      setAdding(false);
    }
  }

  if (variant === "vertical") {
    return (
      <div
        className={cn(
          "group relative bg-white rounded-2xl border border-border overflow-hidden",
          "hover:shadow-md hover:border-primary/40 transition-all duration-300 animate-fade-in",
          "flex flex-col",
          delayClass
        )}
      >
        {/* Image */}
        <Link
          href={`/urun/${product.slug}`}
          className="relative block aspect-square bg-white overflow-hidden"
        >
          <Image
            src={imageUrl}
            alt={primaryImage?.alt_text || product.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            unoptimized={imageUrl.includes("/uploads/")}
          />
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-accent-rose text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              %{discount}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleFav();
            }}
            className={cn(
              "absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center border transition-all",
              favored
                ? "text-accent-rose border-red-200"
                : "text-text-secondary border-border hover:text-accent-rose hover:border-red-200"
            )}
            aria-label={favored ? "Favorilerden çıkar" : "Favorilere ekle"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={favored ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={favored ? 0 : 1.5}
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>
        </Link>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1 border-t border-border">
          {product.brand?.name && (
            <p className="text-[10px] uppercase tracking-wider text-text-secondary truncate">
              {product.brand.name}
            </p>
          )}
          <Link href={`/urun/${product.slug}`}>
            <h3 className="text-xs sm:text-sm text-text-primary leading-snug hover:text-primary transition-colors break-words">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-bold text-primary price">
              {formatPrice(product.price)}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-[11px] line-through text-text-secondary price">
                {formatPrice(product.compare_price)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddToCart();
            }}
            disabled={product.stock <= 0 || adding}
            className={cn(
              "mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-all",
              product.stock > 0
                ? "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {product.stock <= 0
              ? "Tükendi"
              : adding
                ? "Ekleniyor…"
                : "Sepete Ekle"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl border border-border overflow-hidden",
        "hover:shadow-lg transition-shadow duration-300",
        "animate-fade-in flex flex-row min-h-[200px] sm:min-h-[220px]",
        delayClass
      )}
    >
      {/* Left: Image — edge to edge */}
      <Link
        href={`/urun/${product.slug}`}
        className="relative shrink-0 w-1/2 overflow-hidden bg-white"
      >
        <Image
          src={imageUrl}
          alt={primaryImage?.alt_text || product.name}
          fill
          sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          unoptimized={imageUrl.includes("/uploads/")}
        />

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-accent-rose text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            %{discount}
          </span>
        )}
      </Link>

      {/* Right: Info */}
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 min-w-0">
        {/* Top: Brand + Name */}
        <div>
          {product.brand && (
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-text-secondary">
              {product.brand.name}
            </p>
          )}
          <Link href={`/urun/${product.slug}`}>
            <h3 className="text-xs sm:text-sm font-medium text-text-primary mt-0.5 leading-snug hover:text-primary transition-colors break-words">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Bottom: Price + Actions */}
        <div>
          {/* Price */}
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base sm:text-lg font-bold text-primary price">
              {formatPrice(product.price)}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-[11px] sm:text-xs line-through text-text-secondary price">
                {formatPrice(product.compare_price)}
              </span>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={product.stock <= 0 || adding}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all",
                product.stock > 0
                  ? "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              {product.stock <= 0
                ? "Tükendi"
                : adding
                  ? "Ekleniyor…"
                  : "Sepete Ekle"}
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleFav();
              }}
              className={cn(
                "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all border",
                favored
                  ? "bg-red-50 text-accent-rose border-red-200"
                  : "bg-white text-text-secondary border-border hover:text-accent-rose hover:border-red-200"
              )}
              aria-label={isFavorite ? "Favorilerden cikar" : "Favorilere ekle"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={isFavorite ? 0 : 1.5}
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
