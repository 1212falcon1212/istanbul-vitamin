"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import {
  formatPrice,
  formatDateShort,
  getOrderStatusLabel,
  getOrderStatusColor,
} from "@/lib/utils";
import type { Order, Product } from "@/types";

interface DashboardStats {
  today_revenue: number;
  month_revenue: number;
  total_orders: number;
  pending_orders: number;
  total_products: number;
  total_customers: number;
}

interface SalesPoint {
  date: string;
  revenue: number;
  count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [statsRes, chartRes, ordersRes, lowStockRes] = await Promise.all([
          api.get<DashboardStats | { stats: DashboardStats }>("/admin/dashboard/stats"),
          api.get<SalesPoint[] | { chart: SalesPoint[] }>("/admin/dashboard/chart"),
          api.get<Order[] | { orders: Order[] }>("/admin/orders?per_page=6&sort=-created_at"),
          api.get<Product[] | { products: Product[] }>("/admin/products?low_stock=true&per_page=5"),
        ]);

        const statsRaw = statsRes.data as DashboardStats | { stats?: DashboardStats } | undefined;
        const statsData =
          statsRaw && "stats" in statsRaw ? statsRaw.stats : (statsRaw as DashboardStats | undefined);
        setStats(statsData ?? null);

        const chartRaw = chartRes.data;
        const chartList = Array.isArray(chartRaw)
          ? chartRaw
          : (chartRaw as { chart?: SalesPoint[] } | undefined)?.chart ?? [];
        setSales(chartList);

        const ordersRaw = ordersRes.data;
        setRecentOrders(
          Array.isArray(ordersRaw) ? ordersRaw : ordersRaw?.orders ?? []
        );

        const lowStockRaw = lowStockRes.data;
        setLowStockProducts(
          Array.isArray(lowStockRaw) ? lowStockRaw : lowStockRaw?.products ?? []
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Veriler yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const totalChartRevenue = useMemo(
    () => sales.reduce((sum, p) => sum + Number(p.revenue || 0), 0),
    [sales]
  );
  const totalChartOrders = useMemo(
    () => sales.reduce((sum, p) => sum + Number(p.count || 0), 0),
    [sales]
  );

  if (loading) {
    return (
      <AdminShell title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title="Dashboard">
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      </AdminShell>
    );
  }

  const greeting = greetByHour();

  return (
    <AdminShell title="Dashboard">
      {/* Welcome */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1 className="font-display text-3xl text-text-primary">
            {greeting}, İşte bugünkü durum
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/yonetim/urunler/ekle"
            className="h-10 px-4 inline-flex items-center gap-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Ürün
          </Link>
          <Link
            href="/yonetim/siparisler"
            className="h-10 px-4 inline-flex items-center gap-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:border-primary hover:text-primary transition-colors"
          >
            Siparişler
          </Link>
        </div>
      </div>

      {/* Stat cards — 4 + 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          tone="primary"
          label="Bugünkü Ciro"
          value={formatPrice(stats?.today_revenue ?? 0)}
          hint={`${stats?.pending_orders ?? 0} bekleyen sipariş`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4" />
            </svg>
          }
        />
        <StatCard
          tone="indigo"
          label="Bu Ay Ciro"
          value={formatPrice(stats?.month_revenue ?? 0)}
          hint={`son 30 gün: ${formatPrice(totalChartRevenue)}`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
        <StatCard
          tone="emerald"
          label="Toplam Sipariş"
          value={formatNumber(stats?.total_orders ?? 0)}
          hint={`son 30 gün: ${totalChartOrders} adet`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          }
        />
        <StatCard
          tone="amber"
          label="Aktif Ürün"
          value={formatNumber(stats?.total_products ?? 0)}
          hint={`${lowStockProducts.length} düşük stokta`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-card-bg rounded-2xl border border-border p-5 lg:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-base text-text-primary">Son 30 Gün Satışlar</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Günlük ciro ve sipariş grafiği
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg text-text-primary">
                {formatPrice(totalChartRevenue)}
              </p>
              <p className="text-xs text-text-secondary">{totalChartOrders} sipariş</p>
            </div>
          </div>
          <SalesChart points={sales} />
        </div>

        {/* Müşteriler kart */}
        <div className="bg-card-bg rounded-2xl border border-border p-5 lg:p-6 flex flex-col">
          <h2 className="font-display text-base text-text-primary mb-1">Müşteri Tabanı</h2>
          <p className="text-xs text-text-secondary mb-5">Sisteme kayıtlı toplam üye</p>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="font-display text-4xl text-text-primary">
              {formatNumber(stats?.total_customers ?? 0)}
            </p>
            <p className="text-sm text-text-secondary mt-1">kayıtlı müşteri</p>
          </div>
          <Link
            href="/yonetim/musteriler"
            className="mt-4 h-10 w-full inline-flex items-center justify-center text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            Müşterileri Görüntüle →
          </Link>
        </div>
      </div>

      {/* Alt grid: son siparişler + düşük stok */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Son siparişler */}
        <div className="lg:col-span-2 bg-card-bg rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-display text-base text-text-primary">Son Siparişler</h2>
              <p className="text-xs text-text-secondary mt-0.5">En son gelen 6 sipariş</p>
            </div>
            <Link
              href="/yonetim/siparisler"
              className="text-xs text-primary hover:underline"
            >
              Tümünü gör →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-text-secondary text-sm">
              Henüz sipariş yok.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-secondary">
                    <th className="px-5 lg:px-6 py-2.5 font-medium">Sipariş</th>
                    <th className="px-3 py-2.5 font-medium">Müşteri</th>
                    <th className="px-3 py-2.5 font-medium">Durum</th>
                    <th className="px-5 lg:px-6 py-2.5 font-medium text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-primary-soft/20 transition-colors"
                    >
                      <td className="px-5 lg:px-6 py-3">
                        <Link
                          href={`/yonetim/siparisler/${o.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          #{o.order_number}
                        </Link>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          {formatDateShort(o.created_at)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-text-primary whitespace-nowrap">
                        {o.shipping_first_name} {o.shipping_last_name}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getOrderStatusColor(o.status)}`}
                        >
                          {getOrderStatusLabel(o.status)}
                        </span>
                      </td>
                      <td className="px-5 lg:px-6 py-3 text-right font-medium price whitespace-nowrap">
                        {formatPrice(o.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Düşük stok */}
        <div className="bg-card-bg rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-display text-base text-text-primary">Düşük Stok</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Eşik altındaki ürünler
              </p>
            </div>
            {lowStockProducts.length > 0 && (
              <Link
                href="/yonetim/urunler"
                className="text-xs text-primary hover:underline"
              >
                Yönet →
              </Link>
            )}
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 mx-auto mb-3 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-text-primary font-medium">Her şey yolunda</p>
              <p className="text-xs text-text-secondary mt-1">Düşük stoklu ürün yok.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lowStockProducts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/yonetim/urunler/${p.id}`}
                    className="flex items-center gap-3 px-5 lg:px-6 py-3 hover:bg-red-50/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary">
                      {p.images?.[0]?.image_url ? (
                        <img
                          src={p.images[0].image_url}
                          alt={p.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold uppercase">
                          {p.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary font-medium truncate">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-text-secondary font-mono">{p.sku}</p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        p.stock === 0
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.stock} / {p.low_stock_threshold}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

/* --- Helpers --- */

function greetByHour(): string {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: "primary" | "indigo" | "emerald" | "amber";
}) {
  const toneMap: Record<typeof tone, string> = {
    primary: "bg-primary-soft text-primary",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-card-bg rounded-2xl border border-border p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="font-display text-2xl lg:text-[26px] text-text-primary truncate">
        {value}
      </p>
      {hint && <p className="text-[11px] text-text-secondary mt-1.5 truncate">{hint}</p>}
    </div>
  );
}

/* --- Inline SVG sales chart --- */

function SalesChart({ points }: { points: SalesPoint[] }) {
  const width = 700;
  const height = 200;
  const padding = { top: 20, right: 12, bottom: 28, left: 40 };

  if (points.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-text-secondary border border-dashed border-border rounded-xl">
        Veri yok — ilk siparişler geldiğinde grafik burada görünür.
      </div>
    );
  }

  const maxRev = Math.max(...points.map((p) => Number(p.revenue || 0)), 1);
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const xy = points.map((p, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + innerH - (Number(p.revenue || 0) / maxRev) * innerH;
    return { x, y, rev: Number(p.revenue || 0), count: Number(p.count || 0), date: p.date };
  });

  const linePath = xy
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    xy.length > 0
      ? `${linePath} L ${xy[xy.length - 1].x.toFixed(1)} ${(
          padding.top + innerH
        ).toFixed(1)} L ${xy[0].x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`
      : "";

  // Y axis tick values
  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = (maxRev / yTicks) * i;
    const y = padding.top + innerH - (val / maxRev) * innerH;
    return { val, y };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sales-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              strokeWidth={1}
              className="stroke-border"
              strokeDasharray="3 4"
            />
            <text
              x={padding.left - 6}
              y={t.y + 3}
              textAnchor="end"
              className="fill-text-secondary"
              fontSize="10"
            >
              {formatShortCurrency(t.val)}
            </text>
          </g>
        ))}

        {/* Area */}
        <path d={areaPath} fill="url(#sales-grad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-primary"
        />

        {/* Points */}
        {xy.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={3} className="fill-primary" />
            <title>
              {new Date(pt.date).toLocaleDateString("tr-TR")} — {formatPrice(pt.rev)} ({pt.count} sipariş)
            </title>
          </g>
        ))}

        {/* X axis labels — ilk, orta ve son */}
        {xy.length > 0 && (
          <>
            <XLabel pt={xy[0]} baseline={padding.top + innerH + 16} />
            {xy.length > 2 && <XLabel pt={xy[Math.floor(xy.length / 2)]} baseline={padding.top + innerH + 16} />}
            <XLabel pt={xy[xy.length - 1]} baseline={padding.top + innerH + 16} />
          </>
        )}
      </svg>
    </div>
  );
}

function XLabel({ pt, baseline }: { pt: { x: number; date: string }; baseline: number }) {
  const d = new Date(pt.date);
  const label = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  return (
    <text
      x={pt.x}
      y={baseline}
      textAnchor="middle"
      className="fill-text-secondary"
      fontSize="10"
    >
      {label}
    </text>
  );
}

function formatShortCurrency(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₺`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K ₺`;
  return `${Math.round(v)} ₺`;
}
