"use client";

import { useEffect, useState, useCallback } from "react";
import { saveProduct, type Changes } from "./productEdits";
import { toast } from "sonner";
import Link from "next/link";
import ProductRowEditor from "./ProductRowEditor";
import AdminShell from "@/components/admin/AdminShell";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import type { Product, Pagination as PaginationType } from "@/types";

type StatusFilter = "all" | "active" | "inactive";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  type Draft = { product: Product; changes: Changes; error?: string };
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const pending = Object.values(drafts);

  function edit(product: Product, changes: Changes) {
    setDrafts(current => {
      const next = { ...current };
      if (Object.keys(changes).length) next[product.id] = { product, changes };
      else delete next[product.id];
      return next;
    });
  }

  async function save(entries: Draft[]) {
    if (savingIds.length || !entries.length) return;
    setSavingIds(entries.map(entry => entry.product.id));
    let saved = 0;
    let refresh = false;
    try {
      for (const {product, changes} of entries) {
        try {
          const fields = await saveProduct(product, changes);
          setProducts(rows => rows.map(row => row.id === product.id ? {...row, ...fields} : row));
          edit(product, {});
          saved++;
          if (fields.is_active !== undefined && statusFilter !== "all") refresh = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Ürün kaydedilemedi";
          setDrafts(current => ({ ...current, [product.id]: { product, changes, error: message } }));
        }
      }
      if (saved < entries.length) toast.error(`${saved} ürün kaydedildi. ${entries.length - saved} ürün kaydedilemedi.`);
      else toast.success(`${saved} ürün kaydedildi.`);
      if (refresh) await fetchProducts(1);
    } finally {
      setSavingIds([]);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = useCallback(
    async (page: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), per_page: "20" });
        if (searchDebounced) params.set("search", searchDebounced);
        if (statusFilter !== "all") {
          params.set("is_active", statusFilter === "active" ? "true" : "false");
        }
        const res = await api.getList<Product[]>(`/admin/products?${params}`);
        setProducts(res.data ?? []);
        setPagination(res.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ürünler yüklenemedi");
      } finally {
        setLoading(false);
      }
    },
    [searchDebounced, statusFilter]
  );

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  async function handleDelete(p: Product) {
    if (!confirm(`"${p.name}" ürününü silmek istediğinizden emin misiniz?`)) return;
    try {
      await api.delete(`/admin/products/${p.id}`);
      edit(p, {});
      fetchProducts(pagination.page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız");
    }
  }

  const visibleProducts = onlyLowStock
    ? products.filter((p) => p.stock <= p.low_stock_threshold)
    : products;

  return (
    <AdminShell title="Ürünler">
      {/* Toolbar */}
      <div className="bg-card-bg rounded-2xl border border-border p-4 mb-5 flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Ürün adı, SKU veya barkod ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 rounded-lg bg-bg-primary/60 p-1 shrink-0">
          {[
            { v: "all" as const, label: "Tümü" },
            { v: "active" as const, label: "Aktif" },
            { v: "inactive" as const, label: "Pasif" },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setStatusFilter(opt.v)}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                statusFilter === opt.v
                  ? "bg-white text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Low stock toggle */}
        <label className="flex items-center gap-2 text-xs text-text-secondary shrink-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          Sadece düşük stok
        </label>

        <button type="button" disabled={!pending.length || !!savingIds.length}
          onClick={() => save(pending)}
          className="h-10 shrink-0 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-gray-100 disabled:text-text-secondary">
          {savingIds.length ? "Kaydediliyor…" : `Toplu kaydet${pending.length ? ` (${pending.length})` : ""}`}
        </button>
        {/* Add */}
        <Link
          href="/yonetim/urunler/ekle"
          className="h-10 px-4 inline-flex items-center gap-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Ürün
        </Link>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-xs text-text-secondary mb-3 px-1">
        <span>
          Toplam <span className="font-medium text-text-primary">{pagination.total}</span> ürün
          {onlyLowStock && visibleProducts.length !== products.length && (
            <>
              {" • "}
              <span className="font-medium text-red-600">{visibleProducts.length}</span> düşük stok
            </>
          )}
        </span>
        {searchDebounced && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-primary hover:underline"
          >
            Aramayı temizle
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-4">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : visibleProducts.length === 0 ? (
        <EmptyState search={searchDebounced} onReset={() => setSearch("")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-3 font-medium min-w-60">Ürün</th>
                <th className="px-4 py-3 font-medium">Marka</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Perakende fiyatı</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">İndirimli fiyat</th>
                <th className="px-4 py-3 font-medium text-right">KDV</th>
                <th className="px-4 py-3 font-medium">Miat</th>
                <th className="px-4 py-3 font-medium text-right">Stok</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleProducts.map((p) => {
                const img = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
                return (
                  <tr key={p.id} className="hover:bg-primary-soft/20 transition-colors">
                    {/* Ürün */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Link
                          href={`/yonetim/urunler/${p.id}`}
                          className="w-12 h-12 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary"
                        >
                          {img ? (
                            <img
                              src={img.image_url}
                              alt={p.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21z" />
                            </svg>
                          )}
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={`/yonetim/urunler/${p.id}`}
                            className="block text-sm font-medium text-text-primary hover:text-primary line-clamp-2"
                          >
                            {p.name}
                          </Link>
                        </div>
                      </div>
                    </td>

                    {/* Marka */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.brand?.name ? (
                        <span className="text-sm text-text-primary">{p.brand.name}</span>
                      ) : (
                        <span className="text-xs italic text-text-secondary opacity-60">—</span>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs whitespace-nowrap">
                      {p.sku}
                    </td>

                    <ProductRowEditor product={p} onDelete={() => handleDelete(p)}
                      onRefresh={(statusChanged) => fetchProducts(
                        statusChanged && statusFilter !== "all" && products.length === 1
                          ? Math.max(1, pagination.page - 1) : pagination.page
                      )}
                      changes={drafts[p.id]?.changes ?? {}}
                      error={drafts[p.id]?.error}
                      saving={savingIds.includes(p.id)}
                      locked={savingIds.length > 0}
                      onEdit={changes => edit(p, changes)}
                      onSave={() => { if (drafts[p.id]) void save([drafts[p.id]]); }}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="mt-6">
          <Pagination pagination={pagination} onPageChange={(p) => fetchProducts(p)} />
        </div>
      )}
    </AdminShell>
  );
}

function EmptyState({ search, onReset }: { search: string; onReset: () => void }) {
  return (
    <div className="bg-card-bg rounded-2xl border border-border py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-bg-primary mx-auto mb-4 flex items-center justify-center text-text-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <h3 className="font-display text-lg text-text-primary mb-1">
        {search ? "Eşleşen ürün yok" : "Henüz ürün eklenmemiş"}
      </h3>
      <p className="text-sm text-text-secondary mb-4">
        {search
          ? `"${search}" için sonuç bulunamadı. Farklı bir arama dene.`
          : "İlk ürününü ekleyerek başla."}
      </p>
      {search ? (
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-primary hover:underline"
        >
          Aramayı temizle
        </button>
      ) : (
        <Link
          href="/yonetim/urunler/ekle"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Ürün Ekle
        </Link>
      )}
    </div>
  );
}
