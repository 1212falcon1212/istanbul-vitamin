"use client";

import { useId } from "react";
import { values, type Changes } from "./productEdits";
import type { Product } from "@/types";
import ProductQuickActions from "./ProductQuickActions";

type Props = {
  product: Product;
  onDelete: () => void;
  onRefresh: (statusChanged: boolean) => void;
  changes: Changes;
  error?: string;
  saving: boolean;
  locked: boolean;
  onEdit: (changes: Changes) => void;
  onSave: () => void;
};

const inputClass = "h-8 rounded-md border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const cellClass = "px-3 py-2 whitespace-nowrap";
const moneyPattern = "[0-9]{1,8}([,.][0-9]{1,2})?";

export default function ProductRowEditor({ product, onDelete, onRefresh, changes, error, saving, locked, onEdit, onSave }: Props) {
  const formId = useId();
  const original = values(product);
  const draft = { ...original, ...changes };
  const dirty = Object.keys(changes).length > 0;

  function edit<K extends keyof typeof original>(key: K, value: typeof original[K]) {
    const next = { ...changes, [key]: value };
    if (value === original[key]) delete next[key];
    onEdit(next);
  }

  const field = { form: formId, disabled: locked };
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
          <form id={formId} onSubmit={(event) => { event.preventDefault(); onSave(); }}>
            <button className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-white disabled:bg-gray-100 disabled:text-text-secondary"
              disabled={!dirty || locked}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </form>
          {!locked && <ProductQuickActions product={product} onDelete={onDelete} onSaved={onRefresh} />}
        </div>
        {error && <p role="alert" className="max-w-52 whitespace-normal text-xs text-red-700">{error}</p>}
      </td>
    </>
  );
}
