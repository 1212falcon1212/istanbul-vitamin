"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";

interface ReportStats {
  revenue: number;
  order_count: number;
  avg_order_value: number;
}

interface TopProduct {
  id: number;
  name: string;
  sold_count: number;
  revenue: number;
}

interface RevenueBySource {
  source: string;
  revenue: number;
  order_count: number;
}

interface ReportData {
  stats: ReportStats;
  top_products: TopProduct[];
  revenue_by_source: RevenueBySource[];
}

const sourceLabels: Record<string, string> = {
  web: "Web Sitesi",
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
};

export default function ReportsPage() {
  const router = useRouter();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [dateFrom, setDateFrom] = useState(
    thirtyDaysAgo.toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<ReportData>(
        `/admin/reports?from=${dateFrom}&to=${dateTo}`
      );
      setData(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rapor yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const inputCls =
    "px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminShell title="Raporlar">
      {/* Date Range */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Baslangic Tarihi
          </label>
          <input
            type="date"
            className={inputCls}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Bitis Tarihi
          </label>
          <input
            type="date"
            className={inputCls}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button
          onClick={fetchReport}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Filtrele
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 mb-4">
          <p>{error}</p>
          <button onClick={fetchReport} className="mt-2 text-sm underline">
            Tekrar Dene
          </button>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="text-center py-12 text-text-secondary">
          Rapor verisi bulunamadi.
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card-bg rounded-xl border border-border p-5">
              <p className="text-text-secondary text-sm">Donem Geliri</p>
              <p className="font-display text-2xl text-text-primary mt-1">
                {formatPrice(data.stats.revenue)}
              </p>
            </div>
            <div className="bg-card-bg rounded-xl border border-border p-5">
              <p className="text-text-secondary text-sm">Siparis Sayisi</p>
              <p className="font-display text-2xl text-text-primary mt-1">
                {data.stats.order_count}
              </p>
            </div>
            <div className="bg-card-bg rounded-xl border border-border p-5">
              <p className="text-text-secondary text-sm">Ort. Siparis Degeri</p>
              <p className="font-display text-2xl text-text-primary mt-1">
                {formatPrice(data.stats.avg_order_value)}
              </p>
            </div>
          </div>

          {/* Revenue by Source */}
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <h2 className="font-display text-lg text-text-primary mb-4">
              Kaynaga Gore Gelir
            </h2>
            {data.revenue_by_source.length === 0 ? (
              <p className="text-sm text-text-secondary">Veri bulunamadi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-4 py-2 font-medium">Kaynak</th>
                      <th className="px-4 py-2 font-medium text-right">Gelir</th>
                      <th className="px-4 py-2 font-medium text-right">Siparis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenue_by_source.map((item) => (
                      <tr
                        key={item.source}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-2 text-text-primary font-medium">
                          {sourceLabels[item.source] ?? item.source}
                        </td>
                        <td className="px-4 py-2 text-right text-text-primary">
                          {formatPrice(item.revenue)}
                        </td>
                        <td className="px-4 py-2 text-right text-text-secondary">
                          {item.order_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <h2 className="font-display text-lg text-text-primary mb-4">
              En Cok Satan Urunler
            </h2>
            {data.top_products.length === 0 ? (
              <p className="text-sm text-text-secondary">Veri bulunamadi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-4 py-2 font-medium">Urun</th>
                      <th className="px-4 py-2 font-medium text-right">
                        Satis Adedi
                      </th>
                      <th className="px-4 py-2 font-medium text-right">Gelir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-2 text-text-primary font-medium">
                          {product.name}
                        </td>
                        <td className="px-4 py-2 text-right text-text-secondary">
                          {product.sold_count}
                        </td>
                        <td className="px-4 py-2 text-right text-text-primary">
                          {formatPrice(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
