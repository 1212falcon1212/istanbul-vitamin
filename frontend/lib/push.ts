import { api } from "./api";
export type PushConfig = {
  enabled: boolean;
  apiKey: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  vapidKey: string;
};
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
export function pushDevice(create = false): string {
  let id = localStorage.getItem("iv-push-device") || "";
  if (!id && create) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem("iv-push-device", id);
  }
  return id;
}
export async function pushConfig(): Promise<PushConfig | null> {
  try {
    const r = await fetch(`${API}/push/config`, { cache: "no-store" });
    return r.ok ? (await r.json()).data : null;
  } catch {
    return null;
  }
}
async function messaging(config: PushConfig) {
  const [{ initializeApp, getApps }, { getMessaging, isSupported }] =
    await Promise.all([import("@firebase/app"), import("@firebase/messaging")]);
  if (!(await isSupported()))
    throw new Error(
      "Bu tarayıcıda bildirim desteklenmiyor. iPhone/iPad’de önce ana ekrana ekleyip uygulamayı açın.",
    );
  return getMessaging(
    getApps().find((a) => a.name === "iv-push") ||
      initializeApp(config, "iv-push"),
  );
}
async function register(config: PushConfig) {
  const m = await messaging(config);
  const { getToken } = await import("@firebase/messaging");
  await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(m, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });
  await api.post("/push/subscribe", {device: pushDevice(true), token, marketing:localStorage.getItem("iv-push-marketing")==="1"});
  localStorage.setItem("iv-push-enabled", "1");
}
export async function enablePush(config: PushConfig) {
  if (!config.enabled) throw new Error("Bildirimler henüz kullanılamıyor.");
  if (!("Notification" in window))
    throw new Error("Bu tarayıcıda bildirim desteklenmiyor.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      permission === "denied"
        ? "Bildirim izni kapalı. Tarayıcı site ayarlarından değiştirebilirsiniz."
        : "Bildirim izni verilmedi.",
    );
  await register(config);
}
export async function refreshPush(config: PushConfig) {
  if (
    !config.enabled ||
    localStorage.getItem("iv-push-enabled") !== "1" ||
    !("Notification" in window)
  )
    return;
  if (Notification.permission === "granted") await register(config);
  else {
    const device = pushDevice();
    const r = await fetch(`${API}/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device }),
    });
    if (r.ok) localStorage.removeItem("iv-push-enabled");
  }
}
export async function disablePush(config: PushConfig) {
  const device = pushDevice();
  if (device) {
    const r = await fetch(`${API}/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device }),
    });
    if (!r.ok) throw new Error("Bildirim kaydı kaldırılamadı. Tekrar deneyin.");
  }
  localStorage.removeItem("iv-push-enabled");
  const { deleteToken } = await import("@firebase/messaging");
  await deleteToken(await messaging(config));
}

export async function detachPush() { const device=pushDevice(); if(device) await api.post("/push/unsubscribe",{device}); }
export async function syncPushAccount() { const cfg=await pushConfig(); if(cfg?.enabled) await refreshPush(cfg); }
