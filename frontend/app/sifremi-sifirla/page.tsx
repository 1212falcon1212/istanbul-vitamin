"use client";

import { useState, use, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import AuthShell from "@/components/auth/AuthShell";
import Spinner from "@/components/ui/Spinner";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function SifremiSifirlaPage({ searchParams }: Props) {
  const sp = use(searchParams);
  const token = typeof sp.token === "string" ? sp.token : "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const inputClass =
    "w-full h-12 px-4 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Geçersiz bağlantı. Lütfen yeniden istekte bulunun.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.push("/giris-yap"), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Şifre güncellenemedi. Bağlantı süresi dolmuş olabilir."
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title={<>Şifren güncellendi.</>}
        subtitle="Yeni şifrenle giriş sayfasına yönlendiriliyorsun…"
      >
        <Link
          href="/giris-yap"
          className="inline-flex items-center justify-center w-full h-12 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition"
        >
          Giriş Yap
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={
        <>
          Yeni şifreni belirle.
          <br />
          <span className="text-primary">Hazır ol.</span>
        </>
      }
      subtitle={
        token ? (
          "Yeni şifreni gir ve tekrarla, hesabına erişimini yenile."
        ) : (
          <>
            Bağlantı eksik veya geçersiz.{" "}
            <Link
              href="/sifremi-unuttum"
              className="text-primary hover:underline"
            >
              Yeni bağlantı iste
            </Link>
            .
          </>
        )
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
            Yeni Şifre
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 6 karakter"
            autoComplete="new-password"
            className={inputClass}
            disabled={!token}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
            Yeni Şifre (Tekrar)
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••"
            autoComplete="new-password"
            className={inputClass}
            disabled={!token}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="text-white" />
              Güncelleniyor…
            </>
          ) : (
            "Şifremi Güncelle"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
