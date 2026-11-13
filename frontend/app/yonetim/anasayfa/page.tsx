"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import {
  homeDefaults,
  parseHomeContent,
  type HomeContent,
} from "@/lib/home-content";
import { useSettings } from "@/lib/settings";
const labels: Record<string, string> = {
  seo: "SEO",
  spotlight: "Marka vitrini",
  brandSlug: "Marka slug (boş = otomatik)",
  utilityLinks: "Yardımcı menü bağlantıları",
  trackingLabel: "Sipariş takip metni",
  trackingHref: "Sipariş takip bağlantısı",
  header: "Üst menü",
  hero: "Ana slider ve avantajlar",
  sections: "Bölüm sırası ve görünürlük",
  selection: "Ürün seçkisi",
  featured: "Öne çıkan ürünler",
  inline: "Bannerlı ürünler",
  categories: "Kategori ürünleri",
  brands: "Markalar",
  promo: "Banner üst yazısı",
  footer: "Alt alan",
  pwa: "Uygulama ve bildirim teklifi",
  title: "Başlık",
  description: "Açıklama",
  enabled: "Göster",
  id: "Bölüm",
  label: "Metin",
  href: "Bağlantı",
  eyebrow: "Üst yazı",
  icon: "Simge",
  benefits: "Avantajlar",
  benefitsEnabled: "Avantajları göster",
  utilitiesEnabled: "Yardımcı üst menüyü göster",
  utilityText: "Üst menü duyurusu",
  menu: "Menü bağlantıları",
  newLabel: "Yeni ürünler sekmesi",
  bestLabel: "Çok satanlar sekmesi",
  newProductIds: "Yeni ürün ID’leri (virgülle; boş = otomatik)",
  bestProductIds: "Çok satan ürün ID’leri (virgülle; boş = otomatik)",
  productIds: "Ürün ID’leri (virgülle; boş = otomatik)",
  categoryIds: "Kategori ID’leri (virgülle; boş = tümü)",
  brandIds: "Marka ID’leri (virgülle; boş = otomatik)",
  defaultCategorySlug: "Başlangıç kategori slug",
  linkText: "Bağlantı metni",
  cardText: "Kart bağlantısı metni",
  limit: "Gösterilecek marka sayısı",
  introEnabled: "Giriş alanını göster",
  helpTitle: "İletişim başlığı",
  helpText: "İletişim bağlantı metni",
  helpHref: "İletişim bağlantısı",
  newsletterEnabled: "Bülteni göster",
  newsletterTitle: "Bülten başlığı",
  newsletterDescription: "Bülten açıklaması",
  newsletterButton: "Bülten düğmesi",
  paymentTitle: "Ödeme başlığı",
  paymentDescription: "Ödeme açıklaması",
  paymentEnabled: "Ödeme alanını göster",
  columns: "Menü kolonları",
  links: "Bağlantılar",
  legal: "Yasal bağlantılar",
  pushTitle: "Bildirim başlığı",
  pushDescription: "Bildirim açıklaması",
};
type Value = string | number | boolean | { [key: string]: Value } | Value[];
function Editor({
  value,
  onChange,
  name,
  path,
}: {
  value: Value;
  onChange: (v: Value) => void;
  name: string;
  path: string;
}) {
  const label = labels[name] || name;
  const template = path
    .split(".")
    .reduce<unknown>(
      (v, k) =>
        v && typeof v === "object"
          ? (v as Record<string, unknown>)[k]
          : undefined,
      homeDefaults,
    );
  const rowTemplate = Array.isArray(template) ? template[0] : undefined;
  if (Array.isArray(value))
    return (
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend>{label}</legend>
        {value.map((v, i) => (
          <div key={i} className="rounded border p-3">
            <Editor
              value={v}
              onChange={(next) =>
                onChange(value.map((x, n) => (n === i ? next : x)))
              }
              name={`${i + 1}`}
              path={`${path}.${i}`}
            />
            <div className="mt-2 flex gap-4">
              <button
                type="button"
                disabled={!i}
                onClick={() => {
                  const a = [...value];
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  onChange(a);
                }}
              >
                ↑ Yukarı
              </button>
              <button
                type="button"
                disabled={i === value.length - 1}
                onClick={() => {
                  const a = [...value];
                  [a[i + 1], a[i]] = [a[i], a[i + 1]];
                  onChange(a);
                }}
              >
                ↓ Aşağı
              </button>
              {name !== "sections" && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, n) => n !== i))}
                >
                  Kaldır
                </button>
              )}
            </div>
          </div>
        ))}
        {name !== "sections" && (value.length > 0 || rowTemplate) && (
          <button
            type="button"
            onClick={() =>
              onChange([
                ...value,
                structuredClone(value[0] ?? (rowTemplate as Value)),
              ])
            }
          >
            + Satır ekle
          </button>
        )}
      </fieldset>
    );
  if (value && typeof value === "object")
    return (
      <div className="space-y-3">
        {Object.entries(value).map(([k, v]) => (
          <Editor
            key={k}
            name={k}
            path={`${path}.${k}`}
            value={v}
            onChange={(next) => onChange({ ...value, [k]: next })}
          />
        ))}
      </div>
    );
  return (
    <label className="block text-sm" htmlFor={path}>
      {label}
      {typeof value === "boolean" ? (
        <input
          id={path}
          className="ml-3"
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : (
        <input
          id={path}
          className="mt-1 block w-full rounded border p-2"
          type={typeof value === "number" ? "number" : "text"}
          readOnly={name === "id"}
          value={String(value)}
          onChange={(e) =>
            onChange(
              typeof value === "number"
                ? Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
    </label>
  );
}
export default function HomeEditor() {
  const [content, setContent] = useState<HomeContent>(homeDefaults),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { reload } = useSettings();
  useEffect(() => {
    api
      .get<{ settings: Record<string, string> }>("/admin/settings")
      .then((r) =>
        setContent(parseHomeContent(r.data?.settings.homepage_content)),
      )
      .catch(() => {
        setLoadError(true);
        setMessage("Ayarlar yüklenemedi. Sayfayı yenileyin.");
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <AdminShell title="Ana sayfa içerikleri">
      <p className="mb-4">
        Metinleri düzenleyin, bölümleri gizleyin veya sıralayın. Ürün ID
        alanları boşken otomatik seçki kullanılır. Banner görselleri ve
        hedefleri{" "}
        <Link className="underline" href="/yonetim/bannerlar">
          Bannerlar
        </Link>
        ; üst şerit görseli{" "}
        <Link className="underline" href="/yonetim/ayarlar">
          Ayarlar → Genel
        </Link>{" "}
        altında yönetilir. Ürün, kategori ve marka bilgileri ilgili katalog
        ekranlarından gelir.
      </p>
      {loading ? (
        <p>Yükleniyor…</p>
      ) : loadError ? null : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await api.put("/admin/settings", {
                settings: [
                  {
                    key: "homepage_content",
                    value: JSON.stringify(content),
                    group: "homepage",
                  },
                ],
              });
              await reload();
              setMessage(
                "Kaydedildi. Ana sayfayı yenilediğinizde yeni içerik görünür.",
              );
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Kaydedilemedi");
            } finally {
              setBusy(false);
            }
          }}
          className="max-w-4xl space-y-5"
        >
          {Object.entries(content).map(([key, value]) => (
            <details key={key} className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer font-semibold">
                {labels[key] || key}
              </summary>
              <div className="mt-5">
                <Editor
                  name={key}
                  path={key}
                  value={value as Value}
                  onChange={(v) => setContent({ ...content, [key]: v })}
                />
              </div>
            </details>
          ))}
          <button
            disabled={busy}
            className="rounded bg-primary px-6 py-3 text-white"
          >
            {busy ? "Kaydediliyor…" : "İçerikleri kaydet"}
          </button>
        </form>
      )}
      <p role="status" className="mt-4">
        {message}
      </p>
    </AdminShell>
  );
}
