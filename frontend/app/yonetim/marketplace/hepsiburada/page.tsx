"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { SyncLog } from "@/types";

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

export default function HepsiburadaPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    api_key: "",
    api_secret: "",
    merchant_id: "",
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<SyncLog[]>(
        "/admin/marketplace/sync-logs?marketplace=hepsiburada"
      );
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

  async function triggerSync(type: string) {
    setSyncing(type);
    try {
      await api.post(`/admin/marketplace/hepsiburada/sync`, { type });
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senkronizasyon baslatilamadi");
    } finally {
      setSyncing(null);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminShell title="Hepsiburada">
      <Link
        href="/yonetim/marketplace"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        &larr; Marketplace'e Don
      </Link>

      {/* Connection Settings */}
      <div className="bg-card-bg rounded-xl border border-border p-6 mb-6 max-w-2xl">
        <h2 className="font-display text-lg text-text-primary mb-4">
          Baglanti Ayarlari
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">API Key</label>
            <input
              type="password"
              className={inputCls}
              value={settings.api_key}
              onChange={(e) => setSettings((s) => ({ ...s, api_key: e.target.value }))}
              placeholder="Hepsiburada API Key"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">API Secret</label>
            <input
              type="password"
              className={inputCls}
              value={settings.api_secret}
              onChange={(e) => setSettings((s) => ({ ...s, api_secret: e.target.value }))}
              placeholder="Hepsiburada API Secret"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Merchant ID</label>
            <input
              className={inputCls}
              value={settings.merchant_id}
              onChange={(e) => setSettings((s) => ({ ...s, merchant_id: e.target.value }))}
              placeholder="Hepsiburada Merchant ID"
            />
          </div>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
            Kaydet
          </button>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="bg-card-bg rounded-xl border border-border p-6 mb-6">
        <h2 className="font-display text-lg text-text-primary mb-4">
          Senkronizasyon Islemleri
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => triggerSync("product_push")}
            disabled={syncing !== null}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {syncing === "product_push" ? "Senkronize ediliyor..." : "Urun Senkronize Et"}
          </button>
          <button
            onClick={() => triggerSync("stock_update")}
            disabled={syncing !== null}
            className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary-soft transition-colors disabled:opacity-50"
          >
            {syncing === "stock_update" ? "Guncelleniyor..." : "Stok Senkronize Et"}
          </button>
          <button
            onClick={() => triggerSync("price_update")}
            disabled={syncing !== null}
            className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary-soft transition-colors disabled:opacity-50"
          >
            {syncing === "price_update" ? "Guncelleniyor..." : "Fiyat Senkronize Et"}
          </button>
        </div>
      </div>

      {/* Logs */}
      <h2 className="font-display text-lg text-text-primary mb-4">
        Senkronizasyon Loglari
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
          Hepsiburada senkronizasyon logu bulunamadi.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
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
                  <td className="px-4 py-3 text-text-primary">{syncTypeLabels[log.sync_type] ?? log.sync_type}</td>
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
