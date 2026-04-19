"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import ProductGrid from "@/components/product/ProductGrid";
import PaginationComponent from "@/components/ui/Pagination";
import type { Favorite, Product, Pagination } from "@/types";

export default function FavorilerimPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getList<Favorite[]>(
        `/favorites?page=${page}&per_page=20`
      );
      const favs = Array.isArray(res.data) ? res.data : [];
      setFavorites(favs);
      setPagination(res.pagination);
      setFavoriteIds(new Set(favs.map((f) => f.product_id)));
    } catch {
      setError("Favoriler yuklenirken bir hata olustu.");
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  async function handleToggleFavorite(product: Product) {
    try {
      await api.delete(`/favorites/${product.id}`);
      setFavorites((prev) => prev.filter((f) => f.product_id !== product.id));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    } catch {
      // Silently fail, user can retry
    }
  }

  const products: Product[] = favorites
    .filter((f) => f.product)
    .map((f) => f.product as Product);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl text-text-primary">Favorilerim</h1>
        <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm">
          <p>{error}</p>
          <button
            onClick={fetchFavorites}
            className="mt-2 text-sm font-medium underline hover:no-underline"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-text-primary">Favorilerim</h1>
        {pagination.total > 0 && (
          <span className="text-sm text-text-secondary">
            {pagination.total} urun
          </span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="bg-card-bg rounded-2xl border border-border p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-16 h-16 mx-auto text-border mb-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <p className="text-text-secondary text-lg">
            Favori urununuz bulunmuyor.
          </p>
          <Link
            href="/magaza"
            className="mt-4 inline-block px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Alisverise Basla
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid
            products={products}
            onToggleFavorite={handleToggleFavorite}
            favoriteIds={favoriteIds}
          />

          {pagination.total_pages > 1 && (
            <div className="mt-6">
              <PaginationComponent
                pagination={pagination}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
