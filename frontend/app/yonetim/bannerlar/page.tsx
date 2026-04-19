"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { Banner } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function uploadBannerImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const token = localStorage.getItem("admin_token") ?? "";
  const res = await fetch(`${API_BASE_URL}/admin/uploads/image`, {
    method: "POST",
    body: fd,
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Yükleme başarısız");
  return json.data?.url ?? "";
}

const positions = [
  { value: "hero", label: "Ana Slider (Üst, Büyük)" },
  { value: "hero_tile", label: "Hero Altı 3'lü Tile" },
  { value: "seasonal", label: "Sezon Banner (Büyük, Yatay)" },
  { value: "mid", label: "Orta Banner (Çift)" },
  { value: "footer", label: "Alt Banner (Büyük Final)" },
];

const emptyBanner = {
  position: "hero",
  title: "",
  image_url: "",
  image_url_mobile: "",
  link_url: "",
  sort_order: 0,
  is_active: true,
  starts_at: "",
  expires_at: "",
};

export default function BannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyBanner);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Banner[] | { banners: Banner[] }>("/admin/banners");
      const d = res.data;
      setBanners(Array.isArray(d) ? d : d?.banners ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bannerlar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyBanner);
    setShowForm(true);
  }

  function openEdit(b: Banner) {
    setEditingId(b.id);
    setForm({
      position: b.position,
      title: b.title ?? "",
      image_url: b.image_url,
      image_url_mobile: b.image_url_mobile ?? "",
      link_url: b.link_url ?? "",
      sort_order: b.sort_order,
      is_active: b.is_active,
      starts_at: "",
      expires_at: "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/banners/${editingId}`, form);
      } else {
        await api.post("/admin/banners", form);
      }
      setShowForm(false);
      fetchBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu banneri silmek istediginize emin misiniz?")) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      fetchBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    }
  }

  function updateForm(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const grouped = positions.map((pos) => ({
    ...pos,
    items: banners.filter((b) => b.position === pos.value),
  }));

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminShell title="Banner'lar">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{banners.length} banner</p>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Yeni Banner
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card-bg rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg text-text-primary mb-4">
              {editingId ? "Banner Duzenle" : "Yeni Banner"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Pozisyon</label>
                <select className={inputCls} value={form.position} onChange={(e) => updateForm("position", e.target.value)}>
                  {positions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Baslik</label>
                <input className={inputCls} value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
              </div>
              <ImageField
                label="Görsel (Masaüstü)"
                value={form.image_url}
                onChange={(v) => updateForm("image_url", v)}
              />
              <ImageField
                label="Görsel (Mobil) — opsiyonel"
                value={form.image_url_mobile}
                onChange={(v) => updateForm("image_url_mobile", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Link URL</label>
                  <input className={inputCls} value={form.link_url} onChange={(e) => updateForm("link_url", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Siralama</label>
                  <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => updateForm("sort_order", Number(e.target.value))} />
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
          <button onClick={fetchBanners} className="mt-2 text-sm underline">Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && banners.length === 0 && (
        <div className="text-center py-12 text-text-secondary">Banner bulunamadi.</div>
      )}

      {!loading && !error && banners.length > 0 && (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.value}>
              <h2 className="font-display text-lg text-text-primary mb-3">
                {group.label}
              </h2>
              {group.items.length === 0 ? (
                <p className="text-sm text-text-secondary">Bu pozisyonda banner yok.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map((b) => (
                    <div key={b.id} className="bg-card-bg rounded-xl border border-border overflow-hidden">
                      <div className="aspect-[16/7] bg-bg-primary relative">
                        {b.image_url ? (
                          <img src={resolveImageUrl(b.image_url)} alt={b.title ?? "Banner"} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-text-secondary text-sm">Gorsel yok</div>
                        )}
                        <span className={cn("absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium", b.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                          {b.is_active ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-text-primary text-sm mb-1">{b.title || "Basliki yok"}</h3>
                        <div className="flex items-center justify-between text-xs text-text-secondary mb-3">
                          <span>Sira: {b.sort_order}</span>
                          {b.link_url && <span className="truncate max-w-[120px]">{b.link_url}</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(b)} className="flex-1 px-3 py-1.5 text-xs text-primary border border-primary rounded-lg hover:bg-primary-soft transition-colors">
                            Duzenle
                          </button>
                          <button onClick={() => handleDelete(b.id)} className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadBannerImage(file);
      if (url) onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(value)}
              alt="Önizleme"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="URL veya yüklediğiniz yol"
            className="w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-text-primary font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1 h-8 px-3 bg-primary-soft text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/10 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  e.target.value = "";
                }}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? "Yükleniyor..." : "Dosya Seç"}
            </label>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="h-8 px-3 rounded-lg border border-border text-xs text-text-secondary hover:text-red-600 hover:border-red-300 transition-colors"
              >
                Temizle
              </button>
            )}
          </div>
          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
