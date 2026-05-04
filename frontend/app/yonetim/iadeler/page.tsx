"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import type { OrderCancellation, Pagination } from "@/types";

const REASON_LABELS: Record<string, string> = {
  wrong_item: "Yanlış ürün",
  damaged: "Hasarlı / kusurlu",
  no_longer_needed: "Vazgeçti",
  size_color: "Beden / renk uyuşmazlığı",
  late_delivery: "Geç teslim",
  other: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Bekleniyor",
  approved: "Onaylandı",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
};

const STATUS_CLASSES: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export default function CancellationsAdminPage() {
  const [rows, setRows] = useState<OrderCancellation[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({
        page: String(page),
        per_page: "20",
        ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      const res = await api.getList<OrderCancellation[]>(
        `/admin/cancellations?${search.toString()}`
      );
      const data = (res.data as OrderCancellation[] | undefined) ?? [];
      setRows(data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talepler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  async function decide(id: number, kind: "approve" | "reject") {
    if (busy) return;
    let body: Record<string, string> | undefined;
    if (kind === "reject") {
      const reason = window.prompt("Reddetme nedeni:");
      if (!reason) return;
      body = { reason };
    } else if (!window.confirm("Talep onaylanacak — Aras ve PayTR akışları çalıştırılacak. Onaylıyor musunuz?")) {
      return;
    }
    setBusy(id);
    setMsg(null);
    try {
      await api.post(`/admin/cancellations/${id}/${kind}`, body);
      await fetchRows();
      setMsg({
        kind: "success",
        text: kind === "approve" ? "Talep onaylandı." : "Talep reddedildi.",
      });
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "İşlem başarısız",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="İade / İptal Talepleri">
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-border bg-white px-3 text-sm"
        >
          <option value="all">Bekleyen + Onaylı</option>
          <option value="requested">Bekleyen</option>
          <option value="approved">Onaylandı</option>
          <option value="completed">Tamamlandı</option>
          <option value="rejected">Reddedildi</option>
        </select>
        {pagination && (
          <span className="text-xs text-text-secondary">
            Toplam: {pagination.total}
          </span>
        )}
      </div>

      {msg && (
        <div
          className={cn(
            "mb-4 rounded-lg p-3 text-sm",
            msg.kind === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          Şu an bekleyen talep yok.
        </div>
      ) : (
        <div className="overflow-x-auto bg-card-bg rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-secondary border-b border-border">
                <th className="px-4 py-3 font-medium">Sipariş</th>
                <th className="px-3 py-3 font-medium">Tip</th>
                <th className="px-3 py-3 font-medium">Sebep</th>
                <th className="px-3 py-3 font-medium">Tutar</th>
                <th className="px-3 py-3 font-medium">Tarih</th>
                <th className="px-3 py-3 font-medium">Durum</th>
                <th className="px-3 py-3 font-medium">İade</th>
                <th className="px-4 py-3 font-medium text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    {row.order ? (
                      <Link
                        href={`/yonetim/siparisler/${row.order.id}`}
                        className="text-primary font-mono text-xs hover:underline"
                      >
                        #{row.order.order_number}
                      </Link>
                    ) : (
                      <span className="text-text-secondary text-xs">—</span>
                    )}
                    {row.order?.shipping_first_name && (
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        {row.order.shipping_first_name} {row.order.shipping_last_name}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      row.type === "cancel" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"
                    )}>
                      {row.type === "cancel" ? "İptal" : "İade"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-text-primary">
                    {REASON_LABELS[row.reason] ?? row.reason}
                    {row.note && (
                      <p className="text-[11px] text-text-secondary mt-0.5 italic line-clamp-2">
                        &ldquo;{row.note}&rdquo;
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap">
                    {row.refund_amount ? formatPrice(row.refund_amount) : "—"}
                  </td>
                  <td className="px-3 py-3 text-[11px] whitespace-nowrap text-text-secondary">
                    {formatDateShort(row.created_at)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_CLASSES[row.status] ?? "bg-gray-50 text-gray-700"
                    )}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px]">
                    {row.refund_status ? (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                        row.refund_status === "completed" && "bg-green-50 text-green-700",
                        row.refund_status === "failed" && "bg-red-50 text-red-700",
                        (row.refund_status === "pending" || row.refund_status === "processing") && "bg-amber-50 text-amber-700"
                      )}>
                        {row.refund_status === "completed" ? "Yapıldı" : row.refund_status === "failed" ? "Başarısız" : "Bekliyor"}
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                    {row.aras_return_tracking && (
                      <div className="text-[10px] text-text-secondary mt-0.5">
                        İade kargo: <span className="font-mono">{row.aras_return_tracking}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.status === "requested" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => decide(row.id, "approve")}
                          disabled={busy === row.id}
                          className="h-8 px-3 text-xs rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => decide(row.id, "reject")}
                          disabled={busy === row.id}
                          className="h-8 px-3 text-xs rounded-md border border-border text-text-secondary hover:text-red-600 hover:border-red-300 disabled:opacity-50"
                        >
                          Reddet
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 px-3 text-sm rounded-md border border-border disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm text-text-secondary">
            {pagination.page} / {pagination.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
            disabled={page === pagination.total_pages}
            className="h-8 px-3 text-sm rounded-md border border-border disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}
    </AdminShell>
  );
}
