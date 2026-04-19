"use client";

import { useEffect, useState, type FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AuthShell from "@/components/auth/AuthShell";
import Spinner from "@/components/ui/Spinner";

interface GirisYapPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function GirisYapPage({ searchParams }: GirisYapPageProps) {
  const sp = use(searchParams);
  const redirect = typeof sp.redirect === "string" ? sp.redirect : "/hesabim";

  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [authLoading, isAuthenticated, redirect, router]);

  if (!authLoading && isAuthenticated) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre zorunludur");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Giriş başarısız. Lütfen tekrar deneyin.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-12 px-4 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

  return (
    <AuthShell
      title={
        <>
          Tekrar hoş geldin.
          <br />
          <span className="text-primary">Devam edelim.</span>
        </>
      }
      subtitle={
        <>
          Hesabın yok mu?{" "}
          <Link
            href="/kayit-ol"
            className="text-primary font-medium hover:underline"
          >
            Hesap oluştur
          </Link>
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Şifre
            </label>
            <Link
              href="/sifremi-unuttum"
              className="text-xs text-primary hover:underline"
            >
              Şifremi unuttum
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
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
              Giriş yapılıyor…
            </>
          ) : (
            "Giriş Yap"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[11px] uppercase tracking-widest text-text-secondary">
          veya
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Social (disabled placeholders) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          title="Yakında"
          className="h-11 rounded-xl border border-border bg-white text-sm text-text-primary flex items-center justify-center gap-2 hover:border-primary/40 transition disabled:opacity-60"
        >
          <GoogleIcon />
          Google
        </button>
        <button
          type="button"
          disabled
          title="Yakında"
          className="h-11 rounded-xl border border-border bg-white text-sm text-text-primary flex items-center justify-center gap-2 hover:border-primary/40 transition disabled:opacity-60"
        >
          <FacebookIcon />
          Facebook
        </button>
      </div>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}
