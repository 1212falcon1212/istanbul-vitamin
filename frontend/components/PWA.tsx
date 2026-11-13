"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useHomeContent } from "@/lib/use-home-content";
import {
  pushConfig,
  enablePush,
  disablePush,
  refreshPush,
  type PushConfig,
} from "@/lib/push";
import { toast } from "sonner";
type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function PWA() {
  const c = useHomeContent().pwa,
    path = usePathname();
  const [install, setInstall] = useState<InstallEvent | null>(null),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [open, setOpen] = useState(false),
    [standalone, setStandalone] = useState(false),
    [guide, setGuide] = useState(false),
    [config, setConfig] = useState<PushConfig | null>(null),
    [subscribed, setSubscribed] = useState(false),
    [busy, setBusy] = useState(false),
    [marketing,setMarketing] = useState(false),
    [message, setMessage] = useState("");
  const sensitive = /^\/(odeme|sepet|hesabim|yonetim|giris-yap|kayit-ol)/.test(
    path,
  );
  useEffect(() => {
    const isApp =
      matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(isApp);
    try {
      setOpen(!isApp && !localStorage.getItem("iv-pwa-dismissed-v1"));
      setSubscribed(localStorage.getItem("iv-push-enabled") === "1");
      setMarketing(localStorage.getItem("iv-push-marketing") === "1");
    } catch {
      setOpen(!isApp);
    }
    const offer = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    const installed = () => {
      setInstall(null);
      setStandalone(true);
      setOpen(false);
    };
    const reopen = () => setOpen(true);
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("iv-pwa-settings", reopen);
    const foreground = (e: MessageEvent) => {
      if (e.data?.type === "IV_PUSH")
        toast(e.data.title, { description: e.data.body });
    };
    navigator.serviceWorker?.addEventListener("message", foreground);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          if (reg.waiting) setWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setWaiting(reg.waiting);
            });
          });
          void reg.update().catch(() => {});
        })
        .catch(() =>
          setMessage("Uygulama şu an kurulamadı. Lütfen tekrar deneyin."),
        );
    void pushConfig().then((cfg) => {
      setConfig(cfg);
      if (cfg?.enabled) void refreshPush(cfg).catch(() => {});
    });
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("iv-pwa-settings", reopen);
      navigator.serviceWorker?.removeEventListener("message", foreground);
    };
  }, []);
  function close() {
    setOpen(false);
    setWaiting(null);
    try {
      localStorage.setItem("iv-pwa-dismissed-v1", "1");
    } catch {}
  }
  if (sensitive || (!waiting && (!c.enabled || !open))) return null;
  return (
    <aside className="pwa-notice" aria-label="Uygulama ve bildirimler">
      <div>
        <h2>{waiting ? "Yeni sürüm hazır." : c.title}</h2>
        {!waiting && !standalone && <p>{c.description}</p>}
        {config?.enabled && !waiting && (
          <p>
            {c.pushTitle} {c.pushDescription}
          </p>
        )}
        {config?.enabled && !waiting && <label><input type="checkbox" checked={marketing} disabled={busy} onChange={async e=>{const value=e.target.checked;setBusy(true);try {localStorage.setItem("iv-push-marketing",value?"1":"0");if(subscribed) await refreshPush(config);setMarketing(value);}catch{localStorage.setItem("iv-push-marketing",marketing?"1":"0");setMessage("Tercih kaydedilemedi. Tekrar deneyin.");}finally{setBusy(false);}}}/> Kampanya ve fırsat bildirimleri de almak istiyorum.</label>}
        <div className="pwa-actions">
          {waiting ? (
            <button
              onClick={() => {
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  () => location.reload(),
                  { once: true },
                );
                waiting.postMessage({ type: "ACTIVATE_UPDATE" });
              }}
            >
              Güncelle
            </button>
          ) : (
            <>
              {!standalone && (
                <button
                  onClick={async () => {
                    if (install) {
                      await install.prompt();
                      const result = await install.userChoice;
                      if (result.outcome === "accepted") close();
                      setInstall(null);
                    } else setGuide(true);
                  }}
                >
                  Ana ekrana ekle
                </button>
              )}
              {config?.enabled && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setMessage("");
                    try {
                      if (subscribed) await disablePush(config);
                      else await enablePush(config);
                      setSubscribed(!subscribed);
                      setMessage(
                        subscribed
                          ? "Bildirimler kapatıldı."
                          : "Bildirimler açıldı.",
                      );
                    } catch (e) {
                      setMessage(
                        e instanceof Error
                          ? e.message
                          : "Bildirim ayarı değiştirilemedi.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy
                    ? "İşleniyor…"
                    : subscribed
                      ? "Bildirimleri kapat"
                      : "Bildirimleri aç"}
                </button>
              )}
            </>
          )}
          <button onClick={close}>Daha sonra</button>
        </div>
        {guide && (
          <p>
            iPhone/iPad: Safari’de Paylaş → Ana Ekrana Ekle. Diğer tarayıcılarda
            menüden “Uygulamayı yükle” veya “Ana ekrana ekle” seçeneğini
            kullanın. Seçenek yoksa siteyi tarayıcıdan kullanabilirsiniz.
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    </aside>
  );
}
