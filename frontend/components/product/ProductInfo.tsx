"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Product, ProductVariant } from "@/types";
import { formatPrice, calcDiscount } from "@/lib/utils";
import { productPurchaseState, clampProductQuantity } from "@/lib/product-purchase";
import { sanitizeHtml } from "@/lib/sanitize";
import { useProductReviews } from "@/lib/product-reviews";
import DetailIcon, { RatingStars } from "./DetailIcon";

interface ProductInfoProps {
  product: Product;
  onAddToCart?: (quantity: number, variantId?: number) => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  loading?: boolean;
  onShowTab?: (tab: "reviews" | "specs") => void;
}
export default function ProductInfo({ product, onAddToCart, onToggleFavorite, isFavorite = false, loading = false, onShowTab }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const { data: reviews, error: reviewError } = useProductReviews(product.id);
  const stats = reviews?.data.stats;
  const { variants, needsVariant, price: activePrice, comparePrice: activeComparePrice, stock: activeStock } = productPurchaseState(product, selectedVariant?.id);
  const outOfStock = activeStock <= 0;
  const discount = activeComparePrice ? calcDiscount(activePrice, activeComparePrice) : 0;
  const safeQuantity = clampProductQuantity(quantity, activeStock);

  function selectVariant(variant: ProductVariant) {
    setSelectedVariant(variant);
    setQuantity(q => clampProductQuantity(q, variant.stock));
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("#")[0]);
      toast.success("Ürün bağlantısı kopyalandı.");
    } catch { toast.error("Bağlantı kopyalanamadı. Adres çubuğundaki bağlantıyı kullanabilirsiniz."); }
  }

  return <div className="pdp-info">
    <h1>{product.name}</h1>
    <div className="pdp-meta-line">
      <button type="button" className="pdp-rating-link" onClick={() => onShowTab?.("reviews")} aria-label="Ürün değerlendirmelerine git">
        <RatingStars value={stats?.average_rating ?? 0} />
        {!!stats?.total_count && <strong>{stats.average_rating.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong>}
        <span>{stats ? `${stats.total_count} değerlendirme` : reviewError ? "Değerlendirmeler" : "Yükleniyor…"}</span>
      </button>
      {product.brand && <span>Marka: <Link href={`/markalar/${product.brand.slug}`}>{product.brand.name}</Link></span>}
      {product.sku && <span>SKU: <b>{selectedVariant?.sku || product.sku}</b></span>}
    </div>
    {product.short_description && <div className="pdp-short-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.short_description) }} />}
    <div className="pdp-price-row">
      <strong className={discount > 0 ? "pdp-price pdp-price-sale" : "pdp-price"}>{formatPrice(activePrice)}</strong>
      {discount > 0 && <del>{formatPrice(activeComparePrice!)}</del>}
      <span className={`pdp-stock ${outOfStock ? "pdp-stock-empty" : ""}`}>{outOfStock ? "Stokta yok" : "Stokta var"}</span>
    </div>
    {variants.length > 0 && <fieldset className="pdp-variants"><legend>Seçenekler</legend><div>
      {variants.map(variant => <button type="button" key={variant.id} onClick={() => selectVariant(variant)} disabled={variant.stock <= 0 || loading} aria-pressed={selectedVariant?.id === variant.id}>{variant.name}{variant.stock <= 0 ? " — Tükendi" : ""}</button>)}
    </div>{needsVariant && !outOfStock && <p>Sepete eklemek için bir seçenek belirleyin.</p>}</fieldset>}
    <div className="pdp-purchase" aria-label="Satın alma seçenekleri">
      <div className="pdp-quantity">
        <button type="button" aria-label="Adedi azalt" disabled={safeQuantity <= 1 || outOfStock || loading} onClick={() => setQuantity(safeQuantity-1)}>−</button>
        <input type="number" min="1" max={Math.max(1,activeStock)} value={safeQuantity} aria-label="Ürün adedi" disabled={outOfStock || loading} onChange={e => setQuantity(clampProductQuantity(Number(e.target.value), activeStock))} />
        <button type="button" aria-label="Adedi artır" disabled={safeQuantity >= activeStock || outOfStock || loading} onClick={() => setQuantity(safeQuantity+1)}>+</button>
      </div>
      <button type="button" className="pdp-add-cart" disabled={outOfStock || needsVariant || loading} aria-busy={loading} onClick={() => onAddToCart?.(safeQuantity, selectedVariant?.id)}><DetailIcon name="cart" />{loading ? "Ekleniyor…" : outOfStock ? "Stokta yok" : needsVariant ? "Seçenek belirleyin" : "Sepete ekle"}</button>
    </div>
    {!outOfStock && !needsVariant && activeStock <= product.low_stock_threshold && <p className="pdp-low-stock">Stokta son {activeStock} ürün.</p>}
    <div className="pdp-service-box">
      <div><DetailIcon name="truck"/><p><strong>Kargo.</strong> {outOfStock ? "Ürün yeniden stoğa geldiğinde sipariş verebilirsiniz." : "Stoktaki ürünlerde aynı gün kargo."} <Link href="/kargo-teslimat">Teslimat bilgileri</Link></p></div>
      <div><DetailIcon name="shield"/><p><strong>İade ve değişim.</strong> Ürüne ait iade koşullarını ve başvuru adımlarını <Link href="/iade-degisim">inceleyin.</Link></p></div>
    </div>
    <div className="pdp-actions">
      <button type="button" onClick={onToggleFavorite} aria-pressed={isFavorite}><span><DetailIcon name="heart" filled={isFavorite}/></span>{isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}</button>
      <button type="button" onClick={share}><span><DetailIcon name="share"/></span>Ürünü paylaş</button>
      <button type="button" onClick={() => onShowTab?.("specs")}><span><DetailIcon name="info"/></span>Ürün bilgileri</button>
    </div>
  </div>;
}
