import type { Product } from "@/types";

export function productPurchaseState(product: Product, variantId?: number) {
  const variants = (product.variants ?? []).filter(v => v.is_active).sort((a,b) => a.sort_order-b.sort_order);
  const selectedVariant = variants.find(v => v.id === variantId);
  const needsVariant = variants.length > 0 && !selectedVariant;
  const stock = selectedVariant?.stock ?? (variants.length ? Math.max(...variants.map(v => v.stock)) : product.stock);
  return {
    variants, selectedVariant, needsVariant, stock,
    price: selectedVariant?.price ?? product.price,
    comparePrice: selectedVariant ? selectedVariant.compare_price : product.compare_price,
    canPurchase: !needsVariant && stock > 0,
  };
}
export function clampProductQuantity(quantity: number, stock: number) {
  return Math.max(1, Math.min(Number.isFinite(quantity) ? Math.trunc(quantity) : 1, Math.max(1,stock)));
}
