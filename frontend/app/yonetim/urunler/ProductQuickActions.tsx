"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Product } from "@/types";

type Props = {
  product: Product;
  onDelete: () => void;
  onSaved: (statusChanged: boolean) => void;
};

export default function ProductQuickActions({ product, onSaved, onDelete }: Props) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [above, setAbove] = useState(false);
  const [edge, setEdge] = useState({ x: 0, y: 0 });

  async function save(change: { price: number } | { is_active: boolean }) {
    setSaving(true);
    try {
      await api.patch(`/admin/products/${product.id}`, change);
      panel.current?.hidePopover();
      toast.success("price" in change ? "Fiyat güncellendi" : "Ürün durumu güncellendi");
      onSaved("is_active" in change);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ürün güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  const discounted = (product.compare_price ?? 0) > product.price;
  const itemClass = "block w-full rounded-md px-3 py-2 text-left hover:bg-primary-soft focus-visible:bg-primary-soft disabled:opacity-50";
  return (
    <>
      <button type="button" popoverTarget={id} title="Hızlı erişim"
        aria-label={`${product.name} için hızlı erişim`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-primary-soft hover:text-primary"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const openAbove = window.innerHeight - rect.bottom < 220 && rect.top > window.innerHeight - rect.bottom;
          setAbove(openAbove);
          setEdge({ x: Math.max(8, window.innerWidth - rect.right), y: openAbove ? window.innerHeight - rect.top + 4 : rect.bottom + 4 });
          setEditing(false);
          setPrice(product.price.toFixed(2).replace(".", ","));
        }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <div ref={panel} id={id} popover="auto"
        style={{ maxHeight: `calc(100dvh - ${edge.y + 8}px)`, right: edge.x, ...(above ? { bottom: edge.y } : { top: edge.y }) }}
        className="fixed inset-auto m-0 w-48 overflow-y-auto rounded-xl border border-border bg-white p-1.5 text-left text-sm text-text-primary shadow-lg">
        {editing ? (
          <form className="space-y-3 p-2" onSubmit={(event) => {
            event.preventDefault();
            const value = Number(price.replace(",", "."));
            if (value <= 0) {
              toast.error("Fiyat sıfırdan büyük olmalıdır");
              return;
            }
            void save({ price: value });
          }}>
            {discounted && <div className="text-xs text-text-secondary">Liste fiyatı {formatPrice(product.compare_price!)}</div>}
            <label className="block text-xs font-medium">
              {discounted ? "İndirimli fiyat (₺)" : "Satış fiyatı (₺)"}
              <input autoFocus required inputMode="decimal" pattern="[0-9]{1,8}([,.][0-9]{1,2})?"
                title="En fazla iki ondalık basamaklı bir fiyat girin"
                className="mt-1 block w-full rounded-md border border-border px-2 py-1.5 text-sm"
                value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => panel.current?.hidePopover()}>Vazgeç</button>
              <button disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-white disabled:opacity-50">Kaydet</button>
            </div>
          </form>
        ) : (
          <>
            <a className={itemClass} href={`/urun/${product.slug}`} target="_blank" rel="noopener noreferrer"
              onClick={() => panel.current?.hidePopover()}>Mağazada görüntüle</a>
            <Link className={itemClass} href={`/yonetim/urunler/${product.id}`}>Düzenle</Link>
            <button type="button" className={itemClass} disabled={saving} onClick={() => setEditing(true)}>Fiyat düzenle</button>
            <button type="button" className={itemClass} disabled={saving} onClick={() => void save({ is_active: !product.is_active })}>
              {product.is_active ? "Pasif yap" : "Aktif yap"}
            </button>
            <button type="button" className={`${itemClass} border-t border-border text-red-600`} disabled={saving}
              onClick={() => { panel.current?.hidePopover(); onDelete(); }}>Sil</button>
          </>
        )}
      </div>
    </>
  );
}
