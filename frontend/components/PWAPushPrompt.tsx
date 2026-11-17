"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";
import { enablePush,pushConfig,type PushConfig } from "@/lib/push";
import { PWA_PUSH_DISMISSED,PUSH_CHANGED,shouldOfferPush } from "@/lib/push-preferences";
export default function PWAPushPrompt(){
 const path=usePathname();
 const [config,setConfig]=useState<PushConfig|null>(null);
 const [standalone,setStandalone]=useState(false),[enabled,setEnabled]=useState(false),[dismissed,setDismissed]=useState(true),[permission,setPermission]=useState("unsupported"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  const display=matchMedia("(display-mode: standalone)");
  const sync=()=>{setStandalone(display.matches || (navigator as Navigator & {standalone?:boolean}).standalone===true);setEnabled(localStorage.getItem("iv-push-enabled")==="1");setDismissed(localStorage.getItem(PWA_PUSH_DISMISSED)==="1");setPermission("Notification" in window?Notification.permission:"unsupported");};
  const installed=()=>{sync();setStandalone(true);};sync();let active=true;void pushConfig().then(c=>{if(active)setConfig(c);});
  display.addEventListener("change",sync);window.addEventListener("appinstalled",installed);window.addEventListener(PUSH_CHANGED,sync);window.addEventListener("storage",sync);
  return()=>{active=false;display.removeEventListener("change",sync);window.removeEventListener("appinstalled",installed);window.removeEventListener(PUSH_CHANGED,sync);window.removeEventListener("storage",sync);};
 },[]);
 function dismiss(){localStorage.setItem(PWA_PUSH_DISMISSED,"1");setDismissed(true);}
 if(!shouldOfferPush({standalone,configured:!!config?.enabled,supported:permission!=="unsupported",permission,enabled,dismissed,path}))return null;
 return <aside className="fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-white p-5 shadow-xl" aria-label="Bildirimleri etkinleştir">
  <h2 className="text-lg font-semibold">Siparişinizden haberdar olun</h2><p className="mt-2 text-sm text-text-secondary">Ödeme, kargo ve iade güncellemelerini bu cihazda bildirim olarak alın. Kampanya bildirimlerini ayrıca seçebilirsiniz.</p>
  <div className="mt-4 flex gap-3"><button disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50" onClick={async()=>{if(!config)return;setBusy(true);setError("");try{await enablePush(config);dismiss();}catch(e){setError(e instanceof Error?e.message:"Bildirim açılamadı.");}finally{setBusy(false);}}}>{busy?"Açılıyor…":"Bildirimleri aç"}</button><button disabled={busy} onClick={dismiss} className="px-3 py-2">Daha sonra</button></div>
  <Link href="/hesabim/bildirimler" onClick={dismiss} className="mt-3 block text-sm text-primary underline">Bildirim tercihlerim</Link>
  {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
 </aside>;
}
