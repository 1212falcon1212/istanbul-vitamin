import { formatPrice } from "@/lib/utils";

interface CartSummaryProps {
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
}

export default function CartSummary({
  subtotal,
  shippingCost,
  discountAmount,
  total,
}: CartSummaryProps) {
  const FREE_SHIPPING_THRESHOLD = 500;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="bg-card-bg rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-display text-lg text-text-primary">
        Siparis Ozeti
      </h3>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Ara Toplam</span>
          <span className="text-text-primary font-medium">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Kargo</span>
          <span
            className={
              isFreeShipping
                ? "text-green-600 font-medium"
                : "text-text-primary font-medium"
            }
          >
            {isFreeShipping ? "Ucretsiz" : formatPrice(shippingCost)}
          </span>
        </div>

        {!isFreeShipping && subtotal > 0 && (
          <p className="text-xs text-text-secondary">
            {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} daha ekleyin,
            kargo ucretsiz olsun!
          </p>
        )}

        {discountAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Kupon Indirimi</span>
            <span className="text-green-600 font-medium">
              -{formatPrice(discountAmount)}
            </span>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-text-primary">
              Toplam
            </span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
