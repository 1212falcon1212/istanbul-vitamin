"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AuthShell from "@/components/auth/AuthShell";
import Spinner from "@/components/ui/Spinner";

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("E-posta adresi zorunludur");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Geçerli bir e-posta adresi girin");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Bir hata oluştu. Lütfen tekrar deneyin.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-12 px-4 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

  if (sent) {
    return (
      <AuthShell
        title={<>E-postanı kontrol et.</>}
        subtitle={
          <>
            <strong>{email}</strong> adresine şifre sıfırlama bağlantısı
            gönderdik. Gelen kutunu kontrol et.
          </>
        }
      >
        <Link
          href="/giris-yap"
          className="inline-flex items-center justify-center w-full h-12 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition"
        >
          Giriş sayfasına dön
        </Link>
        <p className="mt-4 text-xs text-text-secondary text-center">
          E-posta gelmediyse spam kutunu kontrol et veya{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-primary hover:underline"
          >
            yeniden dene
          </button>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={
        <>
          Şifreni mi unuttun?
          <br />
          <span className="text-primary">Sıfırlayalım.</span>
        </>
      }
      subtitle={
        <>
          E-posta adresini gir, sana sıfırlama bağlantısı gönderelim.{" "}
          <Link
            href="/giris-yap"
            className="text-primary font-medium hover:underline"
          >
            Giriş sayfasına dön
          </Link>
          .
        </>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
            E-posta
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@email.com"
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="text-white" />
              Gönderiliyor…
            </>
          ) : (
            "Sıfırlama Bağlantısı Gönder"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
