"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import DataTable, { type Column } from "@/components/admin/DataTable";
import Pagination from "@/components/ui/Pagination";
import { api } from "@/lib/api";
import { formatPrice, formatDateShort, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import type { Order, OrderStatus, OrderSource, Pagination as PaginationType } from "@/types";

const statusOptions: { value: string; label: string }[] = [
  { value: "", label: "Tüm Durumlar" },
  { value: "pending", label: "Sipariş Oluşturuldu" },
  { value: "shipped", label: "Kargolandı" },
  { value: "delivered", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal Edildi" },
  { value: "refunded", label: "İade Edildi" },
];

const sourceOptions: { value: string; label: string }[] = [
  { value: "", label: "Tum Kaynaklar" },
  { value: "web", label: "Web" },
  { value: "trendyol", label: "Trendyol" },
  { value: "hepsiburada", label: "Hepsiburada" },
];

function getSourceBadge(source: OrderSource) {
  const styles: Record<OrderSource, string> = {
    web: "bg-blue-50 text-blue-700",
    trendyol: "bg-orange-50 text-orange-700",
    hepsiburada: "bg-red-50 text-red-700",
  };
  const labels: Record<OrderSource, string> = {
    web: "Web",
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[source]}`}>
      {labels[source]}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const fetchOrders = useCallback(async (page: number) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      const res = await api.getList<Order[]>(`/admin/orders?${params}`);
      setOrders(res.data ?? []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Siparisler yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const columns: Column<Order>[] = [
    {
      key: "order_number",
      label: "Siparis No",
      render: (o) => (
        <Link href={`/yonetim/siparisler/${o.id}`} className="font-medium text-primary hover:underline">
          #{o.order_number}
        </Link>
      ),
    },
    {
      key: "customer",
      label: "Musteri",
      render: (o) => (
        <span className="text-text-primary">{o.shipping_first_name} {o.shipping_last_name}</span>
      ),
    },
    {
      key: "created_at",
      label: "Tarih",
      render: (o) => <span className="text-text-secondary">{formatDateShort(o.created_at)}</span>,
    },
    {
      key: "status",
      label: "Durum",
      render: (o) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getOrderStatusColor(o.status)}`}>
          {getOrderStatusLabel(o.status)}
        </span>
      ),
    },
    {
      key: "source",
      label: "Kaynak",
      render: (o) => getSourceBadge(o.source),
    },
    {
      key: "total",
      label: "Toplam",
      render: (o) => <span className="price font-medium">{formatPrice(o.total)}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (o) => (
        <Link href={`/yonetim/siparisler/${o.id}`} className="text-primary hover:underline text-xs">
          Detay
        </Link>
      ),
    },
  ];

  return (
    <AdminShell title="Siparisler">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-text-secondary">Toplam {pagination.total} siparis</p>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      ) : (
        <>
          <DataTable columns={columns} data={orders} loading={loading} emptyMessage="Siparis bulunamadi." />
          {pagination.total_pages > 1 && (
            <div className="mt-6">
              <Pagination pagination={pagination} onPageChange={(p) => fetchOrders(p)} />
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
