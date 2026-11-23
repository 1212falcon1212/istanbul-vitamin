"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useSettings } from "@/lib/settings";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function uploadSettingsImage(file: File, purpose?: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  if (purpose) fd.append("purpose", purpose);
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

interface SettingField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "email" | "url" | "image" | "checkbox" | "password" | "select";
  hint?: string;
  readOnly?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Backend'e iletilen upload "purpose" — örn. "favicon" ise 64×64'e resize edilir. */
  uploadPurpose?: string;
}

interface SettingTabAction {
  label: string;
  endpoint: string;
  method?: "GET" | "POST";
  /** "Bu işlem yapılabilir mi" — değerlerin gerekliliğini check eder. */
  requireKeys?: string[];
  successMessage?: string;
  /** Cevaptan döndürülen değerleri belirli key'lere bağla (ör. sender_address_id) */
  resultMap?: Record<string, string>;
  /** Onay sorulsun mu? */
  confirm?: string;
}

const tabs: { id: string; label: string; fields: SettingField[]; actions?: SettingTabAction[] }[] = [
  {
    id: "genel",
    label: "Genel",
    fields: [
      { key: "site_name", label: "Site Adı", type: "text" },
      { key: "site_description", label: "Site Açıklaması", type: "textarea", hint: "Footer'da ve meta bilgilerinde kullanılır." },
      { key: "top_header_enabled", label: "Üst Duyuru Aktif", type: "checkbox" },
      { key: "top_header_mode", label: "Üst şerit türü", type: "select", options: [{value:"text",label:"Metin duyurusu"},{value:"image",label:"Görsel banner"}] },
      { key: "top_header_image", label: "Üst şerit masaüstü görseli", type: "image", hint: "Öneri: 2880 × 160 px. Görsel banner türü seçildiğinde metnin yerine gösterilir." },
      { key: "top_header_image_mobile", label: "Üst şerit mobil görseli", type: "image", hint: "Öneri: 780 × 160 px. Boşsa masaüstü görseli kullanılır." },
      { key: "top_header_image_alt", label: "Üst şerit görsel açıklaması", type: "text" },
      { key: "top_header_text", label: "Üst Duyuru Metni", type: "text", hint: "Sitenin en üstündeki duyuru alanında gösterilir." },
      { key: "top_header_link", label: "Üst Duyuru Linki", type: "url", hint: "Opsiyonel. Boşsa duyuru tıklanamaz." },
    ],
  },
  {
    id: "marka",
    label: "Marka & Logo",
    fields: [
      { key: "site_logo_url", label: "Logo (Açık Arkaplan)", type: "image", hint: "Header ve koyu arkaplanlar dışında kullanılır. PNG önerilir, max 10 MB." },
      { key: "site_logo_url_dark", label: "Logo (Koyu Arkaplan)", type: "image", hint: "Footer gibi koyu bölgeler için beyaz logo (opsiyonel — boşsa Açık logo kullanılır)." },
      { key: "site_favicon_url", label: "Favicon", type: "image", uploadPurpose: "favicon", hint: "Tarayıcı sekmesinde görünen ikon. Her boyutta yükleyebilirsiniz; otomatik olarak 64×64 PNG'ye küçültülür." },
    ],
  },
  {
    id: "iletisim",
    label: "Iletisim",
    fields: [
      { key: "phone", label: "Telefon", type: "text", hint: "Aras Kargo gönderici tel — 10 hane TR formatı" },
      { key: "email", label: "E-posta", type: "email" },
      { key: "address", label: "Adres", type: "textarea" },
      { key: "city", label: "Şehir", type: "text", hint: "Aras Kargo gönderici şehir (örn. İSTANBUL)" },
      { key: "town", label: "İlçe", type: "text", hint: "Aras Kargo gönderici ilçe (örn. BEYKOZ)" },
      { key: "sender_name", label: "Gönderici Adı", type: "text", hint: "Aras etiketinde firma adı (boşsa Site Adı)" },
      { key: "whatsapp_number", label: "WhatsApp Numarasi", type: "text" },
    ],
  },
  {
    id: "sosyal_medya",
    label: "Sosyal Medya",
    fields: [
      { key: "instagram", label: "Instagram", type: "url" },
      { key: "facebook", label: "Facebook", type: "url" },
      { key: "twitter", label: "Twitter", type: "url" },
      { key: "youtube", label: "YouTube", type: "url" },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    fields: [
      { key: "meta_title", label: "Meta Baslik", type: "text" },
      { key: "meta_description", label: "Meta Aciklama", type: "textarea" },
      { key: "google_analytics_id", label: "Google Analytics ID", type: "text" },
    ],
  },
  {
    id: "google_login",
    label: "Google ile Giriş",
    fields: [{key:"google_login_client_id", label:"Google Web OAuth Client ID", type:"text", hint:"Google Cloud → Google Auth Platform → Clients. Authorized JavaScript origins alanına sitenin adresini ekleyin. Boş bırakılırsa Google girişi kapalıdır."}],
  },
  {
    id: "havale",
    label: "Havale / EFT",
    fields: [
      { key: "bank_transfer_enabled", label: "Havale ile ödeme aktif", type: "checkbox" },
      { key: "bank_transfer_bank", label: "Banka adı", type: "text" },
      { key: "bank_transfer_holder", label: "Hesap sahibi / Firma unvanı", type: "text" },
      { key: "bank_transfer_iban", label: "IBAN", type: "text", hint: "TR ile başlayan 26 karakterlik IBAN." },
      { key: "bank_transfer_note", label: "Ödeme açıklaması", type: "textarea" },
    ],
  },
  {
    id: "shipping",
    label: "Kargo Ücreti",
    fields: [
      { key: "min_free_shipping", label: "Ucretsiz Kargo Min. Tutar (TL)", type: "number" },
      { key: "default_cargo_fee", label: "Varsayilan Kargo Ucreti (TL)", type: "number" },
    ],
  },
  {
    id: "aras_kargo",
    label: "Aras Kargo",
    fields: [
      { key: "aras.enabled", label: "Aktif", type: "checkbox", hint: "Tüm Aras Kargo akışını aç/kapat" },
      { key: "aras.test_mode", label: "Test Ortamı", type: "checkbox", hint: "Açıkken test sandbox URL'i kullanılır" },
      { key: "aras.username", label: "Gönderi servisi kullanıcı adı", type: "text" },
      { key: "aras.password", label: "Gönderi servisi şifresi", type: "password", placeholder: "••••••••", hint: "Boş bırakılırsa mevcut değer korunur" },
      { key: "aras.customer_code", label: "Sorgulama Müşteri Kodu", type: "text" },
      { key: "aras.query_username", label: "Sorgulama Kullanıcı Adı", type: "text", hint: "Sorgulama hesabı farklıysa kullanıcı adı ve şifreyi birlikte girin; sorgulama kullanıcı adı boşsa gönderi hesabı kullanılır." },
      { key: "aras.query_password", label: "Sorgulama Şifresi", type: "password", placeholder: "••••••••", hint: "Boş bırakılırsa kayıtlı şifre korunur." },
      {
        key: "aras.payor_type_code",
        label: "Ödeme Tipi",
        type: "select",
        options: [
          { value: "1", label: "Gönderen Öder" },
          { value: "2", label: "Alıcı Öder" },
        ],
      },
      { key: "aras.parcel_kg_limit", label: "Parça Başı Maks. Kg", type: "number", hint: "Toplam ağırlığa göre parça sayısı bu limite göre hesaplanır" },
      { key: "aras.sender_address_id", label: "Sevk Adresi ID", type: "text", hint: "Aras tarafından verilen aktif sevk adresi ID'si; adres kaydıyla da doldurulabilir." },
    ],
    actions: [
      {
        label: "Gönderici Bağlantısını Test Et",
        endpoint: "/admin/settings/aras/test",
        method: "POST",
        requireKeys: ["aras.username", "aras.sender_address_id"],
        successMessage: "Aras Kargo bağlantısı başarılı",
      },
      {
        label: "Sorgulama Servisini Test Et",
        endpoint: "/admin/settings/aras/test-query",
        method: "POST",
        requireKeys: ["aras.customer_code"],
        successMessage: "Sorgu gönderildi",
      },
      {
        confirm: "Seçili Aras ortamında İletişim sekmesindeki depo bilgileriyle adres kaydı oluşturulsun mu?",
        label: "Gönderici Adresimi Aras'a Kaydet",
        endpoint: "/admin/aras/sender-address/register",
        method: "POST",
        successMessage: "Gönderici adresi Aras'a kaydedildi",
        resultMap: { sender_address_id: "aras.sender_address_id" },
      },
    ],
  },
  {
    id: "odeme",
    label: "Odeme",
    fields: [
      { key: "payment_gateway", label: "Odeme Altyapisi", type: "text" },
      { key: "installment_rates", label: "Taksit Oranlari", type: "textarea" },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { reload: reloadSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("genel");
  const [values, setValues] = useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentTab = tabs.find((t) => t.id === activeTab);

  const arasDirty = activeTab === "aras_kargo" && currentTab?.fields.some((f) => (values[f.key] ?? "") !== (savedValues[f.key] ?? ""));
  useEffect(() => {
    const readTab = () => {
      const tab = window.location.hash.slice(1);
      if (tabs.some(t => t.id === tab)) setActiveTab(tab);
    };
    readTab();
    window.addEventListener("hashchange", readTab);
    return () => window.removeEventListener("hashchange", readTab);
  }, []);

  const fetchSettings = useCallback(async (group: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{settings: Record<string,string>}>("/admin/settings");
      setValues(res.data?.settings ?? {});
      setSavedValues(res.data?.settings ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayarlar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings(activeTab);
  }, [activeTab, fetchSettings]);

  async function handleSave() {
    if (!currentTab || loading || error) return;
    setSaving(true);
    setSaveSuccess(false);
    setError("");
    try {
      const payload = currentTab.fields.map((f) => ({
        key: f.key,
        value: values[f.key] ?? "",
        group: activeTab,
      }));
      await api.put("/admin/settings", { settings: payload });
      await fetchSettings(activeTab);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Marka/logo değişimi header + footer'a yansısın.
      reloadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminShell title="Ayarlar"><div className="mb-5 flex gap-5"><a href="/yonetim/anasayfa" className="underline">Ana sayfa içerikleri</a><a href="/yonetim/bildirimler" className="underline">Firebase bildirimleri</a></div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { window.location.hash = tab.id; setActiveTab(tab.id); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-primary-soft hover:text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 mb-4">
          <p>{error}</p>
          <button onClick={() => fetchSettings(activeTab)} className="mt-2 text-sm underline">Tekrar Dene</button>
        </div>
      )}

      {!loading && currentTab && (
        <div className="bg-card-bg rounded-xl border border-border p-6 max-w-2xl">
          {activeTab === "aras_kargo" && <p className="mb-5 text-sm text-text-secondary">Aras’ın seçili ortam için verdiği web servis bilgilerini girip kaydedin. Gönderici testi sevk adresini doğrular. Depo adı, adresi ve telefonu İletişim sekmesindedir.</p>}
          <div className="space-y-4">
            {currentTab.fields.map((field) => (
              <div key={field.key}>
                {field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(values[field.key] ?? "false") === "true"}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.checked ? "true" : "false",
                        }))
                      }
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>{field.label}</span>
                  </label>
                ) : (
                  <label htmlFor={`setting-${field.key}`} className="block text-sm text-text-secondary mb-1">
                    {field.label}
                  </label>
                )}

                {field.type === "textarea" ? (
                  <textarea
                    id={`setting-${field.key}`}
                    className={inputCls}
                    rows={3}
                    value={values[field.key] ?? ""}
                    readOnly={field.readOnly}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : field.type === "image" ? (
                  <ImageSettingField
                    id={`setting-${field.key}`}
                    value={values[field.key] ?? ""}
                    purpose={field.uploadPurpose}
                    onChange={(v) =>
                      setValues((prev) => ({ ...prev, [field.key]: v }))
                    }
                  />
                ) : field.type === "select" ? (
                  <select
                    id={`setting-${field.key}`}
                    className={inputCls}
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  >
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "password" ? (
                  <input
                    id={`setting-${field.key}`}
                    type="password"
                    className={inputCls}
                    value={values[field.key] === "********" ? "" : values[field.key] ?? ""}
                    placeholder={field.placeholder ?? "••••••••"}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : field.type === "checkbox" ? null : (
                  <input
                    id={`setting-${field.key}`}
                    type={field.type}
                    className={cn(inputCls, field.readOnly && "bg-gray-50 text-text-secondary")}
                    readOnly={field.readOnly}
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
                {field.hint && (
                  <p className="text-[11px] text-text-secondary mt-1">{field.hint}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving || loading || !!error}
              className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {saveSuccess && (
              <span className="text-sm text-green-600">Basariyla kaydedildi.</span>
            )}
          </div>

          {currentTab.actions && currentTab.actions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border flex flex-col gap-3 max-w-md">
              {arasDirty && <p className="text-xs text-text-secondary">Testten önce değişiklikleri kaydedin.</p>}
              {currentTab.actions.map((action) => (
                <TabAction
                  key={action.endpoint + action.label}
                  disabled={Boolean(arasDirty || saving)}
                  action={action}
                  values={values}
                  onResult={(updates) => { setValues((prev) => ({ ...prev, ...updates })); setSavedValues((prev) => ({ ...prev, ...updates })); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}

function TabAction({
  disabled,
  action,
  values,
  onResult,
}: {
  disabled: boolean;
  action: SettingTabAction;
  values: Record<string, string>;
  onResult: (updates: Record<string, string>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function run() {
    if (busy) return;
    if (action.confirm && !window.confirm(action.confirm)) return;
    if (action.requireKeys) {
      for (const k of action.requireKeys) {
        if (!values[k] || values[k] === "********") {
          setMsg({ kind: "error", text: "Zorunlu alanlar eksik. Önce kaydet, sonra tekrar dene." });
          return;
        }
      }
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post<Record<string, unknown>>(action.endpoint, {});
      const data = (res.data ?? {}) as Record<string, unknown>;
      if (action.resultMap) {
        const updates: Record<string, string> = {};
        Object.entries(action.resultMap).forEach(([resultKey, settingKey]) => {
          const v = data[resultKey];
          if (typeof v === "string" && v) updates[settingKey] = v;
        });
        if (Object.keys(updates).length > 0) onResult(updates);
      }
      setMsg({ kind: "success", text: typeof data.message === "string" ? data.message : action.successMessage ?? "Tamamlandı" });
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "İşlem başarısız",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={busy || disabled}
        className="w-full h-10 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
      >
        {busy ? "İşleniyor…" : action.label}
      </button>
      {msg && (
        <p
          className={cn(
            "mt-2 text-xs",
            msg.kind === "success" ? "text-green-600" : "text-red-600"
          )}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

function ImageSettingField({
  id,
  value,
  onChange,
  purpose,
}: {
  value: string;
  onChange: (v: string) => void;
  purpose?: string;
  id: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadSettingsImage(file, purpose);
      if (url) onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="w-24 h-24 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(value)}
              alt="Önizleme"
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <input
            id={id}
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
