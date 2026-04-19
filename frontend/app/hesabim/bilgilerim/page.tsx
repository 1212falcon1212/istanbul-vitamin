"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";

export default function BilgilerimPage() {
  const { user } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setProfileError("Ad ve soyad alanlari zorunludur.");
      setProfileSaving(false);
      return;
    }

    try {
      await api.put("/users/me", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError("Bilgiler guncellenirken bir hata olustu.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Tum alanlari doldurunuz.");
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Yeni sifre en az 6 karakter olmalidir.");
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Yeni sifreler eslesmemektedir.");
      setPasswordSaving(false);
      return;
    }

    try {
      await api.put("/users/me/password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError("Sifre degistirilirken bir hata olustu. Mevcut sifrenizi kontrol ediniz.");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-text-primary">Bilgilerim</h1>

      {/* Profile form */}
      <div className="bg-card-bg rounded-2xl border border-border p-6">
        <h2 className="font-display text-xl text-text-primary mb-5">
          Kisisel Bilgiler
        </h2>

        <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
          {profileError && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-50 text-green-600 rounded-lg p-3 text-sm">
              Bilgileriniz basariyla guncellendi.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Ad
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Soyad
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-border bg-primary-soft/30 text-sm text-text-secondary cursor-not-allowed"
            />
            <p className="text-xs text-text-secondary mt-1">
              E-posta adresi degistirilemez.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="h-10 px-6 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {profileSaving ? "Kaydediliyor..." : "Bilgileri Guncelle"}
          </button>
        </form>
      </div>

      {/* Password change */}
      <div className="bg-card-bg rounded-2xl border border-border p-6">
        <h2 className="font-display text-xl text-text-primary mb-5">
          Sifre Degistir
        </h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          {passwordError && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 text-green-600 rounded-lg p-3 text-sm">
              Sifreniz basariyla degistirildi.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Mevcut Sifre
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Yeni Sifre
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Yeni Sifre (Tekrar)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="h-10 px-6 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {passwordSaving ? "Degistiriliyor..." : "Sifreyi Degistir"}
          </button>
        </form>
      </div>
    </div>
  );
}
