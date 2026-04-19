"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface VariationValue {
  id: number;
  variation_type_id: number;
  value: string;
  slug: string;
  color_hex?: string;
  sort_order: number;
  is_active: boolean;
}

interface VariationType {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  values?: VariationValue[];
}

export default function VaryasyonlarPage() {
  const [types, setTypes] = useState<VariationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  const [typeModal, setTypeModal] = useState<{
    open: boolean;
    editing?: VariationType;
  }>({ open: false });
  const [valueModal, setValueModal] = useState<{
    open: boolean;
    editing?: VariationValue;
  }>({ open: false });

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{ types: VariationType[] }>("/admin/variations/types");
      const list = res.data?.types ?? [];
      setTypes(list);
      if (list.length > 0 && selectedTypeId == null) {
        setSelectedTypeId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Varyasyonlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [selectedTypeId]);

  useEffect(() => {
    fetchTypes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedType = types.find((t) => t.id === selectedTypeId);

  async function saveType(data: {
    id?: number;
    name: string;
    sort_order: number;
    is_active: boolean;
  }) {
    const body = {
      name: data.name,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    if (data.id) {
      await api.put(`/admin/variations/types/${data.id}`, body);
    } else {
      await api.post("/admin/variations/types", body);
    }
    await fetchTypes();
  }

  async function deleteType(t: VariationType) {
    if (!confirm(`"${t.name}" türünü silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/variations/types/${t.id}`);
      if (selectedTypeId === t.id) setSelectedTypeId(null);
      await fetchTypes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinemedi");
    }
  }

  async function saveValue(data: {
    id?: number;
    variation_type_id: number;
    value: string;
    color_hex: string;
    sort_order: number;
    is_active: boolean;
  }) {
    const body = {
      variation_type_id: data.variation_type_id,
      value: data.value,
      color_hex: data.color_hex,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    if (data.id) {
      await api.put(`/admin/variations/values/${data.id}`, body);
    } else {
      await api.post("/admin/variations/values", body);
    }
    await fetchTypes();
  }

  async function deleteValue(v: VariationValue) {
    if (!confirm(`"${v.value}" değerini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/variations/values/${v.id}`);
      await fetchTypes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinemedi");
    }
  }

  return (
    <AdminShell title="Varyasyonlar">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Varyasyonlar</h1>
          <p className="text-xs text-text-secondary mt-1">
            Renk, beden, aroma gibi varyasyon türlerini ve değerlerini tanımlayın.
            Ürün düzenleme sayfasında bu varyasyonları varyantlara atayabilirsiniz.
          </p>
        </div>
        <button
          onClick={() => setTypeModal({ open: true })}
          className="h-10 px-4 inline-flex items-center gap-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Tür
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-card-bg border border-border rounded-2xl py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-bg-primary mx-auto mb-4 flex items-center justify-center text-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            </svg>
          </div>
          <h3 className="font-display text-lg text-text-primary mb-1">Henüz varyasyon yok</h3>
          <p className="text-sm text-text-secondary mb-4">
            İlk varyasyon türünü ekleyerek başlayın (ör. Renk, Beden).
          </p>
          <button
            onClick={() => setTypeModal({ open: true })}
            className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Yeni Tür Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* Sol: Türler */}
          <div className="bg-card-bg rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-display text-sm text-text-primary">Türler</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {types.length} tür
              </p>
            </div>
            <ul className="divide-y divide-border">
              {types.map((t) => {
                const active = selectedTypeId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTypeId(t.id)}
                      className={cn(
                        "w-full px-5 py-3 flex items-center justify-between gap-3 transition-colors text-left",
                        active ? "bg-primary-soft" : "hover:bg-primary-soft/40"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            active ? "text-primary" : "text-text-primary"
                          )}
                        >
                          {t.name}
                        </p>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          {t.values?.length ?? 0} değer · /{t.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!t.is_active && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            Pasif
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sağ: Seçili türün değerleri */}
          {selectedType ? (
            <div className="bg-card-bg rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-sm text-text-primary truncate">
                    {selectedType.name} — Değerler
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {selectedType.values?.length ?? 0} değer tanımlı
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setTypeModal({ open: true, editing: selectedType })}
                    className="h-8 px-3 inline-flex items-center rounded-lg border border-border text-xs text-text-primary hover:border-primary hover:text-primary transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => deleteType(selectedType)}
                    className="h-8 px-3 inline-flex items-center rounded-lg border border-border text-xs text-red-600 hover:border-red-500 hover:bg-red-50 transition-colors"
                  >
                    Sil
                  </button>
                  <button
                    onClick={() => setValueModal({ open: true })}
                    className="h-8 px-3 inline-flex items-center gap-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Değer Ekle
                  </button>
                </div>
              </div>

              {(selectedType.values?.length ?? 0) === 0 ? (
                <div className="py-14 text-center text-sm text-text-secondary">
                  Bu türe henüz değer eklenmemiş.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {selectedType.values!.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-primary-soft/20 transition-colors"
                    >
                      {v.color_hex ? (
                        <span
                          className="w-7 h-7 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: v.color_hex }}
                          title={v.color_hex}
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-bg-primary border border-border shrink-0 flex items-center justify-center text-[10px] font-semibold text-text-secondary">
                          {v.value.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary font-medium">{v.value}</p>
                        <p className="text-[11px] text-text-secondary font-mono">/{v.slug}</p>
                      </div>
                      {!v.is_active && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
                          Pasif
                        </span>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setValueModal({ open: true, editing: v })}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-secondary hover:text-primary hover:bg-primary-soft/40 transition-colors"
                          title="Düzenle"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteValue(v)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="bg-card-bg border border-border rounded-2xl flex items-center justify-center py-20 text-sm text-text-secondary">
              Soldaki listeden bir tür seçin.
            </div>
          )}
        </div>
      )}

      {/* Tür modali */}
      {typeModal.open && (
        <TypeModal
          editing={typeModal.editing}
          onClose={() => setTypeModal({ open: false })}
          onSave={async (data) => {
            await saveType(data);
            setTypeModal({ open: false });
          }}
        />
      )}

      {/* Değer modali */}
      {valueModal.open && selectedType && (
        <ValueModal
          typeName={selectedType.name}
          editing={valueModal.editing}
          typeId={selectedType.id}
          onClose={() => setValueModal({ open: false })}
          onSave={async (data) => {
            await saveValue(data);
            setValueModal({ open: false });
          }}
        />
      )}
    </AdminShell>
  );
}

/* --- Modals --- */

function TypeModal({
  editing,
  onClose,
  onSave,
}: {
  editing?: VariationType;
  onClose: () => void;
  onSave: (data: { id?: number; name: string; sort_order: number; is_active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: editing?.id,
        name,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Türü Düzenle" : "Yeni Tür"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

        <Field label="Ad *">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Renk, Beden, Aroma..."
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sıra">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm h-10 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Aktif
            </label>
          </div>
        </div>

        <ModalFooter onCancel={onClose} submitting={saving} editing={!!editing} />
      </form>
    </Modal>
  );
}

function ValueModal({
  editing,
  typeId,
  typeName,
  onClose,
  onSave,
}: {
  editing?: VariationValue;
  typeId: number;
  typeName: string;
  onClose: () => void;
  onSave: (data: {
    id?: number;
    variation_type_id: number;
    value: string;
    color_hex: string;
    sort_order: number;
    is_active: boolean;
  }) => Promise<void>;
}) {
  const [value, setValue] = useState(editing?.value ?? "");
  const [colorHex, setColorHex] = useState(editing?.color_hex ?? "");
  const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: editing?.id,
        variation_type_id: typeId,
        value,
        color_hex: colorHex,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Değeri Düzenle" : `${typeName} — Yeni Değer`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

        <Field label="Değer *">
          <input
            type="text"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Kırmızı, S, Vanilya..."
            className={inputClass}
          />
        </Field>

        <Field label="Renk kodu (opsiyonel)" hint="Renk tipi için HEX kodu: #FF0000">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              placeholder="#FF0000"
              className={`${inputClass} flex-1 font-mono`}
              maxLength={7}
            />
            {colorHex && /^#[0-9A-Fa-f]{6}$/.test(colorHex) && (
              <span
                className="w-10 h-10 rounded-lg border border-border shrink-0"
                style={{ backgroundColor: colorHex }}
              />
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sıra">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm h-10 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Aktif
            </label>
          </div>
        </div>

        <ModalFooter onCancel={onClose} submitting={saving} editing={!!editing} />
      </form>
    </Modal>
  );
}

/* --- Helpers --- */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card-bg rounded-2xl border border-border w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-bg-primary transition-colors"
            aria-label="Kapat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({
  onCancel,
  submitting,
  editing,
}: {
  onCancel: () => void;
  submitting: boolean;
  editing: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
      <button
        type="button"
        onClick={onCancel}
        className="h-10 px-5 border border-border rounded-lg text-text-secondary text-sm hover:bg-bg-primary transition-colors"
      >
        İptal
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="h-10 px-6 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {submitting ? "Kaydediliyor..." : editing ? "Güncelle" : "Kaydet"}
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3 rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";
