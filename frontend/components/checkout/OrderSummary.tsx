import Image from "next/image";
import type { CartItem } from "@/types";
import { formatPrice } from "@/lib/utils";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

export default function OrderSummary({
  items,
  subtotal,
  shipping,
  discount,
  total,
}: OrderSummaryProps) {
  return (
    <div className="bg-card-bg rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-display text-lg text-text-primary">
        Siparis Ozeti
      </h3>

      {/* Items */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {items.map((item) => {
          const imageUrl =
            item.product?.images?.find((img) => img.is_primary)?.image_url ||
            item.product?.images?.[0]?.image_url ||
            "/placeholder-product.png";
          const price = item.variant?.price ?? item.product?.price ?? 0;

          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-bg-primary shrink-0">
                <Image
                  src={imageUrl}
                  alt={item.product?.name || "Urun"}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">
                  {item.product?.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {item.quantity} adet
                </p>
              </div>
              <span className="text-sm font-medium text-text-primary shrink-0">
                {formatPrice(price * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-border pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Ara Toplam</span>
          <span className="text-text-primary">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Kargo</span>
          <span className={shipping === 0 ? "text-green-600" : "text-text-primary"}>
            {shipping === 0 ? "Ucretsiz" : formatPrice(shipping)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Indirim</span>
            <span className="text-green-600">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2">
          <span className="font-semibold text-text-primary">Toplam</span>
          <span className="text-lg font-bold text-primary">
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
