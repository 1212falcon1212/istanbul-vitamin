"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AuthShell from "@/components/auth/AuthShell";
import Spinner from "@/components/ui/Spinner";

export default function KayitOlPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/hesabim");
    }
  }, [authLoading, isAuthenticated, router]);

  if (!authLoading && isAuthenticated) {
    return null;
  }

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.first_name.trim()) newErrors.first_name = "Ad zorunlu";
    if (!form.last_name.trim()) newErrors.last_name = "Soyad zorunlu";
    if (!form.email.trim()) newErrors.email = "E-posta zorunlu";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Geçerli bir e-posta girin";
    if (!form.phone.trim()) newErrors.phone = "Telefon zorunlu";
    if (!form.password) newErrors.password = "Şifre zorunlu";
    else if (form.password.length < 6)
      newErrors.password = "Şifre en az 6 karakter olmalı";
    if (form.password !== form.password_confirm)
      newErrors.password_confirm = "Şifreler eşleşmeli";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      router.push("/hesabim");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Kayıt başarısız. Lütfen tekrar deneyin.";
      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-12 px-4 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <AuthShell
      title={
        <>
          Aramıza katıl.
          <br />
          <span className="text-primary">Hesap oluştur.</span>
        </>
      }
      subtitle={
        <>
          Zaten hesabın var mı?{" "}
          <Link
            href="/giris-yap"
            className="text-primary font-medium hover:underline"
          >
            Giriş yap
          </Link>
        </>
      }
    >
      {generalError && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
              Ad
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
              className={inputClass}
            />
            {errors.first_name && (
              <p className={errorClass}>{errors.first_name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
              Soyad
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
              className={inputClass}
            />
            {errors.last_name && (
              <p className={errorClass}>{errors.last_name}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
            E-posta
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="ornek@email.com"
            autoComplete="email"
            className={inputClass}
          />
          {errors.email && <p className={errorClass}>{errors.email}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
            Telefon
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="05XX XXX XX XX"
            className={inputClass}
          />
          {errors.phone && <p className={errorClass}>{errors.phone}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
              Şifre
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="En az 6 karakter"
              autoComplete="new-password"
              className={inputClass}
            />
            {errors.password && <p className={errorClass}>{errors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
              Şifre Tekrar
            </label>
            <input
              type="password"
              value={form.password_confirm}
              onChange={(e) =>
                handleChange("password_confirm", e.target.value)
              }
              placeholder="••••••"
              autoComplete="new-password"
              className={inputClass}
            />
            {errors.password_confirm && (
              <p className={errorClass}>{errors.password_confirm}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-2"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="text-white" />
              Kayıt oluşturuluyor…
            </>
          ) : (
            "Hesap Oluştur"
          )}
        </button>

        <p className="text-[11px] text-text-secondary text-center leading-relaxed">
          Hesap oluşturarak{" "}
          <Link href="/kullanim-kosullari" className="text-primary hover:underline">
            Kullanım Koşulları
          </Link>
          {" ve "}
          <Link href="/gizlilik-politikasi" className="text-primary hover:underline">
            Gizlilik Politikası
          </Link>
          &apos;nı kabul etmiş olursun.
        </p>
      </form>
    </AuthShell>
  );
}
