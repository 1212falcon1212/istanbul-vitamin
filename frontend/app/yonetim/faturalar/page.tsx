"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatDateShort, formatPrice } from "@/lib/utils";
import type { Order, Pagination } from "@/types";

type Tab = "pending" | "issued";

const TABS: { id: Tab; label: string; hint: string }[] = [
  {
    id: "pending",
    label: "Fatura Bekleyen",
    hint: "Tamamlandı olup henüz Bizimhesap faturası kesilmemiş siparişler.",
  },
  {
    id: "issued",
    label: "Kesilmiş Faturalar",
    hint: "Bizimhesap'ta faturası oluşturulmuş siparişler.",
  },
];

export default function InvoicesPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowMsg, setRowMsg] = useState<{ id: number; kind: "success" | "error"; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "20",
        status: "delivered",
        invoiced: tab === "issued" ? "true" : "false",
      });
      const res = await api.getList<Order[]>(`/admin/orders?${params}`);
      setOrders(res.data ?? []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Faturalar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Tab değişince sayfayı sıfırla
  useEffect(() => {
    setPage(1);
    setRowMsg(null);
  }, [tab]);

  async function handleIssue(order: Order) {
    setBusyId(order.id);
    setRowMsg(null);
    try {
      await api.post(`/admin/orders/${order.id}/invoice/regenerate`, {});
      setRowMsg({ id: order.id, kind: "success", text: "Fatura kesildi." });
      // Listeyi yenile — bekleyen listesinden çıkmalı
      fetchOrders();
    } catch (err) {
      setRowMsg({
        id: order.id,
        kind: "error",
        text: err instanceof Error ? err.message : "Fatura kesilemedi.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const currentTab = TABS.find((t) => t.id === tab)!;

  return (
    <AdminShell title="Faturalar">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-text-secondary mb-5">{currentTab.hint}</p>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 mb-4">
          <p>{error}</p>
          <button onClick={fetchOrders} className="mt-2 text-sm underline">
            Tekrar Dene
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="bg-card-bg border border-border rounded-2xl text-center py-12 text-text-secondary">
          {tab === "pending"
            ? "Fatura bekleyen sipariş bulunmuyor."
            : "Henüz kesilmiş fatura yok."}
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Sipariş No</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium text-right">Tutar</th>
                {tab === "issued" ? (
                  <>
                    <th className="px-4 py-3 font-medium">Fatura No</th>
                    <th className="px-4 py-3 font-medium text-right">Fatura</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-medium">Son Hata</th>
                    <th className="px-4 py-3 font-medium text-right">Aksiyon</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const msg = rowMsg?.id === o.id ? rowMsg : null;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-border last:border-0 hover:bg-primary-soft/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/yonetim/siparisler/${o.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {o.shipping_first_name} {o.shipping_last_name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDateShort(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary font-medium">
                      {formatPrice(o.total)}
                    </td>
                    {tab === "issued" ? (
                      <>
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {o.invoice_number || o.order_number}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {o.invoice_url ? (
                            <a
                              href={o.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                            >
                              Görüntüle →
                            </a>
                          ) : (
                            <span className="text-text-secondary text-xs">-</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-xs text-text-secondary max-w-xs truncate">
                          {o.last_invoice_error || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {msg && (
                              <span
                                className={`text-[11px] ${
                                  msg.kind === "success"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {msg.text}
                              </span>
                            )}
                            <button
                              onClick={() => handleIssue(o)}
                              disabled={busyId === o.id}
                              className="h-8 px-3 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                              {busyId === o.id ? "Kesiliyor..." : "Fatura Kes"}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
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
            Önceki
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
