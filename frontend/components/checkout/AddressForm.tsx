"use client";

import { useMemo, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
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
}

export type AddressFormSubmit = AddressFormData & { save_info: boolean };

interface AddressFormProps {
  onSubmit: (data: AddressFormSubmit) => void;
  defaultValues?: Partial<AddressFormData>;
  submitLabel?: string;
  /** Alt eylem linki (örn. Sepete geri dön). */
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
}

export default function AddressForm({
  onSubmit,
  defaultValues,
  submitLabel = "Devam Et",
  backLabel = "Sepete geri dön",
  backHref,
  onBack,
}: AddressFormProps) {
  const [form, setForm] = useState<AddressFormData>({
    title: defaultValues?.title || "Ev",
    first_name: defaultValues?.first_name || "",
    last_name: defaultValues?.last_name || "",
    phone: defaultValues?.phone || "",
    city: defaultValues?.city || "",
    district: defaultValues?.district || "",
    neighborhood: defaultValues?.neighborhood || "",
    address_line: defaultValues?.address_line || "",
    postal_code: defaultValues?.postal_code || "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});
  const [saveInfo, setSaveInfo] = useState(true);

  const districtOptions = useMemo(() => {
    if (!form.city) return [] as string[];
    return TR_DISTRICTS[form.city] ?? [];
  }, [form.city]);

  function validate(): boolean {
    const e: Partial<Record<keyof AddressFormData, string>> = {};
    if (!form.first_name.trim()) e.first_name = "Ad zorunlu";
    if (!form.last_name.trim()) e.last_name = "Soyad zorunlu";
    if (!form.phone.trim()) e.phone = "Telefon zorunlu";
    if (!form.city) e.city = "Şehir seçin";
    if (!form.district) e.district = "İlçe seçin";
    if (!form.address_line.trim()) e.address_line = "Adres zorunlu";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange<K extends keyof AddressFormData>(field: K, value: AddressFormData[K]) {
    setForm((p) => {
      const next = { ...p, [field]: value };
      // Şehir değişince ilçeyi sıfırla (farklı şehrin ilçesi geçerli olmaz).
      if (field === "city" && p.city !== value) {
        next.district = "";
      }
      return next;
    });
    if (errors[field]) {
      setErrors((p) => {
        const n = { ...p };
        delete n[field];
        return n;
      });
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit({ ...form, save_info: saveInfo });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Şehir */}
      <FloatingSelect
        label="Şehir"
        value={form.city}
        onChange={(v) => handleChange("city", v)}
        options={TR_CITIES}
        error={errors.city}
        placeholder="Seçiniz"
      />

      {/* İlçe */}
      <FloatingSelect
        label="İlçe"
        value={form.district}
        onChange={(v) => handleChange("district", v)}
        options={districtOptions}
        error={errors.district}
        placeholder={form.city ? "Seçiniz" : "Önce şehir seçin"}
        disabled={!form.city}
      />

      {/* Mahalle */}
      <FloatingInput
        label="Mahalle"
        value={form.neighborhood}
        onChange={(v) => handleChange("neighborhood", v)}
      />

      {/* Ülke/Bölge */}
      <FloatingInput
        label="Ülke/Bölge"
        value="Türkiye"
        readOnly
        onChange={() => {}}
      />

      {/* Ad / Soyad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FloatingInput
          label="Ad"
          value={form.first_name}
          onChange={(v) => handleChange("first_name", v)}
          error={errors.first_name}
        />
        <FloatingInput
          label="Soyadı"
          value={form.last_name}
          onChange={(v) => handleChange("last_name", v)}
          error={errors.last_name}
        />
      </div>

      {/* Adres */}
      <FloatingInput
        label="Adres"
        value={form.address_line}
        onChange={(v) => handleChange("address_line", v)}
        error={errors.address_line}
      />

      {/* Posta / Şehir (ikinci) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FloatingInput
          label="Posta Kodu ( Zorunlu Değil )"
          value={form.postal_code}
          onChange={(v) => handleChange("postal_code", v)}
        />
        <FloatingInput
          label="Şehir"
          value={form.city}
          onChange={(v) => handleChange("city", v)}
          readOnly
        />
      </div>

      {/* Telefon */}
      <FloatingInput
        label="Telefon"
        value={form.phone}
        onChange={(v) => handleChange("phone", v)}
        error={errors.phone}
        placeholder="0554 510 24 06"
        type="tel"
        trailing={
          <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <span className="w-5 h-3.5 rounded-sm overflow-hidden inline-block">
              <svg viewBox="0 0 3 2" width="20" height="14" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect width="3" height="2" fill="#e30a17" />
                <circle cx="1.2" cy="1" r="0.35" fill="#fff" />
                <circle cx="1.28" cy="1" r="0.28" fill="#e30a17" />
                <path
                  d="M1.5 0.85 L1.55 1 L1.72 1 L1.58 1.08 L1.62 1.22 L1.5 1.14 L1.38 1.22 L1.42 1.08 L1.28 1 L1.45 1 Z"
                  fill="#fff"
                />
              </svg>
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        }
      />

      {/* Save info */}
      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none pt-2">
        <input
          type="checkbox"
          checked={saveInfo}
          onChange={(e) => setSaveInfo(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        Bir sonraki işlem için bu bilgileri kaydet
      </label>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {backLabel}
          </button>
        ) : backHref ? (
          <a
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {backLabel}
          </a>
        ) : (
          <span />
        )}
        <button
          type="submit"
          className="h-12 px-10 bg-text-primary text-white rounded-xl font-semibold hover:bg-black/90 transition"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ---------- Floating label primitives ---------- */

interface FloatingBaseProps {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  readOnly?: boolean;
}

function FloatingInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  readOnly,
  type = "text",
  trailing,
}: FloatingBaseProps & {
  onChange: (v: string) => void;
  type?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn(
          "relative h-14 rounded-xl border bg-white transition",
          error
            ? "border-accent-rose"
            : "border-border focus-within:border-text-primary"
        )}
      >
        <label className="absolute left-4 top-2 text-[11px] uppercase tracking-wide text-text-secondary pointer-events-none">
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            "absolute inset-0 bg-transparent pl-4 pr-14 pt-6 pb-2 rounded-xl text-sm text-text-primary focus:outline-none",
            readOnly && "cursor-default"
          )}
        />
        {trailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-accent-rose px-1">{error}</p>}
    </div>
  );
}

function FloatingSelect({
  label,
  value,
  onChange,
  options,
  error,
  placeholder,
  disabled,
}: FloatingBaseProps & {
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "relative h-14 rounded-xl border transition",
          disabled
            ? "bg-bg-primary/40 border-border"
            : "bg-white",
          error
            ? "border-accent-rose"
            : "border-border focus-within:border-text-primary"
        )}
      >
        <label className="absolute left-4 top-2 text-[11px] uppercase tracking-wide text-text-secondary pointer-events-none">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "absolute inset-0 appearance-none bg-transparent pl-4 pr-10 pt-6 pb-2 rounded-xl text-sm text-text-primary focus:outline-none",
            disabled ? "cursor-not-allowed text-text-secondary" : "cursor-pointer"
          )}
        >
          <option value="" disabled>
            {placeholder ?? "Seçiniz"}
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          fill="none"
        >
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error && <p className="mt-1 text-xs text-accent-rose px-1">{error}</p>}
    </div>
  );
}
