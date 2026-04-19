"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import type { Brand, Pagination as PaginationType } from "@/types";

interface BrandForm {
  id?: number;
  name: string;
  logo_url: string;
  description: string;
  is_active: boolean;
  sort_order: string;
  meta_title: string;
  meta_description: string;
}

const emptyForm: BrandForm = {
  name: "",
  logo_url: "",
  description: "",
  is_active: true,
  sort_order: "0",
  meta_title: "",
  meta_description: "",
};

type StatusFilter = "all" | "active" | "inactive";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBrands = useCallback(
    async (page: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: "20",
        });
        if (searchDebounced) params.set("search", searchDebounced);
        if (statusFilter !== "all") {
          params.set("is_active", statusFilter === "active" ? "true" : "false");
        }
        const res = await api.getList<Brand[]>(`/admin/brands?${params}`);
        setBrands(res.data ?? []);
        setPagination(res.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Markalar yüklenemedi");
      } finally {
        setLoading(false);
      }
    },
    [searchDebounced, statusFilter]
  );

  useEffect(() => {
    fetchBrands(1);
  }, [fetchBrands]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(brand: Brand) {
    setForm({
      id: brand.id,
      name: brand.name,
      logo_url: brand.logo_url ?? "",
      description: brand.description ?? "",
      is_active: brand.is_active,
      sort_order: String(brand.sort_order),
      meta_title: brand.meta_title ?? "",
      meta_description: brand.meta_description ?? "",
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
        logo_url: form.logo_url || undefined,
        description: form.description || undefined,
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
        meta_title: form.meta_title || undefined,
        meta_description: form.meta_description || undefined,
      };
      if (form.id) {
        await api.put(`/admin/brands/${form.id}`, body);
      } else {
        await api.post("/admin/brands", body);
      }
      setModalOpen(false);
      fetchBrands(pagination.page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(b: Brand) {
    if (!confirm(`"${b.name}" markasını silmek istediğinizden emin misiniz?`)) return;
    try {
      await api.delete(`/admin/brands/${b.id}`);
      fetchBrands(pagination.page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız");
    }
  }

  function updateField<K extends keyof BrandForm>(key: K, value: BrandForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <AdminShell title="Markalar">
      {/* Toolbar */}
      <div className="bg-card-bg rounded-2xl border border-border p-4 mb-5 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Marka adı veya slug ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-bg-primary/60 p-1 shrink-0">
          {[
            { v: "all" as const, label: "Tümü" },
            { v: "active" as const, label: "Aktif" },
            { v: "inactive" as const, label: "Pasif" },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setStatusFilter(opt.v)}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                statusFilter === opt.v
                  ? "bg-white text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={openCreate}
          className="h-10 px-4 inline-flex items-center gap-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Marka
        </button>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-text-secondary mb-3 px-1">
        <span>
          Toplam <span className="font-medium text-text-primary">{pagination.total}</span> marka
        </span>
        {searchDebounced && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-primary hover:underline"
          >
            Aramayı temizle
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-4">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : brands.length === 0 ? (
        <EmptyState
          search={searchDebounced}
          onReset={() => setSearch("")}
          onCreate={openCreate}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-3 font-medium w-[45%]">Marka</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium text-right">Sıra</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-primary-soft/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="w-12 h-12 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary"
                      >
                        {b.logo_url ? (
                          <img
                            src={b.logo_url}
                            alt={b.name}
                            className="w-full h-full object-contain p-1.5"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-text-secondary uppercase">
                            {b.name.slice(0, 2)}
                          </span>
                        )}
                      </button>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="block text-sm font-medium text-text-primary hover:text-primary text-left truncate"
                        >
                          {b.name}
                        </button>
                        {b.description && (
                          <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                            {b.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-text-secondary font-mono text-xs whitespace-nowrap">
                    /{b.slug}
                  </td>

                  <td className="px-4 py-3 text-right text-text-secondary text-xs whitespace-nowrap">
                    {b.sort_order}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        b.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          b.is_active ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      {b.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-primary-soft/40 transition-colors"
                        title="Düzenle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Sil"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="mt-6">
          <Pagination pagination={pagination} onPageChange={(p) => fetchBrands(p)} />
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-card-bg rounded-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-display text-lg text-text-primary">
                {form.id ? "Markayı Düzenle" : "Yeni Marka"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-bg-primary transition-colors"
                aria-label="Kapat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{formError}</div>
                )}

                {/* Logo preview + URL */}
                <div>
                  <label className={labelClass}>Logo</label>
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="logo" className="w-full h-full object-contain p-1.5" />
                      ) : (
                        <span className="text-[10px] font-semibold uppercase">
                          {form.name.slice(0, 2) || "—"}
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.logo_url}
                      onChange={(e) => updateField("logo_url", e.target.value)}
                      className={`${inputClass} flex-1`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Ad *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Açıklama</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    className={textareaClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Sıra</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => updateField("sort_order", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-text-primary h-10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => updateField("is_active", e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      Aktif
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-text-secondary mb-3 uppercase tracking-wide">SEO</p>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Meta Başlık</label>
                      <input
                        type="text"
                        value={form.meta_title}
                        onChange={(e) => updateField("meta_title", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Meta Açıklama</label>
                      <textarea
                        rows={2}
                        value={form.meta_description}
                        onChange={(e) => updateField("meta_description", e.target.value)}
                        className={textareaClass}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-primary/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-5 border border-border rounded-lg text-text-secondary text-sm hover:bg-bg-primary transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? "Kaydediliyor..." : form.id ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function EmptyState({
  search,
  onReset,
  onCreate,
}: {
  search: string;
  onReset: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="bg-card-bg rounded-2xl border border-border py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-bg-primary mx-auto mb-4 flex items-center justify-center text-text-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      </div>
      <h3 className="font-display text-lg text-text-primary mb-1">
        {search ? "Eşleşen marka yok" : "Henüz marka eklenmemiş"}
      </h3>
      <p className="text-sm text-text-secondary mb-4">
        {search
          ? `"${search}" için sonuç bulunamadı.`
          : "İlk markanı ekleyerek başla."}
      </p>
      {search ? (
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-primary hover:underline"
        >
          Aramayı temizle
        </button>
      ) : (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Marka Ekle
        </button>
      )}
    </div>
  );
}

const baseFieldClass = "w-full rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";
const inputClass = `${baseFieldClass} h-10 px-3`;
const textareaClass = `${baseFieldClass} px-3 py-2.5 leading-relaxed resize-y`;
const labelClass = "block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide";
