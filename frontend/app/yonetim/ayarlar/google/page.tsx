"use client";
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
type Config = { enabled: boolean; [key: string]: string | boolean };
type Status = {
  config: Config;
  secrets_configured: Record<string, boolean>;
  encryption_ready: boolean;
  network_enabled: boolean;
  verification: string;
  analytics_missing: string[];
  ads_missing: string[];
};
const fields = [
  ["measurement_id", "GA4 ölçüm kimliği (G-…)"],
  ["ads_id", "Google Ads etiket kimliği (AW-…)"],
  ["conversion_label", "Ads dönüşüm etiketi"],
  ["property_id", "GA4 mülk numarası"],
  ["customer_id", "Ads müşteri numarası (10 rakam)"],
  ["login_customer_id", "Yönetici hesabı numarası (isteğe bağlı)"],
  ["client_id", "OAuth istemci kimliği"],
  ["client_secret", "OAuth istemci sırrı"],
  ["refresh_token", "OAuth yenileme tokenı"],
  ["developer_token", "Ads developer token"],
];
const secrets = ["client_secret", "refresh_token", "developer_token"];
async function request(path: string, method = "GET", body?: unknown) {
  const token = localStorage.getItem("admin_token");
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/admin/google/${path}`,
    {
      method,
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "İşlem başarısız");
  return json.data;
}
export default function GoogleSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [config, setConfig] = useState<Config>({ enabled: false });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [clear, setClear] = useState(false);
  const [report, setReport] = useState("");
  async function load() {
    const s = await request("status");
    setStatus(s);
    setConfig(s.config);
  }
  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request("config", "PUT", { config, clear_secrets: clear });
      await load();
      setClear(false);
      setMessage(
        "Şifreli olarak kaydedildi. Google hesap doğrulaması bekliyor.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function read(provider: string) {
    setBusy(true);
    try {
      const data = await request(`report/${provider}`, "POST");
      setReport(JSON.stringify(data.report, null, 2));
      setMessage("Salt okunur rapor alındı.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell title="Google Analytics ve Ads">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <h2 className="text-2xl font-bold">Google Analytics ve Ads</h2>
        <p className="my-4">
          GA4 ziyaret/satış raporu ve Ads performans raporu. Reklam
          oluşturulmaz, harcama yapılmaz. OAuth erişimi için analytics.readonly
          ve adwords kapsamları gerekir; bu uygulama yalnız rapor okur.
        </p>
        <p className="my-4">
          Hesap doğrulaması bekliyor.{" "}
          {status?.network_enabled
            ? "Google API çağrıları açık."
            : "Gerçek Google API çağrıları sunucuda kapalı."}{" "}
          Lokal tarayıcıdan takip verisi gönderilmez.
        </p>
        <p role="status" className="my-4">
          {message}
        </p>
        {status && (
          <form onSubmit={save} className="grid gap-4">
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  setConfig({ ...config, enabled: e.target.checked })
                }
              />{" "}
              İzin veren ziyaretçiler için takibi etkinleştir
            </label>
            {fields.map(([key, label]) => (
              <label key={key} className="grid gap-1">
                {label}
                <input
                  type={secrets.includes(key) ? "password" : "text"}
                  autoComplete="off"
                  className="border rounded p-3"
                  value={String(config[key] || "")}
                  placeholder={
                    status.secrets_configured[key]
                      ? "Kayıtlı — boş bırakırsanız korunur"
                      : ""
                  }
                  onChange={(e) =>
                    setConfig({ ...config, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={clear}
                onChange={(e) => setClear(e.target.checked)}
              />{" "}
              Kaydederken önceki sırları sil (yeniden girilmeyenler kaldırılır)
            </label>
            {!status.encryption_ready && (
              <p>
                Sunucu yöneticisi GOOGLE_CONFIG_KEY tanımlamalı. Sırlar sohbet
                veya istemci ortam dosyasına yazılmamalı.
              </p>
            )}
            <button
              disabled={busy || !status.encryption_ready}
              className="rounded bg-violet-700 text-white p-3 disabled:opacity-50"
            >
              {busy ? "İşleniyor…" : "Şifreli kaydet"}
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || !status.network_enabled}
                onClick={() => read("analytics")}
                className="border rounded p-3 disabled:opacity-50"
              >
                GA4 raporunu doğrula
              </button>
              <button
                type="button"
                disabled={busy || !status.network_enabled}
                onClick={() => read("ads")}
                className="border rounded p-3 disabled:opacity-50"
              >
                Ads raporunu doğrula
              </button>
            </div>
          </form>
        )}
        {report && (
          <pre className="overflow-auto p-4 bg-gray-100 mt-4">{report}</pre>
        )}
      </div>
    </AdminShell>
  );
}
