"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ImageManager from "@/components/admin/ImageManager";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import type { Brand, Category, Product } from "@/types";

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  brand_id: string;
  short_description: string;
  description: string;
  price: string;
  compare_price: string;
  cost_price: string;
  tax_rate: string;
  stock: string;
  low_stock_threshold: string;
  is_active: boolean;
  is_featured: boolean;
  is_campaign: boolean;
  category_ids: number[];
  images: { image_url: string; alt_text: string; is_primary: boolean }[];
  variants: { name: string; sku: string; price: string; stock: string; is_active: boolean }[];
  tags: string[];
  meta_title: string;
  meta_description: string;
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [form, setForm] = useState<ProductForm | null>(null);
  const [productSlug, setProductSlug] = useState<string>("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [productRes, brandsRes, catsRes] = await Promise.all([
          api.get<{ product: Product } | Product>(`/admin/products/${productId}`),
          api.get<Brand[]>("/admin/brands?per_page=500"),
          api.get<Category[]>("/admin/categories?per_page=500"),
        ]);
        const raw = productRes.data as { product?: Product } | Product | undefined;
        const p = raw && "product" in raw ? raw.product : (raw as Product | undefined);
        if (!p) throw new Error("Urun bulunamadi");
        setProductSlug(p.slug ?? "");
        setBrands(brandsRes.data ?? []);
        setCategories(catsRes.data ?? []);
        setForm({
          name: p.name,
          sku: p.sku,
          barcode: p.barcode ?? "",
          brand_id: p.brand_id ? String(p.brand_id) : "",
          short_description: p.short_description ?? "",
          description: p.description ?? "",
          price: String(p.price),
          compare_price: p.compare_price ? String(p.compare_price) : "",
          cost_price: p.cost_price ? String(p.cost_price) : "",
          tax_rate: String(p.tax_rate),
          stock: String(p.stock),
          low_stock_threshold: String(p.low_stock_threshold),
          is_active: p.is_active,
          is_featured: p.is_featured,
          is_campaign: p.is_campaign,
          category_ids: p.categories?.map((c) => c.id) ?? [],
          images: p.images?.map((img) => ({ image_url: img.image_url, alt_text: img.alt_text ?? "", is_primary: img.is_primary })) ?? [],
          variants: p.variants?.map((v) => ({ name: v.name, sku: v.sku ?? "", price: String(v.price), stock: String(v.stock), is_active: v.is_active })) ?? [],
          tags: p.tags?.map((t) => t.tag) ?? [],
          meta_title: p.meta_title ?? "",
          meta_description: p.meta_description ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Urun yuklenemedi");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [productId]);

  if (loading) {
    return (
      <AdminShell title="Urun Duzenle">
        <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>
      </AdminShell>
    );
  }

  if (error || !form) {
    return (
      <AdminShell title="Urun Duzenle">
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error || "Urun bulunamadi"}</div>
      </AdminShell>
    );
  }

  function updateField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function toggleCategory(id: number) {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        category_ids: prev.category_ids.includes(id)
          ? prev.category_ids.filter((c) => c !== id)
          : [...prev.category_ids, id],
      };
    });
  }

  function addImage() {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, images: [...prev.images, { image_url: "", alt_text: "", is_primary: prev.images.length === 0 }] };
    });
  }

  function updateImage(idx: number, field: string, value: string | boolean) {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, images: prev.images.map((img, i) => (i === idx ? { ...img, [field]: value } : img)) };
    });
  }

  function removeImage(idx: number) {
    setForm((prev) => prev ? { ...prev, images: prev.images.filter((_, i) => i !== idx) } : prev);
  }

  function addVariant() {
    setForm((prev) => prev ? { ...prev, variants: [...prev.variants, { name: "", sku: "", price: "", stock: "0", is_active: true }] } : prev);
  }

  function updateVariant(idx: number, field: string, value: string | boolean) {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, variants: prev.variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)) };
    });
  }

  function removeVariant(idx: number) {
    setForm((prev) => prev ? { ...prev, variants: prev.variants.filter((_, i) => i !== idx) } : prev);
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && form && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    if (!form) return;
    updateField("tags", form.tags.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError("");
    try {
      const body = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || undefined,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        short_description: form.short_description || undefined,
        description: form.description || undefined,
        price: Number(form.price),
        compare_price: form.compare_price ? Number(form.compare_price) : undefined,
        cost_price: form.cost_price ? Number(form.cost_price) : undefined,
        tax_rate: Number(form.tax_rate),
        stock: Number(form.stock),
        low_stock_threshold: Number(form.low_stock_threshold),
        is_active: form.is_active,
        is_featured: form.is_featured,
        is_campaign: form.is_campaign,
        category_ids: form.category_ids,
        images: form.images.filter((img) => img.image_url).map((img, i) => ({ ...img, sort_order: i })),
        variants: form.variants.filter((v) => v.name).map((v, i) => ({
          name: v.name,
          sku: v.sku || undefined,
          price: Number(v.price),
          stock: Number(v.stock),
          is_active: v.is_active,
          sort_order: i,
        })),
        tags: form.tags,
        meta_title: form.meta_title || undefined,
        meta_description: form.meta_description || undefined,
      };
      await api.put<Product>(`/admin/products/${productId}`, body);
      // Kayıttan sonra sayfada kal — yalnızca başarı işaretçisini güncelle.
      setSavedAt(Date.now());
      setError("");
      setTimeout(() => setSavedAt(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Urun guncellenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell title="Ürün Düzenle">
      <form onSubmit={handleSubmit} className="pb-24">
        {/* Header with breadcrumb + quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push("/yonetim/urunler")}
              className="text-xs text-text-secondary hover:text-primary transition-colors mb-1"
            >
              ← Ürünlere dön
            </button>
            <h2 className="font-display text-2xl text-text-primary truncate">
              {form.name || "İsimsiz Ürün"}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              SKU: <span className="font-mono">{form.sku || "—"}</span>
            </p>
          </div>
          {productSlug && (
            <a
              href={`/urun/${productSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 inline-flex items-center gap-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:border-primary hover:text-primary transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Mağazada Görüntüle
            </a>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol kolon — ana içerik */}
          <div className="lg:col-span-2 space-y-6">
            <Section title="Genel Bilgiler">
              <div className="space-y-4">
                <Field label="Ürün Adı *">
                  <input type="text" required value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="SKU *">
                    <input type="text" required value={form.sku} onChange={(e) => updateField("sku", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Barkod">
                    <input type="text" value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} className={inputClass} />
                  </Field>
                </div>
                <Field label="Marka">
                  <select value={form.brand_id} onChange={(e) => updateField("brand_id", e.target.value)} className={inputClass}>
                    <option value="">Marka seçin</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Kısa Açıklama" hint="Ürün kartında ve listelerde görünür.">
                  <textarea rows={2} value={form.short_description} onChange={(e) => updateField("short_description", e.target.value)} className={textareaClass} />
                </Field>
                <Field label="Açıklama">
                  <textarea rows={6} value={form.description} onChange={(e) => updateField("description", e.target.value)} className={textareaClass} />
                </Field>
              </div>
            </Section>

            <Section title="Görseller" subtitle="İlk görsel veya `Ana` seçili olan ürün kartında gösterilir.">
              <ImageManager
                images={form.images}
                onAdd={addImage}
                onUpdate={updateImage}
                onRemove={removeImage}
                onAddUrl={(url) =>
                  setForm((prev) => prev ? {
                    ...prev,
                    images: [...prev.images, { image_url: url, alt_text: "", is_primary: prev.images.length === 0 }],
                  } : prev)
                }
              />
            </Section>

            <Section title="Varyantlar" subtitle="Ürün farklı boyut/renk seçenekleriyle satılıyorsa ekleyin.">
              <div className="space-y-3">
                {form.variants.length === 0 && (
                  <p className="text-sm text-text-secondary italic">Varyant yok — ürün tek seçenekle satılıyor.</p>
                )}
                {form.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end p-3 rounded-lg border border-border bg-bg-primary/30">
                    <Field label="Ad">
                      <input type="text" value={v.name} onChange={(e) => updateVariant(idx, "name", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="SKU">
                      <input type="text" value={v.sku} onChange={(e) => updateVariant(idx, "sku", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Fiyat">
                      <input type="number" step="0.01" value={v.price} onChange={(e) => updateVariant(idx, "price", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Stok">
                      <input type="number" value={v.stock} onChange={(e) => updateVariant(idx, "stock", e.target.value)} className={inputClass} />
                    </Field>
                    <button type="button" onClick={() => removeVariant(idx)} className="text-red-500 hover:text-red-700 text-sm mb-2.5">
                      Kaldır
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addVariant} className="w-full border-2 border-dashed border-border rounded-lg py-2.5 text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors">
                  + Varyant Ekle
                </button>
              </div>
            </Section>

            <Section title="SEO" subtitle="Arama motorlarında görünecek başlık ve açıklama.">
              <div className="space-y-4">
                <Field label="Meta Başlık">
                  <input type="text" value={form.meta_title} onChange={(e) => updateField("meta_title", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Meta Açıklama">
                  <textarea rows={3} value={form.meta_description} onChange={(e) => updateField("meta_description", e.target.value)} className={textareaClass} />
                </Field>
              </div>
            </Section>
          </div>

          {/* Sağ kolon — sticky sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Section title="Durum">
              <div className="space-y-3">
                <ToggleRow
                  label="Aktif"
                  hint="Kapalı ise ürün vitrinde görünmez."
                  checked={form.is_active}
                  onChange={(v) => updateField("is_active", v)}
                />
                <ToggleRow
                  label="Öne Çıkan"
                  hint="Ana sayfa ve markanın öne çıkanlarında görünür."
                  checked={form.is_featured}
                  onChange={(v) => updateField("is_featured", v)}
                />
                <ToggleRow
                  label="Kampanyalı"
                  hint="Kampanyalar sayfasında listelenir."
                  checked={form.is_campaign}
                  onChange={(v) => updateField("is_campaign", v)}
                />
              </div>
            </Section>

            <Section title="Fiyatlandırma">
              <div className="space-y-4">
                <Field label="Fiyat (TL) *">
                  <input type="number" step="0.01" required value={form.price} onChange={(e) => updateField("price", e.target.value)} className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Karşılaştırma">
                    <input type="number" step="0.01" value={form.compare_price} onChange={(e) => updateField("compare_price", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Maliyet">
                    <input type="number" step="0.01" value={form.cost_price} onChange={(e) => updateField("cost_price", e.target.value)} className={inputClass} />
                  </Field>
                </div>
                <Field label="KDV Oranı (%)">
                  <select value={form.tax_rate} onChange={(e) => updateField("tax_rate", e.target.value)} className={inputClass}>
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Stok">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stok">
                  <input type="number" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Düşük Eşik">
                  <input type="number" value={form.low_stock_threshold} onChange={(e) => updateField("low_stock_threshold", e.target.value)} className={inputClass} />
                </Field>
              </div>
            </Section>

            <Section title="Kategoriler">
              {categories.length === 0 ? (
                <p className="text-text-secondary text-sm">Kategori bulunamadı.</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 text-sm text-text-primary py-0.5 cursor-pointer hover:text-primary"
                      style={{ paddingLeft: `${cat.depth * 14}px` }}
                    >
                      <input
                        type="checkbox"
                        checked={form.category_ids.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-border text-primary focus:ring-primary shrink-0"
                      />
                      <span className="truncate">{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Etiketler">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {form.tags.length === 0 && (
                  <span className="text-xs text-text-secondary italic">Henüz etiket yok.</span>
                )}
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-primary-soft text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500" aria-label={`${tag} etiketini kaldır`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Etiket..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  className={inputClass + " flex-1"}
                />
                <button type="button" onClick={addTag} className="h-9 px-3 bg-primary-soft text-primary rounded-lg text-sm font-medium hover:bg-primary/10 shrink-0">
                  Ekle
                </button>
              </div>
            </Section>
          </aside>
        </div>

        {/* Sticky footer action bar */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-card-bg/95 backdrop-blur border-t border-border px-4 lg:px-6 py-3 z-30">
          <div className="flex items-center justify-end gap-3">
            {savedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Değişiklikler kaydedildi
              </span>
            )}
            <button
              type="button"
              onClick={() => router.push("/yonetim/urunler")}
              className="h-10 px-5 border border-border rounded-lg text-text-secondary text-sm hover:bg-bg-primary transition-colors"
            >
              Ürünlere Dön
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-6 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-secondary mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

const baseFieldClass = "w-full rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";
const inputClass = `${baseFieldClass} h-10 px-3`;
const textareaClass = `${baseFieldClass} px-3 py-2.5 leading-relaxed resize-y`;

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card-bg rounded-2xl border border-border p-5 lg:p-6">
      <div className="mb-4">
        <h2 className="font-display text-base text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}
