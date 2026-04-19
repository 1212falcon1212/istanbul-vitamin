"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { useCartDrawer } from "@/lib/cart-drawer";
import { formatPrice, cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";

const FREE_SHIPPING_THRESHOLD = 500;

export default function CartDrawer() {
  const { isOpen, close } = useCartDrawer();
  const { items, subtotal, itemCount, isLoading, updateItem, removeItem } =
    useCart();

  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function h(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, close]);

  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - subtotal
  );
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const total = Math.max(0, subtotal - couponDiscount);

  async function handleApplyCoupon() {
    const code = coupon.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await api.post<{ discount_amount: number }>("/cart/coupon", {
        code,
      });
      if (res.data) {
        setCouponDiscount(res.data.discount_amount);
        setCouponApplied(code);
      }
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : "Kupon uygulanamadı"
      );
      setCouponDiscount(0);
      setCouponApplied("");
    } finally {
      setCouponLoading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[70] w-full sm:max-w-[440px] bg-white shadow-2xl flex flex-col transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Sepet"
        role="dialog"
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl text-text-primary">Sepetiniz</h2>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-primary text-white text-xs font-bold">
                {itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Kapat"
            className="w-9 h-9 rounded-full hover:bg-bg-primary flex items-center justify-center transition text-text-secondary hover:text-text-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {itemCount > 0 && (
          <div className="px-6 py-4 bg-primary-soft/50 border-b border-border">
            <div className="flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13v10H3V7zm13 3h4l2 3v4h-6V10z" />
                <circle cx="7" cy="19" r="2" />
                <circle cx="18" cy="19" r="2" />
              </svg>
              <p className="text-xs text-text-primary leading-relaxed">
                {remainingForFreeShipping > 0 ? (
                  <>
                    <strong>{formatPrice(FREE_SHIPPING_THRESHOLD)}</strong> ve
                    üzeri ücretsiz kargodan yararlanmak için sepete eklemeniz
                    gereken tutar{" "}
                    <strong className="text-primary">
                      {formatPrice(remainingForFreeShipping)}
                    </strong>
                  </>
                ) : (
                  <>
                    <strong>Tebrikler!</strong> Siparişiniz ücretsiz kargo
                    kapsamında.
                  </>
                )}
              </p>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-white overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && items.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-bg-primary flex items-center justify-center mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-text-secondary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                </svg>
              </div>
              <p className="font-display text-lg text-text-primary mb-1">
                Sepetiniz boş
              </p>
              <p className="text-sm text-text-secondary mb-6">
                Hemen alışverişe başlamak için ürünleri keşfet.
              </p>
              <Link
                href="/magaza"
                onClick={close}
                className="inline-flex items-center justify-center h-11 px-6 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition"
              >
                Alışverişe Başla
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const img =
                  item.product?.images?.find((i) => i.is_primary)?.image_url ??
                  item.product?.images?.[0]?.image_url ??
                  "/placeholder-product.png";
                const price = item.variant?.price ?? item.product?.price ?? 0;
                return (
                  <li key={item.id} className="py-4 flex gap-3">
                    <Link
                      href={`/urun/${item.product?.slug ?? ""}`}
                      onClick={close}
                      className="relative shrink-0 w-20 h-20 rounded-xl bg-white border border-border overflow-hidden"
                    >
                      <Image
                        src={img}
                        alt={item.product?.name ?? ""}
                        fill
                        sizes="64px"
                        className="object-contain p-1.5"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <Link
                        href={`/urun/${item.product?.slug ?? ""}`}
                        onClick={close}
                        className="block"
                      >
                        {item.product?.brand?.name && (
                          <p className="text-[10px] uppercase tracking-widest text-text-secondary truncate">
                            {item.product.brand.name}
                          </p>
                        )}
                        <p className="text-sm text-text-primary line-clamp-2 mt-0.5 hover:text-primary transition">
                          {item.product?.name}
                        </p>
                        {item.variant?.name && (
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            {item.variant.name}
                          </p>
                        )}
                      </Link>
                      <p className="text-sm font-semibold text-primary mt-1 price">
                        {formatPrice(price)}
                      </p>

                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <div className="inline-flex items-center border border-border rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              item.quantity > 1 &&
                              updateItem(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary-soft disabled:opacity-40 transition"
                            aria-label="Azalt"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" d="M5 12h14" />
                            </svg>
                          </button>
                          <span className="w-9 h-8 flex items-center justify-center text-xs font-semibold text-text-primary border-x border-border">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, item.quantity + 1)
                            }
                            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary-soft transition"
                            aria-label="Artır"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                            </svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-text-secondary hover:text-accent-rose transition"
                        >
                          Kaldır
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-border px-6 py-5 space-y-3 bg-white">
            <div>
              {couponApplied ? (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 text-xs">
                  <span>
                    <strong>{couponApplied}</strong> uygulandı (
                    {formatPrice(couponDiscount)})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponApplied("");
                      setCouponDiscount(0);
                      setCoupon("");
                    }}
                    className="text-emerald-600 hover:text-emerald-800"
                    aria-label="Kaldır"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Kupon kodu"
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-white text-xs focus:outline-none focus:border-primary transition"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !coupon.trim()}
                    className="px-3 h-10 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition disabled:opacity-50"
                  >
                    {couponLoading ? "…" : "Uygula"}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-[10px] text-accent-rose mt-1">{couponError}</p>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-text-secondary">Ara Toplam</p>
                <p className="text-[11px] text-text-secondary">KDV dahildir.</p>
              </div>
              <p className="font-display text-2xl text-text-primary price">
                {formatPrice(total)}
              </p>
            </div>

            <Link
              href="/odeme"
              onClick={close}
              className="block w-full h-12 rounded-xl bg-primary text-white font-semibold text-center leading-[48px] hover:bg-primary-hover transition-colors"
            >
              Alışverişi Tamamla
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}
