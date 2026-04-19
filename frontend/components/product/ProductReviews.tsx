"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

interface Review {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  created_at: string;
}

interface ProductReviewsProps {
  productId: number;
}

function storageKey(id: number) {
  return `product-reviews-${id}`;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(productId));
      if (raw) setReviews(JSON.parse(raw));
    } catch {}
  }, [productId]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !body.trim()) {
      toast.error("Ad ve yorum alanı boş bırakılamaz.");
      return;
    }
    setSubmitting(true);
    const next: Review = {
      id: crypto.randomUUID(),
      author: author.trim(),
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [next, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem(storageKey(productId), JSON.stringify(updated));
    } catch {}
    setAuthor("");
    setTitle("");
    setBody("");
    setRating(5);
    setSubmitting(false);
    toast.success("Yorumunuz eklendi.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Yorumlar</CardTitle>
            <CardDescription>
              {reviews.length > 0
                ? `${reviews.length} yorum • Ortalama ${avg.toFixed(1)} / 5`
                : "Henüz yorum yapılmamış. İlk yorumu siz yapın."}
            </CardDescription>
          </div>
          {reviews.length > 0 && (
            <Stars rating={Math.round(avg)} className="text-primary" readonly />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 p-4 rounded-xl bg-primary-soft/30 border border-primary-soft"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Adınız"
              className="px-3 py-2 text-sm bg-white rounded-lg border border-border focus:outline-none focus:border-primary"
              maxLength={60}
              required
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Başlık (isteğe bağlı)"
              className="px-3 py-2 text-sm bg-white rounded-lg border border-border focus:outline-none focus:border-primary"
              maxLength={100}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Puan:</span>
            <Stars rating={rating} onChange={setRating} />
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ürün hakkındaki deneyiminizi paylaşın…"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-border focus:outline-none focus:border-primary resize-none"
            maxLength={500}
            required
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition disabled:opacity-50"
            >
              {submitting ? "Gönderiliyor…" : "Yorum Yap"}
            </button>
          </div>
        </form>

        {/* List */}
        {reviews.length > 0 && (
          <ul className="space-y-4 divide-y divide-border">
            {reviews.map((r) => (
              <li key={r.id} className="pt-4 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold text-sm">
                      {r.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {r.author}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {new Date(r.created_at).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Stars rating={r.rating} readonly />
                </div>
                {r.title && (
                  <p className="mt-3 font-medium text-sm text-text-primary">
                    {r.title}
                  </p>
                )}
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {r.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Stars({
  rating,
  onChange,
  readonly = false,
  className = "",
}: {
  rating: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rating;
        return (
          <button
            key={n}
            type="button"
            onClick={() => !readonly && onChange?.(n)}
            disabled={readonly}
            className={[
              "transition-transform",
              readonly ? "cursor-default" : "hover:scale-110",
            ].join(" ")}
            aria-label={`${n} yıldız`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 ${filled ? "text-[#f59e0b]" : "text-border"}`}
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
