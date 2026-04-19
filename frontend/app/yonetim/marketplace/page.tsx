"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { SyncLog } from "@/types";

const marketplaces = [
  {
    id: "trendyol",
    name: "Trendyol",
    href: "/yonetim/marketplace/trendyol",
    color: "bg-orange-50 text-orange-600 border-orange-200",
  },
  {
    id: "hepsiburada",
    name: "Hepsiburada",
    href: "/yonetim/marketplace/hepsiburada",
    color: "bg-red-50 text-red-600 border-red-200",
  },
];

const syncTypeLabels: Record<string, string> = {
  product_push: "Urun Senkronizasyonu",
  stock_update: "Stok Guncelleme",
  price_update: "Fiyat Guncelleme",
  order_fetch: "Siparis Cekme",
};

const syncStatusLabels: Record<string, string> = {
  success: "Basarili",
  failed: "Basarisiz",
  partial: "Kismi",
};

const syncStatusColors: Record<string, string> = {
  success: "bg-green-50 text-green-600",
  failed: "bg-red-50 text-red-600",
  partial: "bg-yellow-50 text-yellow-600",
};

export default function MarketplacePage() {
  const router = useRouter();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<SyncLog[]>("/admin/marketplace/sync-logs");
      setLogs(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loglar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function getLastSync(marketplace: string): SyncLog | undefined {
    return logs.find((l) => l.marketplace === marketplace);
  }

  return (
    <AdminShell title="Marketplace">
      {/* Marketplace Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {marketplaces.map((mp) => {
          const lastSync = getLastSync(mp.id);
          return (
            <div
              key={mp.id}
              className="bg-card-bg rounded-xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-text-primary">
                  {mp.name}
                </h2>
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", mp.color)}>
                  {lastSync ? syncStatusLabels[lastSync.status] : "Bilinmiyor"}
                </span>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Son senkronizasyon:{" "}
                {lastSync ? formatDate(lastSync.started_at) : "Henuz yapilmadi"}
              </p>
              <div className="flex gap-2">
                <Link
                  href={mp.href}
                  className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  Yonet
                </Link>
                <button
                  onClick={async () => {
                    try {
                      await api.post(`/admin/marketplace/${mp.id}/sync`);
                      fetchLogs();
                    } catch {
                      setError("Senkronizasyon baslatilamadi");
                    }
                  }}
                  className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary-soft transition-colors"
                >
                  Senkronize Et
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Sync Logs */}
      <h2 className="font-display text-lg text-text-primary mb-4">
        Son Senkronizasyon Loglari
      </h2>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 mb-4">
          <p>{error}</p>
          <button onClick={fetchLogs} className="mt-2 text-sm underline">Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          Senkronizasyon logu bulunamadi.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Marketplace</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Toplam</th>
                <th className="px-4 py-3 font-medium">Basarili</th>
                <th className="px-4 py-3 font-medium">Hatali</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                  <td className="px-4 py-3 text-text-primary font-medium capitalize">{log.marketplace}</td>
                  <td className="px-4 py-3 text-text-secondary">{syncTypeLabels[log.sync_type] ?? log.sync_type}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", syncStatusColors[log.status])}>
                      {syncStatusLabels[log.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{log.total_items}</td>
                  <td className="px-4 py-3 text-green-600">{log.success_count}</td>
                  <td className="px-4 py-3 text-red-500">{log.error_count}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(log.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
