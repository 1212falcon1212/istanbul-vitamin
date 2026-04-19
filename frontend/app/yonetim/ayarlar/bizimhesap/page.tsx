"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/api";

interface SettingsMap {
  [key: string]: string;
}

interface TestResult {
  ok: boolean;
  message: string;
  error?: string;
  guid?: string;
  url?: string;
}

export default function BizimhesapSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [enabled, setEnabled] = useState(false);
  const [firmId, setFirmId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultTaxRate, setDefaultTaxRate] = useState("20");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get<{ settings: SettingsMap }>("/settings");
      const map = res.data?.settings ?? {};
      setEnabled(String(map["bizimhesap.enabled"] ?? "").toLowerCase() === "true");
      setFirmId(map["bizimhesap.firm_id"] ?? "");
      setBaseUrl(map["bizimhesap.base_url"] ?? "");
      setDefaultTaxRate(map["bizimhesap.default_tax_rate"] ?? "20");
    } catch {
      setLoadError("Ayarlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.put("/admin/settings", {
        settings: [
          { key: "bizimhesap.enabled", value: enabled ? "true" : "false", group: "bizimhesap" },
          { key: "bizimhesap.firm_id", value: firmId.trim(), group: "bizimhesap" },
          { key: "bizimhesap.base_url", value: baseUrl.trim(), group: "bizimhesap" },
          { key: "bizimhesap.default_tax_rate", value: defaultTaxRate.trim() || "20", group: "bizimhesap" },
        ],
      });
      setSaveMsg({ kind: "success", text: "Ayarlar kaydedildi." });
    } catch (err) {
      setSaveMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Ayarlar kaydedilemedi.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post<TestResult>("/admin/settings/bizimhesap/test", {
        firm_id: firmId.trim(),
        base_url: baseUrl.trim(),
      });
      setTestResult(res.data ?? { ok: false, message: "Yanıt alınamadı." });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Test başarısız.",
      });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Bizimhesap API Ayarları">
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Bizimhesap API Ayarları">
      <div className="max-w-2xl space-y-6">
        {loadError && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{loadError}</div>
        )}

        <form
          onSubmit={handleSave}
          className="bg-card-bg rounded-2xl border border-border p-6 space-y-5"
        >
          {/* Enabled toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-text-primary">Entegrasyon Aktif</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Kapalıyken sipariş kargolandığında fatura oluşturulmaz.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                enabled ? "bg-primary" : "bg-gray-200"
              }`}
              aria-pressed={enabled}
              aria-label="Entegrasyonu aç/kapat"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Firm ID
            </label>
            <input
              type="text"
              value={firmId}
              onChange={(e) => setFirmId(e.target.value)}
              placeholder="Bizimhesap panelinden alınan firmId"
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              API Base URL
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://bizimhesap.com/api/b2b"
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-text-secondary mt-1">
              Boş bırakılırsa varsayılan <code className="text-primary">https://bizimhesap.com/api/b2b</code> kullanılır.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Varsayılan KDV Oranı (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={defaultTaxRate}
              onChange={(e) => setDefaultTaxRate(e.target.value)}
              className="w-32 h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-text-secondary mt-1">
              Ürün bazlı KDV oranı yoksa fatura kalemlerinde bu oran kullanılır.
            </p>
          </div>

          {saveMsg && (
            <div
              className={`rounded-lg p-3 text-sm ${
                saveMsg.kind === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {saveMsg.text}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !firmId.trim()}
              className="h-10 px-5 border border-border text-text-primary rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {testing ? "Test ediliyor..." : "Bağlantıyı Test Et"}
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              testResult.ok
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <p className="font-medium">{testResult.ok ? "Başarılı" : "Başarısız"}</p>
            <p className="mt-1">{testResult.message}</p>
            {testResult.error && (
              <p className="mt-1 text-xs opacity-80">Detay: {testResult.error}</p>
            )}
            {testResult.guid && (
              <p className="mt-1 text-xs opacity-80">
                GUID: <code>{testResult.guid}</code>
              </p>
            )}
          </div>
        )}

        <div className="bg-bg-primary rounded-xl p-4 text-xs text-text-secondary space-y-1">
          <p className="font-medium text-text-primary">Nasıl çalışır?</p>
          <p>• Entegrasyon açık ve firmId tanımlıyken, sipariş kargolandığında Bizimhesap'a satış faturası otomatik oluşturulur.</p>
          <p>• Fatura URL'si müşteriye ve admin paneline kaydedilir.</p>
          <p>• Hatalı faturalar için retry kuyruğu saatlik yeniden dener; admin panelinden manuel tetik de mümkündür.</p>
        </div>
      </div>
    </AdminShell>
  );
}
