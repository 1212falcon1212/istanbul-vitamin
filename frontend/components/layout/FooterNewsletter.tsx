"use client";

import { useHomeContent } from "@/lib/use-home-content";
import { useState } from "react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default function FooterNewsletter() {
  const c = useHomeContent().footer;
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (submitting) return;

    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      toast.error("Geçerli bir e-posta adresi giriniz.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data: ApiResponse = await res
        .json()
        .catch(() => ({ success: false }));

      if (!res.ok || !data.success) {
        toast.error(data.error || "Abonelik başarısız. Lütfen tekrar deneyin.");
        return;
      }
      toast.success(data.message || "Başarıyla kaydoldunuz");
      setEmail("");
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-newsletter">
      <h3 className="font-display text-xl text-[#111827] mb-3 font-bold">
        {c.newsletterTitle}
      </h3>
      <p className="text-sm text-[#6b7280] mb-3">{c.newsletterDescription}</p>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col sm:flex-row gap-0"
      >
        <label htmlFor="footer-newsletter-email" className="sr-only">
          E-posta adresiniz
        </label>
        <input
          id="footer-newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          disabled={submitting}
          className="flex-1 min-w-0 bg-white border border-[#d1d5db] text-[#111827] placeholder-[#9ca3af] text-sm rounded px-3 py-2 focus:outline-none focus:border-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-white text-sm font-semibold rounded px-4 py-2 hover:bg-primary/90 transition disabled:opacity-60"
        >
          {submitting ? "Gönderiliyor..." : c.newsletterButton}
        </button>
      </form>
    </div>
  );
}
