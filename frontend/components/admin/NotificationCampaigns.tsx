"use client";
import { useEffect,useRef,useState } from "react";
import { api } from "@/lib/api";
type Delivery={id:number;channel:string;title:string;status:string;attempts:number;last_error:string};
type Report={deliveries:Delivery[];email_audience:number;push_audience:number;smtp_ready:boolean;worker_enabled:boolean};
export default function NotificationCampaigns(){
 const [report,setReport]=useState<Report|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [title,setTitle]=useState(""),[body,setBody]=useState(""),[path,setPath]=useState("/magaza"),[email,setEmail]=useState(true),[push,setPush]=useState(false),[schedule,setSchedule]=useState("");
 const key=useRef<string|null>(null);
 async function load(){try{const r=await api.get<Report>("/admin/push/deliveries");setReport(r.data??null);}catch{setMessage("Gönderim geçmişi yüklenemedi.");}}
 useEffect(()=>{void load();},[]);
 return <section className="mt-8 space-y-4 border-t pt-6"><h2 className="text-xl font-semibold">Kampanya gönderimi</h2>
 <p>Yalnız aktif bülten abonelerine ve kampanya bildirimi izni veren cihazlara gönderilir. Gönderim anında izin yeniden kontrol edilir.</p>
 {report&&<p>E-posta: {report.email_audience} abone · Push: {report.push_audience} cihaz · SMTP: {report.smtp_ready?"Hazır":"Yapılandırılmadı"} · Gönderici: {report.worker_enabled?"Açık":"Kapalı; gönderimler kuyrukta bekler"}</p>}
 <form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(!window.confirm(`Bu kampanyayı ${email?report?.email_audience??0:0} e-posta abonesi ve ${push?report?.push_audience??0:0} cihaza göndermek üzere kuyruğa almak istiyor musunuz?`))return;setBusy(true);try{key.current??=crypto.randomUUID();const r=await api.post<{queued:number}>("/admin/push/campaign",{key:key.current,title,body,path,email,push,scheduled_at:schedule?new Date(schedule).toISOString():undefined});setMessage(`${r.data?.queued??0} gönderim kuyruğa alındı.`);key.current=null;setTitle("");setBody("");await load();}catch(e){setMessage(e instanceof Error?e.message:"Gönderim oluşturulamadı");}finally{setBusy(false);}}}>
 <label className="block">Başlık<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} className="block w-full rounded border p-2"/></label>
 <label className="block">Mesaj<textarea required maxLength={300} value={body} onChange={e=>setBody(e.target.value)} className="block w-full rounded border p-2"/></label>
 <label className="block">Site içi bağlantı<input required value={path} onChange={e=>setPath(e.target.value)} className="block w-full rounded border p-2"/></label>
 <label className="block">Gönderim zamanı (boşsa hemen)<input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)} className="block rounded border p-2"/></label>
 <label className="mr-4"><input type="checkbox" checked={email} onChange={e=>setEmail(e.target.checked)}/> E-posta</label><label><input type="checkbox" checked={push} onChange={e=>setPush(e.target.checked)}/> Push</label>
 <div className="rounded border bg-gray-50 p-4"><strong>{title||"Başlık önizlemesi"}</strong><p className="whitespace-pre-wrap">{body||"Mesaj önizlemesi"}</p><span>{path}</span></div>
 <button disabled={busy||(!email&&!push)} className="rounded bg-primary p-3 text-white disabled:opacity-50">{busy?"Kaydediliyor…":"Gönderimi kuyruğa al"}</button></form>
 <p role="status">{message}</p><h2 className="font-semibold">Son 100 gönderim</h2><button onClick={()=>void load()} className="rounded border p-2">Yenile</button>
 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Kanal</th><th>Başlık</th><th>Durum</th><th>Deneme</th></tr></thead><tbody>{report?.deliveries.map(d=><tr key={d.id}><td>{d.channel}</td><td>{d.title}</td><td>{({pending:"Bekliyor",sending:"Gönderiliyor",sent:"Sağlayıcıya iletildi",failed:"Başarısız",skipped:"İzin/alıcı uygun değil",uncertain:"Sonuç belirsiz"} as Record<string,string>)[d.status]||d.status}{d.last_error&&<p>{d.last_error}</p>}</td><td>{d.attempts}</td></tr>)}</tbody></table></div>
 </section>;
}
