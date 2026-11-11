"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import type { Product } from "@/types";
import { api } from "@/lib/api";
import { catalogPreview, catalogPreviewEnabled } from "@/lib/catalog-preview";
import { formatPrice, calcDiscount, resolveImageUrl } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartDrawer } from "@/lib/cart-drawer";
import { useFavorites } from "@/lib/favorites";

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToCart?: () => void | Promise<void>;
  onToggleFavorite?: () => void | Promise<void>;
  isFavorite?: boolean;
  /** Kept for existing callers; every listing uses the shared vertical design. */
  variant?: "horizontal" | "vertical";
}
interface ReviewData { stats: { average_rating: number; total_count: number } }
async function fetchReviews(path: string): Promise<ReviewData> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}${path}`);
  if (!response.ok) throw new Error("Değerlendirmeler yüklenemedi");
  const json = await response.json();
  return json.data;
}

export default function ProductCard({ product, onAddToCart, onToggleFavorite, isFavorite = false }: ProductCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLElement>(null);
  const pending = useRef(false);
  const [visible, setVisible] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const preview = previewEnabled ? catalogPreview(product) : null;
  const [isNew, setIsNew] = useState(false);
  const [adding, setAdding] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const { addItem } = useCart();
  const { open } = useCartDrawer();
  const { isFavorite: inFavorites, toggle } = useFavorites();
  const favored = onToggleFavorite ? isFavorite : inFavorites(product.id);
  const { data: reviews, error: reviewError } = useSWR(visible && !previewEnabled ? `/products/${product.id}/reviews?per_page=1` : null, fetchReviews, { revalidateOnFocus: false, dedupingInterval: 60000 });
  const stats = preview ? { average_rating: preview.rating, total_count: preview.count } : reviews?.stats;
  const rating = Math.max(0, Math.min(5, stats?.average_rating ?? 0));
  const image = product.images?.find((item) => item.is_primary) ?? product.images?.[0];
  const comparePrice = preview?.comparePrice ?? product.compare_price;
  const discount = comparePrice ? calcDiscount(product.price, comparePrice) : 0;
  const href = `/urun/${product.slug}`;

  useEffect(() => {
    setPreviewEnabled(catalogPreviewEnabled(window.location.hostname));
    const age = Date.now() - Date.parse(product.created_at);
    setIsNew(Number.isFinite(age) && age >= 0 && age < 30 * 24 * 60 * 60 * 1000);
    const element = cardRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "150px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [product.created_at]);

  async function handleFavorite() {
    if (favoriting) return;
    setFavoriting(true);
    try {
      if (onToggleFavorite) await onToggleFavorite();
      else await toggle(product.id);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Favori güncellenemedi"); }
    finally { setFavoriting(false); }
  }

  async function handleAdd() {
    if (pending.current || product.stock <= 0) return;
    pending.current = true;
    setAdding(true);
    try {
      if (onAddToCart) { await onAddToCart(); return; }
      const detail = await api.get<Product>(`/products/${product.slug}`);
      if (detail.data?.variants?.some((variant) => variant.is_active)) { router.push(href); return; }
      await addItem(product.id, 1);
      open();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Ürün sepete eklenemedi"); }
    finally { pending.current = false; setAdding(false); }
  }

  return (
    <article ref={cardRef} className="catalog-product-card" data-preview={previewEnabled || undefined} data-discount={discount > 0 || undefined}>
      <div className="catalog-product-image">
        <Link href={href} aria-label={product.name} className="absolute inset-0">
          {image ? <Image src={resolveImageUrl(image.image_url)} alt={image.alt_text || product.name} fill sizes="(min-width:1440px) 320px, (min-width:1200px) 25vw, (min-width:768px) 33vw, 50vw" className="object-contain p-2 mix-blend-multiply" /> : <span className="flex h-full items-center justify-center p-3 text-center text-xs text-text-secondary">Görsel hazırlanıyor</span>}
        </Link>
        <div className="absolute left-2 top-1 right-2 flex flex-wrap items-center gap-1 pointer-events-none">
          <button type="button" onClick={handleFavorite} disabled={favoriting} aria-pressed={favored} aria-label={`${product.name}: ${favored ? "Favorilerden çıkar" : "Favorilere ekle"}`} className={`catalog-product-badge pointer-events-auto ${favored ? "" : "catalog-product-heart"}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={favored ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
            {favored && "Favori"}
          </button>
          {discount > 0 && <span className="theme-discount-badge">%{discount}</span>}
          {preview?.favorite && !favored && <span className="catalog-product-badge" title="Lokal örnek rozet">♡ Favori</span>}
          {(isNew || (preview && !preview.favorite)) && <span className="catalog-product-badge"><span aria-hidden="true">✧</span> Yeni</span>}
        </div>
      </div>
      <div className="catalog-product-info">
        {product.brand?.name && <p className="catalog-product-brand">{product.brand.name}</p>}
        <h3 className="catalog-product-title"><Link href={href} title={product.name}>{product.name}</Link></h3>
        <div className="catalog-product-reviews">
          {stats && stats.total_count > 0 ? <>
            <span className="catalog-product-stars relative inline-block leading-none tracking-[1px] text-[#ded9e5]" aria-label={`5 üzerinden ${rating.toFixed(1)} yıldız`}>
              <span aria-hidden="true">★★★★★</span><span aria-hidden="true" className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-[#ffb800]" style={{ width: `${rating / 5 * 100}%` }}>★★★★★</span>
            </span>
            <strong className="theme-review-average">{rating.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
            <span title={preview ? "Lokal örnek değerlendirme" : "Değerlendirme sayısı"}>{stats.total_count.toLocaleString("tr-TR")}{preview ? " örnek" : ""}</span>
          </> : <span className="text-[#82758f]">{stats ? "Henüz değerlendirme yok" : reviewError ? "Değerlendirme bilgisi alınamadı" : "Değerlendirmeler yükleniyor"}</span>}
        </div>
        <div className="catalog-product-pricing price">
          <strong>{formatPrice(product.price)}</strong>
          {discount > 0 && <><del>{formatPrice(comparePrice!)}</del><span className="catalog-product-discount">%{discount} indirim</span></>}
        </div>
        <div className="catalog-product-stock" style={{ color: product.stock > 0 ? "#139956" : "#a34d62" }}>
          <span aria-hidden="true" className="catalog-product-stock-icon"><span className="text-white">{product.stock > 0 ? "✓" : "−"}</span></span>
          {product.stock > 0 ? "Stokta var" : "Tükendi"}
          {product.stock > 0 && <span className="catalog-product-shipping">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 5h12v12H2zM14 9h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>
            Aynı gün kargo
          </span>}
        </div>
        <div className="catalog-product-actions">
          <button type="button" onClick={handleAdd} disabled={adding || product.stock <= 0} aria-busy={adding} aria-label={`${product.name}: ${product.stock > 0 ? "Sepete ekle" : "Tükendi"}`} className="catalog-product-cart">
            {adding ? "…" : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>}
            <span>{adding ? "Ekleniyor" : product.stock <= 0 ? "Tükendi" : "Sepete ekle"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
