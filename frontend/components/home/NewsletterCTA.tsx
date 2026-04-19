"use client";

import { useState } from "react";
import { toast } from "sonner";
import SectionLabel from "@/components/ui/SectionLabel";
import SerifHeading from "@/components/ui/SerifHeading";
import PillButton from "@/components/ui/PillButton";
import FadeUp from "@/components/animations/FadeUp";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export default function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      toast.success("Bültenimize başarıyla katıldınız!");
      setEmail("");
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FadeUp>
      <section className="w-full bg-footer text-white py-16 md:py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left */}
          <div>
            <SectionLabel
              number="008"
              title="JURNAL"
              className="text-white/50"
            />
            <SerifHeading size="lg" className="text-white mt-3">
              Bültenimize{" "}
              <em className="text-[#b8a4f0]">katılın.</em>
            </SerifHeading>
            <p className="text-white/60 text-sm mt-4 max-w-xs font-body leading-relaxed">
              Yeni ürünler, özel kampanyalar ve dermatoloji içerikleri
              doğruca gelen kutunuza.
            </p>
          </div>

          {/* Right */}
          <div>
            <form onSubmit={handleSubmit} noValidate>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                className="w-full bg-transparent border-0 border-b border-[#b8a4f0] pb-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white transition-colors font-body"
              />
              <div className="mt-6 flex justify-between items-center">
                <a
                  href="/gizlilik-politikasi"
                  className="text-white/40 text-[10px] hover:text-white/70 transition-colors font-body"
                >
                  Gizlilik politikamızı
                </a>
                <PillButton
                  variant="white"
                  type="submit"
                  disabled={submitting}
                  size="sm"
                >
                  {submitting ? "Gönderiliyor..." : "Abone ol →"}
                </PillButton>
              </div>
            </form>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
