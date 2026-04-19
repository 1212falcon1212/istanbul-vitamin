"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { cn, slugify } from "@/lib/utils";
import type { Page } from "@/types";

const emptyPage = {
  title: "",
  slug: "",
  content: "",
  is_active: true,
  meta_title: "",
  meta_description: "",
};

export default function PagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyPage);
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Page[]>("/admin/pages");
      setPages(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sayfalar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyPage);
    setShowForm(true);
  }

  function openEdit(p: Page) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      content: p.content ?? "",
      is_active: p.is_active,
      meta_title: p.meta_title ?? "",
      meta_description: p.meta_description ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/pages/${editingId}`, form);
      } else {
        await api.post("/admin/pages", form);
      }
      setShowForm(false);
      fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu sayfayi silmek istediginize emin misiniz?")) return;
    try {
      await api.delete(`/admin/pages/${id}`);
      fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    }
  }

  function updateForm(field: string, value: string | boolean) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "title" && typeof value === "string" && !editingId) {
        updated.slug = slugify(value);
      }
      return updated;
    });
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminShell title="Sayfalar">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{pages.length} sayfa</p>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Yeni Sayfa
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card-bg rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg text-text-primary mb-4">
              {editingId ? "Sayfa Duzenle" : "Yeni Sayfa"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Baslik</label>
                <input className={inputCls} value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Slug</label>
                <input className={inputCls} value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">İçerik</label>
                <textarea
                  className={`${inputCls} font-mono text-xs leading-relaxed`}
                  rows={16}
                  value={form.content}
                  onChange={(e) => updateForm("content", e.target.value)}
                  placeholder='<p class="lead">Açılış cümlesi</p>&#10;<h2>Başlık</h2>&#10;<p>Paragraf…</p>'
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  HTML destekler: <code>&lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;p class=&quot;lead&quot;&gt;, &lt;strong&gt;, &lt;ul/li&gt;, &lt;ol/li&gt;, &lt;a href&gt;, &lt;blockquote&gt;</code>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Meta Baslik</label>
                  <input className={inputCls} value={form.meta_title} onChange={(e) => updateForm("meta_title", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Meta Aciklama</label>
                  <input className={inputCls} value={form.meta_description} onChange={(e) => updateForm("meta_description", e.target.value)} />
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
          <button onClick={fetchPages} className="mt-2 text-sm underline">Tekrar Dene</button>
        </div>
      )}

      {!loading && !error && pages.length === 0 && (
        <div className="text-center py-12 text-text-secondary">Sayfa bulunamadi.</div>
      )}

      {!loading && !error && pages.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Baslik</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                  <td className="px-4 py-3 text-text-primary font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", p.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                      {p.is_active ? "Aktif" : "Taslak"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-primary hover:underline text-xs">Duzenle</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Sil</button>
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
