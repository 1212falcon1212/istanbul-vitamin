"use client";
import { useEffect, useState } from "react";
import { pushConfig, enablePush, disablePush, setPushMarketing, type PushConfig } from "@/lib/push";
import { PUSH_CHANGED } from "@/lib/push-preferences";

export default function NotificationPreferences() {
 const [config,setConfig]=useState<PushConfig|null>(null);
 const [loading,setLoading]=useState(true);
 const [enabled,setEnabled]=useState(false);
 const [marketing,setMarketing]=useState(false);
 const [permission,setPermission]=useState<string>("unsupported");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  const sync=()=>{setEnabled(localStorage.getItem("iv-push-enabled")==="1");setMarketing(localStorage.getItem("iv-push-marketing")==="1");setPermission("Notification" in window?Notification.permission:"unsupported");};
  sync();let active=true;void pushConfig().then(c=>{if(active){setConfig(c);setLoading(false);}});
  window.addEventListener(PUSH_CHANGED,sync);window.addEventListener("focus",sync);window.addEventListener("storage",sync);
  return()=>{active=false;window.removeEventListener(PUSH_CHANGED,sync);window.removeEventListener("focus",sync);window.removeEventListener("storage",sync);};
 },[]);
 async function toggle() {
  setBusy(true);setMessage("");
  try {if(enabled)await disablePush(config);else if(config)await enablePush(config);setMessage(enabled?"Bu cihazda bildirimler kapatıldı.":"Bu cihazda bildirimler açıldı.");}
  catch(e){setMessage(e instanceof Error?e.message:"Tercih kaydedilemedi.");}
  finally{setPermission("Notification" in window?Notification.permission:"unsupported");setBusy(false);}
 }
 return <div className="space-y-6">
  <div><h1 className="font-display text-3xl">Bildirimler</h1><p className="mt-2 text-text-secondary">Sipariş güncellemeleri ve kampanya bildirimlerini buradan yönetin. Bu tercihler kullandığınız cihaz ve tarayıcı için geçerlidir.</p></div>
  <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-4">
   <h2 className="text-lg font-semibold">Cihaz bildirimleri</h2>
   <p className="text-sm text-text-secondary">Sipariş, ödeme, kargo ve iade gelişmelerinden haberdar olun.</p>
   <p className="text-sm font-medium">Durum: {loading?"Kontrol ediliyor…":permission==="denied"?"Tarayıcı izni kapalı":permission==="unsupported"?"Bu tarayıcıda desteklenmiyor":enabled && permission==="granted"?"Açık":"Kapalı"}</p>
   {!loading && !config?.enabled && <p className="text-sm text-text-secondary">Bildirim hizmeti şu anda kullanılamıyor. Daha sonra tekrar deneyebilirsiniz.</p>}
   {permission==="denied" && <p className="text-sm">Bildirimleri açmak için tarayıcınızın bu siteye ait izinlerinden bildirimlere izin verin, ardından sayfayı yenileyin.</p>}
   {permission==="unsupported" && <p className="text-sm">iPhone/iPad’de Safari → Paylaş → Ana Ekrana Ekle adımlarını izleyin ve uygulamayı ana ekrandan açın.</p>}
   <button type="button" disabled={busy || loading || (!enabled && (!config?.enabled || permission==="denied" || permission==="unsupported"))} onClick={toggle} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50">{busy?"Kaydediliyor…":enabled?"Bildirimleri kapat":"Bildirimleri aç"}</button>
  </section>
  <section className="rounded-2xl border border-border bg-card-bg p-6 space-y-3">
   <h2 className="text-lg font-semibold">Kampanyalar ve fırsatlar</h2>
   <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={marketing} disabled={busy || loading} onChange={async e=>{const value=e.target.checked;setBusy(true);setMessage("");try{await setPushMarketing(value,config);setMessage("Kampanya tercihiniz kaydedildi.");}catch(e){setMessage(e instanceof Error?e.message:"Tercih kaydedilemedi.");}finally{setBusy(false);}}}/><span className="text-sm">İndirim ve kampanya bildirimleri almak istiyorum.</span></label>
   {!enabled && <p className="text-xs text-text-secondary">Tercihiniz saklanır; bildirim alabilmek için cihaz bildirimlerini de açmalısınız.</p>}
  </section>
  <p className="text-sm text-text-secondary">Bu ayarlar e-posta aboneliğinizi değiştirmez. Sipariş ve hesap güvenliği e-postaları gönderilmeye devam eder.</p>
  {message && <p role="status" className="rounded-xl border border-border p-4 text-sm">{message}</p>}
 </div>;
}
