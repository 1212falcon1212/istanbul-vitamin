"use client";

import { use } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/Card";

interface BasariliPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function BasariliPage({ searchParams }: BasariliPageProps) {
  const sp = use(searchParams);
  const orderNumber = typeof sp.order === "string" ? sp.order : "";

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 md:p-10 text-center relative">
              <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden>
                <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute top-10 right-10 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <div className="absolute bottom-6 left-20 w-1 h-1 rounded-full bg-emerald-600" />
              </div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-10 h-10 text-emerald-600"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <h1 className="font-display text-3xl md:text-4xl text-text-primary mb-2">
                  Siparişiniz alındı!
                </h1>
                <p className="text-text-secondary max-w-md mx-auto">
                  Siparişiniz başarıyla oluşturuldu. Hazırlık sürecine aldık ve
                  hemen kargoya verilecek.
                </p>

                {orderNumber && (
                  <div className="inline-flex items-center gap-2 mt-6 bg-white border border-emerald-200 rounded-full px-4 py-2 text-sm">
                    <span className="text-text-secondary">Sipariş No</span>
                    <span className="font-semibold text-emerald-700">
                      #{orderNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-6 md:p-8 pt-6">
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Onay E-Postası", desc: "Birkaç dk içinde" },
                  { label: "Kargo", desc: "1-3 iş günü teslimat" },
                  { label: "Takip", desc: "Hesabımdan takip edin" },
                ].map((s) => (
                  <li
                    key={s.label}
                    className="bg-bg-primary rounded-xl p-4 border border-border"
                  >
                    <p className="text-[11px] uppercase tracking-widest text-primary font-semibold">
                      {s.label}
                    </p>
                    <p className="text-sm text-text-primary mt-1">{s.desc}</p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/hesabim/siparisler"
                  className="flex-1 h-12 inline-flex items-center justify-center bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
                >
                  Siparişlerime Git
                </Link>
                <Link
                  href="/magaza"
                  className="flex-1 h-12 inline-flex items-center justify-center border border-border text-text-primary rounded-xl font-medium hover:border-primary hover:text-primary transition-colors"
                >
                  Alışverişe Devam Et
                </Link>
              </div>

              <p className="mt-6 text-xs text-text-secondary text-center">
                Sorularınız için{" "}
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
