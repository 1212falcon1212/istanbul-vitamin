"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatDate, formatPrice, formatPhone, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import type { User, Address, Order } from "@/types";

interface CustomerDetail extends User {
  addresses?: Address[];
  orders?: Order[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const role = localStorage.getItem("auth_role");
    if (!token || !["super_admin", "admin", "editor"].includes(role || "")) {
      router.push("/yonetim/giris");
    }
  }, [router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get<CustomerDetail>(
          `/admin/customers/${params.id}`
        );
        if (res.data) setCustomer(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Musteri yuklenemedi");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  return (
    <AdminShell title="Musteri Detayi">
      <Link
        href="/yonetim/musteriler"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        &larr; Musterilere Don
      </Link>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && !customer && (
        <div className="text-center py-12 text-text-secondary">
          Musteri bulunamadi.
        </div>
      )}

      {customer && (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <h2 className="font-display text-lg text-text-primary mb-4">
              Musteri Bilgileri
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Ad Soyad:</span>
                <span className="ml-2 text-text-primary font-medium">
                  {customer.first_name} {customer.last_name}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">E-posta:</span>
                <span className="ml-2 text-text-primary">{customer.email}</span>
              </div>
              <div>
                <span className="text-text-secondary">Telefon:</span>
                <span className="ml-2 text-text-primary">
                  {formatPhone(customer.phone)}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Kayit Tarihi:</span>
                <span className="ml-2 text-text-primary">
                  {formatDate(customer.created_at)}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Durum:</span>
                <span
                  className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium ${customer.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
                >
                  {customer.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <h2 className="font-display text-lg text-text-primary mb-4">
              Adresler
            </h2>
            {(!customer.addresses || customer.addresses.length === 0) && (
              <p className="text-sm text-text-secondary">
                Kayitli adres bulunamadi.
              </p>
            )}
            {customer.addresses && customer.addresses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-lg border border-border p-4 text-sm"
                  >
                    <p className="font-medium text-text-primary mb-1">
                      {addr.title}
                      {addr.is_default && (
                        <span className="ml-2 text-xs bg-primary-soft text-primary px-2 py-0.5 rounded">
                          Varsayilan
                        </span>
                      )}
                    </p>
                    <p className="text-text-secondary">
                      {addr.first_name} {addr.last_name}
                    </p>
                    <p className="text-text-secondary">{addr.phone}</p>
                    <p className="text-text-secondary">
                      {addr.address_line}, {addr.district}, {addr.city}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="bg-card-bg rounded-xl border border-border p-6">
            <h2 className="font-display text-lg text-text-primary mb-4">
              Siparisler
            </h2>
            {(!customer.orders || customer.orders.length === 0) && (
              <p className="text-sm text-text-secondary">
                Siparis bulunamadi.
              </p>
            )}
            {customer.orders && customer.orders.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-4 py-2 font-medium">Siparis No</th>
                      <th className="px-4 py-2 font-medium">Tarih</th>
                      <th className="px-4 py-2 font-medium">Durum</th>
                      <th className="px-4 py-2 font-medium text-right">
                        Tutar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border last:border-0 hover:bg-primary-soft/30 cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/yonetim/siparisler/${order.id}`)
                        }
                      >
                        <td className="px-4 py-2 text-text-primary font-medium">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-2 text-text-secondary">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getOrderStatusColor(order.status)}`}
                          >
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-text-primary font-medium">
                          {formatPrice(order.total)}
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
