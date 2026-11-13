"use client";
import { useEffect, useState } from "react";
import NotificationCampaigns from "@/components/admin/NotificationCampaigns";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import { pushDevice, pushConfig, enablePush } from "@/lib/push";
type Status = {
  configured: boolean;
  network_enabled: boolean;
  credential_present: boolean;
  storage_ready: boolean;
  active_devices: number;
  verification: string;
};
export default function Notifications() {
  const [status, setStatus] = useState<Status | null>(null),
    [title, setTitle] = useState("İstanbul Vitamin"),
    [body, setBody] = useState("Bildirimleriniz hazır."),
    [path, setPath] = useState("/"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .get<Status>("/admin/push/status")
      .then((r) => setStatus(r.data ?? null))
      .catch((e) => setMessage(e.message));
  }, []);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "İşlem tamamlanamadı");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell title="Firebase bildirimleri">
      <div className="max-w-2xl space-y-5">
        <p>
          Firebase projesi oluşturulduğunda sunucudaki proje, Web App, VAPID ve
          servis hesabı bilgileri bağlanacak. Özel servis hesabı anahtarı
          tarayıcıya veya genel ayarlara kaydedilmez.
        </p>
        {status && (
          <dl className="rounded border bg-white p-5">
            {[
              ["Proje ayarları", status.configured],
              ["Gönderim izni", status.network_enabled],
              ["Servis hesabı dosyası", status.credential_present],
              ["Abonelik tablosu", status.storage_ready],
            ].map(([name, ok]) => (
              <div key={String(name)} className="flex justify-between py-2">
                <dt>{name}</dt>
                <dd>{ok ? "Hazır" : "Bekliyor"}</dd>
              </div>
            ))}
            <div>Aktif cihaz: {status.active_devices}</div>
            <p className="mt-3">{status.verification}</p>
          </dl>
        )}
        <button
          disabled={busy || !status?.configured}
          className="rounded border p-3 disabled:opacity-50"
          onClick={() =>
            action(async () => {
              const cfg = await pushConfig();
              if (!cfg?.enabled) throw new Error("Proje ayarları eksik");
              await enablePush(cfg);
              setMessage(
                "Bu tarayıcı kaydedildi. Test bildirimi gönderebilirsiniz.",
              );
            })
          }
        >
          Bu tarayıcıda bildirimleri aç
        </button>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await api.post("/admin/push/test", {
                device: pushDevice(),
                title,
                body,
                path,
              });
              setMessage(
                "Firebase bildirimi kabul etti. Cihazda teslimi kontrol edin.",
              );
            });
          }}
        >
          <h2 className="font-semibold">Yalnız bu tarayıcıya test bildirimi</h2>
          <label className="block">
            Başlık
            <input
              required
              maxLength={100}
              className="block w-full rounded border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            Metin
            <textarea
              maxLength={300}
              className="block w-full rounded border p-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label className="block">
            Site içi bağlantı
            <input
              required
              className="block w-full rounded border p-2"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
          </label>
          <button
            disabled={
              busy ||
              !status?.configured ||
              !status.network_enabled ||
              !status.credential_present ||
              !status.storage_ready
            }
            className="rounded bg-primary px-5 py-3 text-white disabled:opacity-50"
          >
            Test bildirimi gönder
          </button>
        </form>
        <p role="status">{message}</p>
        <NotificationCampaigns/>
      </div>
    </AdminShell>
  );
}
