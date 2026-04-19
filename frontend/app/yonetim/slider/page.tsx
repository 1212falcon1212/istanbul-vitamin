"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Slider } from "@/types";

const emptySlider = {
  title: "",
  subtitle: "",
  image_url: "",
  image_url_mobile: "",
  link_url: "",
  button_text: "",
  sort_order: 0,
  is_active: true,
  starts_at: "",
  expires_at: "",
};

export default function SlidersPage() {
  const router = useRouter();
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptySlider);
  const [saving, setSaving] = useState(false);

  const fetchSliders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Slider[]>("/admin/sliders");
      setSliders(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sliderlar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  function openCreate() {
    setEditingId(null);
    setForm(emptySlider);
    setShowForm(true);
  }

  function openEdit(s: Slider) {
    setEditingId(s.id);
    setForm({
      title: s.title ?? "",
      subtitle: s.subtitle ?? "",
      image_url: s.image_url,
      image_url_mobile: s.image_url_mobile ?? "",
      link_url: s.link_url ?? "",
      button_text: s.button_text ?? "",
      sort_order: s.sort_order,
      is_active: s.is_active,
      starts_at: s.starts_at ?? "",
      expires_at: s.expires_at ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/sliders/${editingId}`, form);
      } else {
        await api.post("/admin/sliders", form);
      }
      setShowForm(false);
      fetchSliders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu slideri silmek istediginize emin misiniz?")) return;
    try {
      await api.delete(`/admin/sliders/${id}`);
      fetchSliders();
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
    <AdminShell title="Slider">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{sliders.length} slider</p>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Yeni Slider
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card-bg rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg text-text-primary mb-4">
              {editingId ? "Slider Duzenle" : "Yeni Slider"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Baslik</label>
                <input className={inputCls} value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Alt Baslik</label>
                <input className={inputCls} value={form.subtitle} onChange={(e) => updateForm("subtitle", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Gorsel URL</label>
                <input className={inputCls} value={form.image_url} onChange={(e) => updateForm("image_url", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Mobil Gorsel URL</label>
                <input className={inputCls} value={form.image_url_mobile} onChange={(e) => updateForm("image_url_mobile", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Link URL</label>
                  <input className={inputCls} value={form.link_url} onChange={(e) => updateForm("link_url", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Buton Metni</label>
                  <input className={inputCls} value={form.button_text} onChange={(e) => updateForm("button_text", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Siralama</label>
                <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => updateForm("sort_order", Number(e.target.value))} />
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
          <button onClick={fetchSliders} className="mt-2 text-sm underline">Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && sliders.length === 0 && (
        <div className="text-center py-12 text-text-secondary">Slider bulunamadi.</div>
      )}

      {!loading && !error && sliders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sliders.map((s) => (
            <div key={s.id} className="bg-card-bg rounded-xl border border-border overflow-hidden">
              {/* Image preview */}
              <div className="aspect-[16/7] bg-bg-primary relative">
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt={s.title ?? "Slider"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                    Gorsel yok
                  </div>
                )}
                <span
                  className={cn(
                    "absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium",
                    s.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  )}
                >
                  {s.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-text-primary text-sm mb-1">
                  {s.title || "Basliki yok"}
                </h3>
                {s.subtitle && (
                  <p className="text-xs text-text-secondary mb-2">{s.subtitle}</p>
                )}
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Sira: {s.sort_order}</span>
                  {s.link_url && (
                    <span className="truncate max-w-[120px]">{s.link_url}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 px-3 py-1.5 text-xs text-primary border border-primary rounded-lg hover:bg-primary-soft transition-colors"
                  >
                    Duzenle
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
