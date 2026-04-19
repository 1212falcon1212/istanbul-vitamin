"use client";

import Image from "next/image";
import type { CartItem as CartItemType } from "@/types";
import { formatPrice } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
  compact?: boolean;
}

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  compact = false,
}: CartItemProps) {
  const imageUrl =
    item.product?.images?.find((img) => img.is_primary)?.image_url ||
    item.product?.images?.[0]?.image_url ||
    "/placeholder-product.png";
  const name = item.product?.name || "Urun";
  const variantName = item.variant?.name;
  const price = item.variant?.price ?? item.product?.price ?? 0;

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-b-0">
      {/* Image */}
      <div
        className={`relative shrink-0 rounded-lg overflow-hidden bg-bg-primary ${compact ? "w-16 h-16" : "w-20 h-20 sm:w-24 sm:h-24"}`}
      >
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={compact ? "64px" : "96px"}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4
          className={`font-medium text-text-primary truncate ${compact ? "text-sm" : "text-sm sm:text-base"}`}
        >
          {name}
        </h4>
        {variantName && (
          <p className="text-xs text-text-secondary mt-0.5">{variantName}</p>
        )}
        <p className="text-sm font-semibold text-primary mt-1">
          {formatPrice(price)}
        </p>

        {/* Quantity controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() =>
                onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
              }
              disabled={item.quantity <= 1}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Adet azalt"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14"
                />
              </svg>
            </button>
            <span className="w-8 h-8 flex items-center justify-center text-sm font-medium text-text-primary bg-bg-primary">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
              aria-label="Adet artir"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>

          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"
            aria-label="Urunun kaldir"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4.5 h-4.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
