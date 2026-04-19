"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getOrderStatusLabel,
  getOrderStatusColor,
  cn,
} from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import PaginationComponent from "@/components/ui/Pagination";
import type { Order, OrderStatus, Pagination } from "@/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tüm Durumlar" },
  { value: "pending", label: "Sipariş Oluşturuldu" },
  { value: "shipped", label: "Kargolandı" },
  { value: "delivered", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal Edildi" },
  { value: "refunded", label: "İade Edildi" },
];

export default function SiparislerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "10");
      params.set("sort", "created_at_desc");
      if (statusFilter) {
        params.set("status", statusFilter);
      }

      const res = await api.getList<Order[]>(`/orders?${params.toString()}`);
      setOrders(Array.isArray(res.data) ? res.data : []);
      setPagination(res.pagination);
    } catch {
      setError("Siparisler yuklenirken bir hata olustu.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleStatusChange(value: string) {
    setStatusFilter(value as OrderStatus | "");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-3xl text-text-primary">Siparislerim</h1>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm">
          <p>{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-2 text-sm font-medium underline hover:no-underline"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
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
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          <p className="text-text-secondary text-lg">
            Henuz siparisiniz bulunmuyor.
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
          {/* Desktop table */}
          <div className="hidden md:block bg-card-bg rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-primary-soft/30">
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-5 py-3">
                    Siparis No
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-5 py-3">
                    Tarih
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-5 py-3">
                    Durum
                  </th>
                  <th className="text-right text-xs font-medium text-text-secondary uppercase tracking-wider px-5 py-3">
                    Urun
                  </th>
                  <th className="text-right text-xs font-medium text-text-secondary uppercase tracking-wider px-5 py-3">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-primary-soft/20 transition-colors cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/hesabim/siparisler/${order.id}`)
                    }
                  >
                    <td className="px-5 py-4 text-sm font-medium text-primary">
                      #{order.order_number}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-full",
                          getOrderStatusColor(order.status)
                        )}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary text-right">
                      {order.items?.length ?? "-"} urun
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-text-primary text-right price">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/hesabim/siparisler/${order.id}`}
                className="block bg-card-bg rounded-2xl border border-border p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">
                    #{order.order_number}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full",
                      getOrderStatusColor(order.status)
                    )}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{formatDate(order.created_at)}</span>
                  <span>{order.items?.length ?? "-"} urun</span>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-sm font-bold text-text-primary price">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

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
