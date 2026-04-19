"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
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
                <th className="px-4 py-3 font-medium w-[38%]">Ürün</th>
                <th className="px-4 py-3 font-medium">Marka</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right">Fiyat</th>
                <th className="px-4 py-3 font-medium text-right">Stok</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleProducts.map((p) => {
                const img = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
                const isLow = p.stock <= p.low_stock_threshold;
                const outOfStock = p.stock === 0;
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

                    {/* Fiyat */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="font-medium text-text-primary price">
                        {formatPrice(p.price)}
                      </div>
                      {p.compare_price && p.compare_price > p.price && (
                        <div className="text-[11px] text-text-secondary line-through price">
                          {formatPrice(p.compare_price)}
                        </div>
                      )}
                    </td>

                    {/* Stok */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          outOfStock
                            ? "bg-red-50 text-red-600"
                            : isLow
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-50 text-green-700"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            p.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.is_active ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          {p.is_active ? "Aktif" : "Pasif"}
                        </span>
                        {p.is_featured && (
                          <span className="inline-flex items-center rounded-full bg-primary-soft text-primary px-2 py-0.5 text-[11px] font-medium">
                            Öne Çıkan
                          </span>
                        )}
                        {p.is_campaign && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium">
                            Kampanyalı
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Aksiyonlar */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`/urun/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-primary-soft/40 transition-colors"
                          title="Mağazada Görüntüle"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </a>
                        <Link
                          href={`/yonetim/urunler/${p.id}`}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-primary-soft/40 transition-colors"
                          title="Düzenle"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
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
