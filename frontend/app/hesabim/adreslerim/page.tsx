"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import type { Address } from "@/types";
import { TR_CITIES, TR_DISTRICTS } from "@/lib/tr-locations";

interface AddressFormData {
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  address_line: string;
  postal_code: string;
  is_default: boolean;
}

const EMPTY_FORM: AddressFormData = {
  title: "",
  first_name: "",
  last_name: "",
  phone: "",
  city: "",
  district: "",
  neighborhood: "",
  address_line: "",
  postal_code: "",
  is_default: false,
};

export default function AdreslerimPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Address[]>("/addresses");
      setAddresses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Adresler yuklenirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  function openAddForm() {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(address: Address) {
    setFormData({
      title: address.title,
      first_name: address.first_name,
      last_name: address.last_name,
      phone: address.phone,
      city: address.city,
      district: address.district,
      neighborhood: address.neighborhood || "",
      address_line: address.address_line,
      postal_code: address.postal_code || "",
      is_default: address.is_default,
    });
    setEditingId(address.id);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    if (!formData.title || !formData.first_name || !formData.last_name || !formData.phone || !formData.city || !formData.district || !formData.address_line) {
      setFormError("Lutfen zorunlu alanlari doldurunuz.");
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await api.put(`/addresses/${editingId}`, formData);
      } else {
        await api.post("/addresses", formData);
      }
      closeForm();
      await fetchAddresses();
    } catch {
      setFormError("Adres kaydedilirken bir hata olustu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/addresses/${id}`);
      setDeleteConfirmId(null);
      await fetchAddresses();
    } catch {
      setError("Adres silinirken bir hata olustu.");
    }
  }

  function handleChange(
    field: keyof AddressFormData,
    value: string | boolean
  ) {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Şehir değişince ilçeyi sıfırla (yanlış ilçe kalmasın).
      if (field === "city" && typeof value === "string" && prev.city !== value) {
        next.district = "";
      }
      return next;
    });
  }

  const districtOptions = useMemo(() => {
    if (!formData.city) return [] as string[];
    return TR_DISTRICTS[formData.city] ?? [];
  }, [formData.city]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-text-primary">Adreslerim</h1>
        <button
          onClick={openAddForm}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Yeni Adres Ekle
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Address form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card-bg rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display text-xl text-text-primary">
                {editingId ? "Adresi Duzenle" : "Yeni Adres Ekle"}
              </h2>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-primary-soft transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Adres Basligi *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Ev, Is, vb."
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Ad *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Soyad *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Telefon *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="05XX XXX XX XX"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    İl *
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  >
                    <option value="" disabled>
                      Seçiniz
                    </option>
                    {TR_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    İlçe *
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => handleChange("district", e.target.value)}
                    disabled={!formData.city}
                    className={cn(
                      "w-full h-10 px-3 rounded-lg border border-border text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors",
                      formData.city ? "bg-white" : "bg-bg-primary/40 cursor-not-allowed"
                    )}
                  >
                    <option value="" disabled>
                      {formData.city ? "Seçiniz" : "Önce il seçin"}
                    </option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Mahalle
                </label>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => handleChange("neighborhood", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Adres *
                </label>
                <textarea
                  value={formData.address_line}
                  onChange={(e) => handleChange("address_line", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Posta Kodu
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => handleChange("is_default", e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-text-primary">
                  Varsayilan adres olarak ayarla
                </span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : editingId ? "Guncelle" : "Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-10 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-primary-soft transition-colors"
                >
                  Iptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address cards */}
      {addresses.length === 0 ? (
        <div className="bg-card-bg rounded-2xl border border-border p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-16 h-16 mx-auto text-border mb-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="text-text-secondary text-lg">
            Henuz kayitli adresiniz bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={cn(
                "bg-card-bg rounded-2xl border p-5 relative",
                address.is_default ? "border-primary" : "border-border"
              )}
            >
              {address.is_default && (
                <span className="absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full bg-primary-soft text-primary">
                  Varsayilan
                </span>
              )}
              <h3 className="text-sm font-bold text-text-primary mb-2">
                {address.title}
              </h3>
              <div className="text-sm text-text-secondary space-y-1">
                <p className="font-medium text-text-primary">
                  {address.first_name} {address.last_name}
                </p>
                <p>{address.address_line}</p>
                {address.neighborhood && <p>{address.neighborhood}</p>}
                <p>
                  {address.district}, {address.city}
                  {address.postal_code && ` - ${address.postal_code}`}
                </p>
                <p>{address.phone}</p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openEditForm(address)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Duzenle
                </button>
                {deleteConfirmId === address.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">Emin misiniz?</span>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Evet
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-xs font-medium text-text-secondary hover:underline"
                    >
                      Hayir
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(address.id)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
