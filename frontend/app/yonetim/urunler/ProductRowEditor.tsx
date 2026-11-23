"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Product } from "@/types";
import ProductQuickActions from "./ProductQuickActions";

type Props = {
  product: Product;
  onDelete: () => void;
  onRefresh: (statusChanged: boolean) => void;
  onSaved: (fields: Partial<Product>) => void;
};

function values(product: Product) {
  const discounted = (product.compare_price ?? 0) > product.price;
  const money = (n: number) => n.toFixed(2).replace(".", ",");
  return {
    retail: money(discounted ? product.compare_price! : product.price),
    discount: discounted ? money(product.price) : "",
    expiry: product.expiry_date?.slice(0, 10) ?? "",
    stock: String(product.stock),
    active: product.is_active,
  };
}

const inputClass = "h-8 rounded-md border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const cellClass = "px-3 py-2 whitespace-nowrap";
const moneyPattern = "[0-9]{1,8}([,.][0-9]{1,2})?";

export default function ProductRowEditor({ product, onDelete, onRefresh, onSaved }: Props) {
  const formId = useId();
  const original = values(product);
  const [changes, setChanges] = useState<Partial<typeof original>>({});
  const [saving, setSaving] = useState(false);
  const draft = { ...original, ...changes };
  const dirty = Object.keys(changes).length > 0;

  function edit<K extends keyof typeof original>(key: K, value: typeof original[K]) {
    setChanges((current) => {
      const next = { ...current, [key]: value };
      if (value === original[key]) delete next[key];
      return next;
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    const patch: Record<string, unknown> = {};
    const updated: Partial<Product> = {};
    if (changes.retail !== undefined || changes.discount !== undefined) {
      const retail = Number(draft.retail.replace(",", "."));
      const discount = draft.discount ? Number(draft.discount.replace(",", ".")) : null;
      if (retail <= 0 || (discount !== null && (discount <= 0 || discount >= retail))) {
        toast.error("Perakende fiyatı pozitif, indirimli fiyat ise pozitif ve perakende fiyatından düşük olmalıdır.");
        return;
      }
      patch.pricing = { retail, discounted: discount };
      updated.price = discount ?? retail;
      updated.compare_price = discount !== null ? retail : undefined;
    }
    if (changes.expiry !== undefined) {
      patch.expiry_date = draft.expiry;
      updated.expiry_date = draft.expiry || undefined;
    }
    if (changes.stock !== undefined) {
      updated.stock = Number(draft.stock);
      patch.stock = updated.stock;
    }
    if (changes.active !== undefined) {
      updated.is_active = draft.active;
      patch.is_active = draft.active;
    }

    setSaving(true);
    try {
      await api.patch(`/admin/products/${product.id}`, patch);
      onSaved(updated);
      setChanges({});
      toast.success("Ürün güncellendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ürün kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  const field = { form: formId, disabled: saving };
  return (
    <>
      <td className={cellClass}><input {...field} aria-label="Perakende fiyatı" required inputMode="decimal" pattern={moneyPattern}
        className={`${inputClass} w-24 text-right`} value={draft.retail} onChange={(e) => edit("retail", e.target.value)} /></td>
      <td className={cellClass}><input {...field} aria-label="İndirimli fiyat" inputMode="decimal" pattern={moneyPattern} placeholder="—"
        className={`${inputClass} w-24 text-right`} value={draft.discount} onChange={(e) => edit("discount", e.target.value)} /></td>
      <td className={`${cellClass} text-right`}>%{product.tax_rate}</td>
      <td className={cellClass}><input {...field} aria-label="Miat" type="date" min="1000-01-01" max="9999-12-31"
        className={inputClass} value={draft.expiry} onChange={(e) => edit("expiry", e.target.value)} /></td>
      <td className={cellClass}><input {...field} aria-label="Stok" type="number" required min="0" max="2147483647" step="1"
        className={`${inputClass} w-20 text-right ${Number(draft.stock) <= product.low_stock_threshold ? "text-amber-700" : ""}`}
        value={draft.stock} onChange={(e) => edit("stock", e.target.value)} /></td>
      <td className={cellClass}>
        <select {...field} aria-label="Durum" className={`${inputClass} ${draft.active ? "text-green-700" : "text-text-secondary"}`}
          value={draft.active ? "active" : "inactive"} onChange={(e) => edit("active", e.target.value === "active")}>
          <option value="active">Aktif</option><option value="inactive">Pasif</option>
        </select>
        {product.is_featured && <span className="block text-xs text-primary">Öne çıkan</span>}
        {product.is_campaign && <span className="block text-xs text-amber-700">Kampanyalı</span>}
      </td>
      <td className={`${cellClass} text-right`}>
        <div className="inline-flex items-center gap-1">
          <form id={formId} onSubmit={save}>
            <button className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-white disabled:bg-gray-100 disabled:text-text-secondary"
              disabled={!dirty || saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </form>
          <ProductQuickActions product={product} onDelete={onDelete} onSaved={onRefresh} />
        </div>
      </td>
    </>
  );
}
