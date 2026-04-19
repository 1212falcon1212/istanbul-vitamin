"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryForm {
  id?: number;
  name: string;
  parent_id: string;
  description: string;
  sort_order: string;
  is_active: boolean;
  image_url: string;
  meta_title: string;
  meta_description: string;
}

const emptyForm: CategoryForm = {
  name: "",
  parent_id: "",
  description: "",
  sort_order: "0",
  is_active: true,
  image_url: "",
  meta_title: "",
  meta_description: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Category[]>("/admin/categories?per_page=500");
      setCategories(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategoriler yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setForm({
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id ? String(cat.parent_id) : "",
      description: cat.description ?? "",
      sort_order: String(cat.sort_order),
      is_active: cat.is_active,
      image_url: cat.image_url ?? "",
      meta_title: cat.meta_title ?? "",
      meta_description: cat.meta_description ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const body = {
        name: form.name,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        description: form.description || undefined,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
        image_url: form.image_url || undefined,
        meta_title: form.meta_title || undefined,
        meta_description: form.meta_description || undefined,
      };
      if (form.id) {
        await api.put(`/admin/categories/${form.id}`, body);
      } else {
        await api.post("/admin/categories", body);
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Islem basarisiz");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu kategoriyi silmek istediginize emin misiniz?")) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme islemi basarisiz");
    }
  }

  function updateField<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <AdminShell title="Kategoriler">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">
          Toplam {categories.length} kategori
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Kategori Ekle
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm">Henuz kategori yok.</div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border divide-y divide-border">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-primary-soft/30 transition-colors"
              style={{ paddingLeft: `${16 + cat.depth * 24}px` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {cat.depth > 0 && (
                  <span className="text-border text-xs">{"--".repeat(cat.depth)}</span>
                )}
                <span className="text-text-primary font-medium text-sm truncate">{cat.name}</span>
                <span className="text-text-secondary text-xs hidden sm:inline">/{cat.slug}</span>
                <Badge variant={cat.is_active ? "success" : "danger"}>
                  {cat.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(cat)} className="text-primary hover:underline text-xs">
                  Duzenle
                </button>
                <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:underline text-xs">
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-card-bg rounded-xl border border-border p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="font-display text-lg text-text-primary mb-4">
              {form.id ? "Kategori Duzenle" : "Yeni Kategori Ekle"}
            </h2>
            {formError && (
              <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{formError}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Ad *</label>
                <input type="text" required value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Ust Kategori</label>
                <select value={form.parent_id} onChange={(e) => updateField("parent_id", e.target.value)} className={inputClass}>
                  <option value="">Ana Kategori</option>
                  {categories.filter((c) => c.id !== form.id).map((c) => (
                    <option key={c.id} value={c.id}>{"--".repeat(c.depth)} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Aciklama</label>
                <textarea rows={3} value={form.description} onChange={(e) => updateField("description", e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Sira</label>
                  <input type="number" value={form.sort_order} onChange={(e) => updateField("sort_order", e.target.value)} className={inputClass} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
                    Aktif
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Gorsel URL</label>
                <input type="url" value={form.image_url} onChange={(e) => updateField("image_url", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Meta Baslik</label>
                <input type="text" value={form.meta_title} onChange={(e) => updateField("meta_title", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Meta Aciklama</label>
                <textarea rows={2} value={form.meta_description} onChange={(e) => updateField("meta_description", e.target.value)} className={inputClass} />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {submitting ? "Kaydediliyor..." : form.id ? "Guncelle" : "Kaydet"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2 border border-border rounded-lg text-text-secondary text-sm hover:bg-bg-primary transition-colors">
                  Iptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
