"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { productPurchaseState } from "@/lib/product-purchase";
import { useCart } from "@/lib/cart";
import { useCartDrawer } from "@/lib/cart-drawer";
import { useFavorites } from "@/lib/favorites";
import ProductInfo from "./ProductInfo";

/**
 * ProductInfo'yu cart + favorites context'ine bağlayan ince client wrapper.
 * Detay sayfası server component olduğu için context'leri burada bağlıyoruz.
 */
export default function ProductInfoBound({ product, onShowTab }: { product: Product; onShowTab?: (tab: "reviews" | "specs") => void }) {
  const { addItem } = useCart();
  const { open: openDrawer } = useCartDrawer();
  const { isFavorite, toggle } = useFavorites();
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  async function handleAddToCart(quantity: number, variantId?: number) {
    const { canPurchase, stock } = productPurchaseState(product, variantId);
    if (pending.current || !canPurchase || !Number.isInteger(quantity) || quantity < 1 || quantity > stock) return;
    pending.current = true;
    setLoading(true);
    try {
      await addItem(product.id, quantity, variantId);
      openDrawer();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ürün sepete eklenemedi"
      );
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  async function handleToggleFav() {
    try {
      const wasFav = isFavorite(product.id);
      await toggle(product.id);
      toast.success(
        wasFav ? "Favorilerden çıkarıldı" : "Favorilere eklendi"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "İşlem gerçekleştirilemedi"
      );
    }
  }

  return (
    <ProductInfo
      product={product}
      loading={loading}
      onShowTab={onShowTab}
      onAddToCart={handleAddToCart}
      onToggleFavorite={handleToggleFav}
      isFavorite={isFavorite(product.id)}
    />
  );
}
