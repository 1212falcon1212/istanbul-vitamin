"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { User, Pagination } from "@/types";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<
    (User & { order_count?: number })[]
  >([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (search) params.set("search", search);
      const res = await api.getList<(User & { order_count?: number })[]>(
        `/admin/customers?${params}`
      );
      setCustomers(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Musteriler yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <AdminShell title="Musteriler">
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Ad, soyad veya e-posta ile ara..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-md px-4 py-2 rounded-lg border border-border bg-card-bg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 mb-4">
          <p>{error}</p>
          <button
            onClick={fetchCustomers}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && customers.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          Musteri bulunamadi.
        </div>
      )}

      {/* Table */}
      {!loading && !error && customers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Kayit Tarihi</th>
                <th className="px-4 py-3 font-medium text-right">
                  Siparis Sayisi
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/yonetim/musteriler/${c.id}`)}
                  className="border-b border-border last:border-0 hover:bg-primary-soft/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-text-primary font-medium">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{c.email}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.phone}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">
                    {c.order_count ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-primary-soft transition-colors"
          >
            Onceki
          </button>
          <span className="text-sm text-text-secondary">
            {page} / {pagination.total_pages}
          </span>
          <button
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-primary-soft transition-colors"
          >
            Sonraki
          </button>
        </div>
      )}
    </AdminShell>
  );
}
