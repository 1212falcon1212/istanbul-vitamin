"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatDate, formatPrice, cn } from "@/lib/utils";
import type { Coupon } from "@/types";

const emptyCoupon = {
  code: "",
  description: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: 0,
  min_order_amount: 0,
  max_discount_amount: 0,
  usage_limit: 0,
  per_user_limit: 1,
  starts_at: "",
  expires_at: "",
  is_active: true,
};

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCoupon);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Coupon[]>("/admin/coupons");
      setCoupons(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuponlar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyCoupon);
    setShowForm(true);
  }

  function openEdit(c: Coupon) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order_amount: c.min_order_amount,
      max_discount_amount: c.max_discount_amount ?? 0,
      usage_limit: c.usage_limit ?? 0,
      per_user_limit: c.per_user_limit,
      starts_at: c.starts_at ?? "",
      expires_at: c.expires_at ?? "",
      is_active: c.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/coupons/${editingId}`, form);
      } else {
        await api.post("/admin/coupons", form);
      }
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu kuponu silmek istediginize emin misiniz?")) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    }
  }

  function updateForm(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminShell title="Kuponlar">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{coupons.length} kupon</p>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Yeni Kupon
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card-bg rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg text-text-primary mb-4">
              {editingId ? "Kupon Duzenle" : "Yeni Kupon"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Kod</label>
                <input className={inputCls} value={form.code} onChange={(e) => updateForm("code", e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Aciklama</label>
                <input className={inputCls} value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Indirim Tipi</label>
                  <select className={inputCls} value={form.discount_type} onChange={(e) => updateForm("discount_type", e.target.value)}>
                    <option value="percentage">Yuzde (%)</option>
                    <option value="fixed">Sabit (TL)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Indirim Degeri</label>
                  <input type="number" className={inputCls} value={form.discount_value} onChange={(e) => updateForm("discount_value", Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Min. Siparis Tutari</label>
                  <input type="number" className={inputCls} value={form.min_order_amount} onChange={(e) => updateForm("min_order_amount", Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Maks. Indirim Tutari</label>
                  <input type="number" className={inputCls} value={form.max_discount_amount} onChange={(e) => updateForm("max_discount_amount", Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Kullanim Limiti</label>
                  <input type="number" className={inputCls} value={form.usage_limit} onChange={(e) => updateForm("usage_limit", Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Kisi Basi Limit</label>
                  <input type="number" className={inputCls} value={form.per_user_limit} onChange={(e) => updateForm("per_user_limit", Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Baslangic</label>
                  <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => updateForm("starts_at", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Bitis</label>
                  <input type="datetime-local" className={inputCls} value={form.expires_at} onChange={(e) => updateForm("expires_at", e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" checked={form.is_active} onChange={(e) => updateForm("is_active", e.target.checked)} />
                Aktif
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-primary-soft transition-colors">
                Iptal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 mb-4">
          <p>{error}</p>
          <button onClick={fetchCoupons} className="mt-2 text-sm underline">Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && coupons.length === 0 && (
        <div className="text-center py-12 text-text-secondary">Kupon bulunamadi.</div>
      )}

      {!loading && !error && coupons.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Kod</th>
                <th className="px-4 py-3 font-medium">Aciklama</th>
                <th className="px-4 py-3 font-medium">Indirim Tipi</th>
                <th className="px-4 py-3 font-medium">Deger</th>
                <th className="px-4 py-3 font-medium">Min. Tutar</th>
                <th className="px-4 py-3 font-medium">Kullanim</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                  <td className="px-4 py-3 text-text-primary font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.description || "-"}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.discount_type === "percentage" ? "Yuzde" : "Sabit"}</td>
                  <td className="px-4 py-3 text-text-primary">{c.discount_value}{c.discount_type === "percentage" ? "%" : " TL"}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatPrice(c.min_order_amount)}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.usage_count}/{c.usage_limit || "Sinirsiz"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", c.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                      {c.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(c)} className="text-primary hover:underline text-xs">Duzenle</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline text-xs">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
