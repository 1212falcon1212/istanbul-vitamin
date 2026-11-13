"use client";
import { useState } from "react";
export default function Unsubscribe(){
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-semibold">Bülten aboneliği</h1><p>Kampanya e-postaları aboneliğinizi burada kapatabilirsiniz.</p><button disabled={busy} className="my-4 rounded bg-primary p-3 text-white" onClick={async()=>{setBusy(true);try{const token=new URLSearchParams(window.location.search).get("token");if(!token)throw new Error("Geçersiz bağlantı");const response=await fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8080/api/v1"}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);if(!response.ok)throw new Error("Abonelik kapatılamadı");setMessage("Kampanya e-postası aboneliğiniz kapatıldı.");}catch(e){setMessage(e instanceof Error?e.message:"İşlem başarısız");}finally{setBusy(false);}}}>Abonelikten çık</button><p role="status">{message}</p></main>;
}
