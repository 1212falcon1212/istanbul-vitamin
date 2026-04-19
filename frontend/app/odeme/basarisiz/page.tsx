"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/Card";

export default function BasarisizPage() {
  return (
    <Suspense fallback={null}>
      <BasarisizInner />
    </Suspense>
  );
}

function BasarisizInner() {
  const reason = useSearchParams().get("reason");

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-red-50 to-rose-100 p-8 md:p-10 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white shadow-lg flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-10 h-10 text-accent-rose"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-text-primary mb-2">
                Ödeme tamamlanamadı
              </h1>
              <p className="text-text-secondary max-w-md mx-auto">
                Bir sorun oluştu ve işleminiz tamamlanamadı. Hesabınızdan ücret
                tahsil edilmedi; tekrar deneyebilirsiniz.
              </p>
            </div>

            <CardContent className="p-6 md:p-8 pt-6">
              {reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-[11px] uppercase tracking-widest text-red-700 font-semibold mb-1">
                    Hata detayı
                  </p>
                  <p className="text-sm text-red-800 break-words">{reason}</p>
                </div>
              )}

              <div className="bg-bg-primary rounded-xl p-4 border border-border mb-6">
                <p className="text-[11px] uppercase tracking-widest text-primary font-semibold mb-2">
                  Olası nedenler
                </p>
                <ul className="text-sm text-text-primary space-y-1.5">
                  <li>• Kart bilgileri hatalı veya eksik olabilir</li>
                  <li>• Yetersiz bakiye / limit sorunu</li>
                  <li>• 3D doğrulama zaman aşımına uğramış olabilir</li>
                  <li>• Bankanız işlemi reddetmiş olabilir</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/odeme"
                  className="flex-1 h-12 inline-flex items-center justify-center bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
                >
                  Tekrar Dene
                </Link>
                <Link
                  href="/sepet"
                  className="flex-1 h-12 inline-flex items-center justify-center border border-border text-text-primary rounded-xl font-medium hover:border-primary hover:text-primary transition-colors"
                >
                  Sepete Dön
                </Link>
              </div>

              <p className="mt-6 text-xs text-text-secondary text-center">
                Sorun devam ederse{" "}
                <Link
                  href="/iletisim"
                  className="text-primary hover:underline"
                >
                  müşteri hizmetleri
                </Link>
                &apos;ne ulaşabilirsiniz.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
