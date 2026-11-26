"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderPayment({ order, admin = false, onChange }: {order: Order; admin?: boolean; onChange: () => Promise<void>}) {
 const { settings } = useSettings();
 const [busy,setBusy] = useState(false);
 const [message,setMessage] = useState("");
 const [confirming,setConfirming] = useState(false);
 const transfer = order.payment_method === "bank_transfer";
 const status = order.payment_status || "pending";
 const terminal = ["cancelled","refunded"].includes(order.status);
 const endpoint = `${admin ? "/admin" : ""}/orders/${order.id}`;
 async function fileRequest(file?: File) {
  setBusy(true);setMessage("");
  try {
   if(file && (file.size > 5*1024*1024 || !["application/pdf","image/jpeg","image/png"].includes(file.type))) throw new Error("En fazla 5 MB PDF, JPEG veya PNG seçin.");
   const body=file ? new FormData() : undefined; if(file) body!.append("file",file);
   const res=await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}${endpoint}/receipt`,{method:file?"POST":"GET",body,credentials:"include"});
   if(!res.ok) {const result=await res.json();throw new Error(result.error || "Dekont işlemi başarısız");}
   if(file) {setMessage("Dekont alındı. Ödeme kontrolü bekleniyor.");await onChange();}
   else {const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`dekont-${order.order_number}.${blob.type.includes("pdf")?"pdf":blob.type.includes("png")?"png":"jpg"}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  } catch(e) {setMessage(e instanceof Error?e.message:"İşlem başarısız");} finally {setBusy(false);}
 }
 async function confirm() {
  setBusy(true);setMessage("");
  try {await api.post(`${endpoint}/confirm-transfer`,{});setConfirming(false);await onChange();setMessage("Havale tahsilatı onaylandı.");}
  catch(e) {setMessage(e instanceof Error?e.message:"Onay başarısız");}finally{setBusy(false);}
 }
 return <section className="rounded-2xl border border-border bg-card-bg p-5 space-y-4">
  <h2 className="font-display text-lg">Ödeme Bilgileri</h2>
  <dl className="grid gap-3 sm:grid-cols-2 text-sm">
   <div><dt className="text-text-secondary">Ödeme yöntemi</dt><dd className="font-medium">{transfer?"Havale / EFT":"Kredi / Banka Kartı"}</dd></div>
   <div><dt className="text-text-secondary">Ödeme durumu</dt><dd className="font-medium">{status==="paid"?"Ödeme onaylandı":status==="review"?"Dekont alındı — kontrol bekliyor":status==="test"?"Test işlemi — gerçek tahsilat yok":"Ödeme bekleniyor"}</dd></div>
   <div><dt className="text-text-secondary">Sipariş tutarı</dt><dd>{formatPrice(order.total)}</dd></div>
   {!transfer && <div><dt className="text-text-secondary">{status==="paid"?"Ödeme yapılan kart":"Ödeme için kullanılan kart"}</dt><dd>{order.payment_card_last_four?`•••• ${order.payment_card_last_four}`:"Kart bilgisi kayıtlı değil"}</dd></div>}
   {order.payment_confirmed_at && <div><dt className="text-text-secondary">Onay tarihi</dt><dd>{new Date(order.payment_confirmed_at).toLocaleString("tr-TR")}</dd></div>}
  </dl>
  {transfer && status!=="paid" && !terminal && <div className="rounded-xl bg-bg-primary p-4 text-sm space-y-2">
   <p>{settings.bank_transfer_bank} — {settings.bank_transfer_holder}</p>
   <p className="break-all font-mono">{settings.bank_transfer_iban}</p>
   <p>Havale açıklaması: <strong>{order.order_number}</strong></p>
   <p>{settings.bank_transfer_note}</p>
   <p>Dekont yüklenmesi ödeme onayı anlamına gelmez. Tahsilat kontrol edildikten sonra onaylanır.</p>
  </div>}
  {order.receipt_submitted_at && <div className="text-sm"><p>Dekont tarihi: {new Date(order.receipt_submitted_at).toLocaleString("tr-TR")}</p><button disabled={busy} onClick={()=>fileRequest()} className="text-primary underline mt-2">Dekontu indir</button></div>}
  {transfer && !admin && !terminal && status!=="paid" && <label className="block text-sm font-medium">{order.receipt_submitted_at?"Dekontu güncelle":"Dekont yükle"}<input type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} className="block mt-2 max-w-full" onChange={e=>{const file=e.target.files?.[0];if(file)void fileRequest(file);e.target.value="";}}/><span className="block text-xs text-text-secondary mt-1">PDF, JPEG veya PNG, en fazla 5 MB.</span></label>}
  {admin && transfer && !terminal && status!=="paid" && <div>{confirming?<div className="space-y-2"><p>Hesaba {formatPrice(order.total)} geçtiğini kontrol ettiniz mi?</p><button disabled={busy} onClick={confirm} className="rounded-lg bg-primary text-white px-4 py-2">Evet, tahsilatı onayla</button><button disabled={busy} onClick={()=>setConfirming(false)} className="ml-3">Vazgeç</button></div>:<button onClick={()=>setConfirming(true)} disabled={busy} className="rounded-lg bg-primary text-white px-4 py-2">Havale tahsilatını onayla</button>}</div>}
  {busy && <p role="status" className="text-sm">İşlem yapılıyor…</p>}
  {message && <p role="status" className="text-sm">{message}</p>}
 </section>;
}
