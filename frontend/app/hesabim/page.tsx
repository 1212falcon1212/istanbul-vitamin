"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getOrderStatusLabel, getOrderStatusColor, cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import type { Order, Favorite } from "@/types";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  favoriteCount: number;
}

const QUICK_LINKS = [
  {
    href: "/hesabim/siparisler",
    label: "Siparislerim",
    description: "Siparis gecmisinizi goruntuleyin",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    href: "/hesabim/adreslerim",
    label: "Adreslerim",
    description: "Adres bilgilerinizi yonetin",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    href: "/hesabim/kartlarim",
    label: "Kartlarim",
    description: "Kayitli kartlarinizi yonetin",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    href: "/hesabim/bilgilerim",
    label: "Bilgilerim",
    description: "Kisisel bilgilerinizi duzenleyin",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    href: "/hesabim/favorilerim",
    label: "Favorilerim",
    description: "Favori urunlerinizi goruntuleyin",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

export default function HesabimPage() {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    favoriteCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const [ordersRes, favoritesRes] = await Promise.all([
          api.getList<Order[]>("/orders?per_page=3&sort=created_at_desc"),
          api.get<Favorite[]>("/favorites"),
        ]);

        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const favorites = Array.isArray(favoritesRes.data) ? favoritesRes.data : [];

        setRecentOrders(orders);
        setStats({
          totalOrders: ordersRes.pagination?.total ?? orders.length,
          pendingOrders: orders.filter(
            (o) => o.status === "pending" || o.status === "shipped"
          ).length,
          favoriteCount: favorites.length,
        });
      } catch {
        setError("Veriler yuklenirken bir hata olustu.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm font-medium underline hover:no-underline"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-3xl text-text-primary">
          Hos geldiniz, {user?.first_name}!
        </h1>
        <p className="mt-1 text-text-secondary">
          Hesabinizi buradan yonetebilirsiniz.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card-bg rounded-2xl border border-border p-5">
          <p className="text-sm text-text-secondary">Toplam Siparis</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{stats.totalOrders}</p>
        </div>
        <div className="bg-card-bg rounded-2xl border border-border p-5">
          <p className="text-sm text-text-secondary">Bekleyen Siparis</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{stats.pendingOrders}</p>
        </div>
        <div className="bg-card-bg rounded-2xl border border-border p-5">
          <p className="text-sm text-text-secondary">Favori Urun</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{stats.favoriteCount}</p>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-card-bg rounded-2xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-xl text-text-primary">Son Siparisler</h2>
          <Link
            href="/hesabim/siparisler"
            className="text-sm text-primary font-medium hover:underline"
          >
            Tumunu Gor
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            <p>Henuz siparisiniz bulunmuyor.</p>
            <Link
              href="/magaza"
              className="mt-3 inline-block text-sm text-primary font-medium hover:underline"
            >
              Alisverise Basla
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/hesabim/siparisler/${order.id}`}
                className="flex items-center justify-between p-5 hover:bg-primary-soft/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    #{order.order_number}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full",
                      getOrderStatusColor(order.status)
                    )}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                  <span className="text-sm font-bold text-text-primary price">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-display text-xl text-text-primary mb-4">Hizli Erisim</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-card-bg rounded-2xl border border-border p-5 hover:border-primary hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                {link.icon}
              </div>
              <h3 className="mt-3 text-sm font-medium text-text-primary">
                {link.label}
              </h3>
              <p className="mt-1 text-xs text-text-secondary">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
