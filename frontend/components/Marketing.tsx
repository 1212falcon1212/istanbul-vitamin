"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  configureTracking,
  readConsent,
  saveConsent,
  trackPage,
} from "@/lib/marketing";
export default function Marketing() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);
  useEffect(() => {
    const consent = readConsent();
    setOpen(!consent);
    setAnalytics(consent?.analytics ?? false);
    setAds(consent?.ads ?? false);
    const show = () => setOpen(true);
    window.addEventListener("iv-cookie-settings", show);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/tracking/config`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (r?.data) {
          configureTracking(r.data);
          trackPage(location.pathname);
        }
      })
      .catch(() => {});
    return () => window.removeEventListener("iv-cookie-settings", show);
  }, []);
  useEffect(() => {
    trackPage(path);
  }, [path]);
  function save(a: boolean, d: boolean) {
    saveConsent(a, d);
    setOpen(false);
    location.reload();
  }
  if (!open || path.startsWith("/yonetim")) return null;
  return (
    <section className="consent-panel" aria-label="Çerez tercihleri">
      <h2>Gizlilik tercihleriniz</h2>
      <p>
        Sepet ve oturum için gerekli çerezleri kullanıyoruz. İzninizle ziyaret
        ölçümü ve reklam ölçümü de yapabiliriz.{" "}
        <Link href="/cerez-politikasi">Çerez politikası</Link>
      </p>
      <div className="consent-options">
        <label>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
          />{" "}
          Analitik
        </label>
        <label>
          <input
            type="checkbox"
            checked={ads}
            onChange={(e) => setAds(e.target.checked)}
          />{" "}
          Reklam
        </label>
      </div>
      <div className="consent-actions">
        <button onClick={() => save(false, false)}>Yalnızca gerekli</button>
        <button onClick={() => save(analytics, ads)}>Seçimi kaydet</button>
        <button onClick={() => save(true, true)}>Tümüne izin ver</button>
      </div>
    </section>
  );
}
