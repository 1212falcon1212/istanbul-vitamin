"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { Campaign } from "@/types";

const emptyCampaign: Omit<Campaign, "id"> = {
  name: "",
  slug: "",
  description: "",
  banner_image: "",
  banner_image_mobile: "",
  discount_type: "percentage",
  discount_value: 0,
  starts_at: "",
  expires_at: "",
  is_active: true,
  meta_title: "",
  meta_description: "",
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCampaign);
  const [saving, setSaving] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Campaign[]>("/admin/campaigns");
      setCampaigns(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kampanyalar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyCampaign);
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      banner_image: c.banner_image ?? "",
      banner_image_mobile: c.banner_image_mobile ?? "",
      discount_type: c.discount_type ?? "percentage",
      discount_value: c.discount_value ?? 0,
      starts_at: c.starts_at ?? "",
      expires_at: c.expires_at ?? "",
      is_active: c.is_active,
      meta_title: c.meta_title ?? "",
      meta_description: c.meta_description ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/campaigns/${editingId}`, form);
      } else {
        await api.post("/admin/campaigns", form);
      }
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu kampanyayi silmek istediginize emin misiniz?")) return;
    try {
      await api.delete(`/admin/campaigns/${id}`);
      fetchCampaigns();
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
    <AdminShell title="Kampanyalar">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">
          {campaigns.length} kampanya
        </p>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Yeni Kampanya
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card-bg rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg text-text-primary mb-4">
              {editingId ? "Kampanya Duzenle" : "Yeni Kampanya"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Ad</label>
                <input className={inputCls} value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Slug</label>
                <input className={inputCls} value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Aciklama</label>
                <textarea className={inputCls} rows={3} value={form.description ?? ""} onChange={(e) => updateForm("description", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Banner Gorsel</label>
                  <input className={inputCls} value={form.banner_image ?? ""} onChange={(e) => updateForm("banner_image", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Banner Mobil</label>
                  <input className={inputCls} value={form.banner_image_mobile ?? ""} onChange={(e) => updateForm("banner_image_mobile", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Indirim Tipi</label>
                  <select className={inputCls} value={form.discount_type ?? "percentage"} onChange={(e) => updateForm("discount_type", e.target.value)}>
                    <option value="percentage">Yuzde</option>
                    <option value="fixed">Sabit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Indirim Degeri</label>
                  <input type="number" className={inputCls} value={form.discount_value ?? 0} onChange={(e) => updateForm("discount_value", Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Baslangic</label>
                  <input type="datetime-local" className={inputCls} value={form.starts_at ?? ""} onChange={(e) => updateForm("starts_at", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Bitis</label>
                  <input type="datetime-local" className={inputCls} value={form.expires_at ?? ""} onChange={(e) => updateForm("expires_at", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Meta Baslik</label>
                  <input className={inputCls} value={form.meta_title ?? ""} onChange={(e) => updateForm("meta_title", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Meta Aciklama</label>
                  <input className={inputCls} value={form.meta_description ?? ""} onChange={(e) => updateForm("meta_description", e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" checked={form.is_active} onChange={(e) => updateForm("is_active", e.target.checked)} />
                Aktif
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-primary-soft transition-colors"
              >
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
          <button onClick={fetchCampaigns} className="mt-2 text-sm underline">Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="text-center py-12 text-text-secondary">Kampanya bulunamadi.</div>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Indirim</th>
                <th className="px-4 py-3 font-medium">Baslangic</th>
                <th className="px-4 py-3 font-medium">Bitis</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                  <td className="px-4 py-3 text-text-primary font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.slug}</td>
                  <td className="px-4 py-3 text-text-primary">
                    {c.discount_value ? `${c.discount_value}${c.discount_type === "percentage" ? "%" : " TL"}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{c.starts_at ? formatDate(c.starts_at) : "-"}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.expires_at ? formatDate(c.expires_at) : "-"}</td>
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
