"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { useCart } from "@/lib/cart";
import { useCartDrawer } from "@/lib/cart-drawer";
import { useFavorites } from "@/lib/favorites";
import ProductInfo from "./ProductInfo";

/**
 * ProductInfo'yu cart + favorites context'ine bağlayan ince client wrapper.
 * Detay sayfası server component olduğu için context'leri burada bağlıyoruz.
 */
export default function ProductInfoBound({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { open: openDrawer } = useCartDrawer();
  const { isFavorite, toggle } = useFavorites();
  const [loading, setLoading] = useState(false);

  async function handleAddToCart(quantity: number, variantId?: number) {
    if (product.stock <= 0 || loading) return;
    setLoading(true);
    try {
      await addItem(product.id, quantity, variantId);
      openDrawer();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ürün sepete eklenemedi"
      );
    } finally {
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
      onAddToCart={handleAddToCart}
      onToggleFavorite={handleToggleFav}
      isFavorite={isFavorite(product.id)}
    />
  );
}
