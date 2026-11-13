"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useProductReviews } from "@/lib/product-reviews";
import { RatingStars } from "./DetailIcon";

export default function ProductReviews({ productId, productName }: { productId: number; productName: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [page,setPage] = useState(1);
  const { data, error, isLoading, mutate } = useProductReviews(productId,page);
  const [rating,setRating] = useState(5);
  const [title,setTitle] = useState("");
  const [body,setBody] = useState("");
  const [submitting,setSubmitting] = useState(false);
  const [submitted,setSubmitted] = useState(false);
  const pending = useRef(false);
  const stats = data?.data.stats;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || pending.current) return;
    if (body.trim().length < 10) { toast.error("Yorum en az 10 karakter olmalıdır."); return; }
    pending.current = true; setSubmitting(true);
    try {
      await api.post('/reviews', { product_id: productId, rating, title: title.trim(), body: body.trim() });
      setSubmitted(true); setTitle(""); setBody("");
      toast.success("Yorumunuz alındı. Onaylandıktan sonra yayınlanacaktır.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Yorum gönderilemedi."); }
    finally { pending.current = false; setSubmitting(false); }
  }
  return <div className="pdp-reviews">
    <h2>{productName} için değerlendirmeler</h2>
    {isLoading ? <p role="status">Değerlendirmeler yükleniyor…</p> : error ? <p role="alert">Değerlendirmeler alınamadı. <button type="button" onClick={() => mutate()}>Tekrar dene</button></p> : <>
      <div className="pdp-review-summary"><strong>{stats?.total_count ? stats.average_rating.toLocaleString("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:2}) : "—"}</strong><div><RatingStars value={stats?.average_rating ?? 0}/><p>{stats?.total_count ? `${stats.total_count} değerlendirme` : "Henüz değerlendirme yapılmamış."}</p></div></div>
      {!!data?.data.reviews?.length && <ul className="pdp-review-list">{data.data.reviews.map(review => <li key={review.id}><div className="pdp-review-avatar" aria-hidden="true">{review.user?.first_name?.charAt(0) || "K"}</div><div><RatingStars value={review.rating}/><p className="pdp-review-author"><strong>{review.user?.first_name || "Kullanıcı"}{review.user?.last_name ? ` ${review.user.last_name.charAt(0)}.` : ""}</strong> — {new Date(review.created_at).toLocaleDateString("tr-TR")}</p>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p></div></li>)}</ul>}
      {data && data.pagination.total_pages > 1 && <nav className="pdp-review-pagination" aria-label="Değerlendirme sayfaları"><button type="button" disabled={page <= 1} onClick={() => setPage(p=>p-1)}>Önceki</button><span>{page} / {data.pagination.total_pages}</span><button type="button" disabled={page >= data.pagination.total_pages} onClick={() => setPage(p=>p+1)}>Sonraki</button></nav>}
    </>}
    <div className="pdp-review-form"><h3>Değerlendirme ekle</h3>
      {authLoading ? <p>Oturum kontrol ediliyor…</p> : !user ? <p>Ürünü değerlendirmek için <Link href="/giris-yap">giriş yapın.</Link></p> : submitted ? <p role="status">Değerlendirmeniz alındı ve onay bekliyor.</p> : <form onSubmit={submit}>
        <p>Yorumunuz onaylandıktan sonra yayınlanır.</p>
        <label>Puanınız <span aria-hidden="true">*</span><select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} yıldız</option>)}</select></label>
        <label>Başlık (isteğe bağlı)<input value={title} maxLength={200} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Değerlendirmeniz <span aria-hidden="true">*</span><textarea value={body} minLength={10} maxLength={5000} required rows={5} onChange={e=>setBody(e.target.value)}/></label>
        <button type="submit" disabled={submitting}>{submitting ? "Gönderiliyor…" : "Değerlendirmeyi gönder"}</button>
      </form>}
    </div>
  </div>;
}
