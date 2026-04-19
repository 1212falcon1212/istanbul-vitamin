"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import type { Brand } from "@/types";
import { api } from "@/lib/api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductListing from "@/components/product/ProductListing";
import Spinner from "@/components/ui/Spinner";

type Props = { params: Promise<{ slug: string }> };

export default function BrandDetailPage({ params }: Props) {
  const { slug } = use(params);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);

  useEffect(() => {
    setBrandLoading(true);
    api
      .get<Brand | { brand: Brand }>(`/brands/${slug}`)
      .then((res) => {
        const raw = res.data as Brand | { brand?: Brand } | undefined;
        const b = raw && "brand" in raw ? raw.brand : (raw as Brand | undefined);
        setBrand(b ?? null);
      })
      .catch(() => setBrand(null))
      .finally(() => setBrandLoading(false));
  }, [slug]);

  if (brandLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center py-20">
          <p className="text-text-secondary text-lg">Marka bulunamadı.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb
            items={[
              { label: "Markalar", href: "/markalar" },
              { label: brand.name },
            ]}
          />

          {/* Brand header */}
          <div className="flex items-center gap-6 mb-8 p-6 rounded-2xl bg-white border border-border">
            {brand.logo_url && (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-primary-soft flex items-center justify-center shrink-0">
                <Image
                  src={brand.logo_url}
                  alt={brand.name}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="font-display text-3xl text-text-primary">
                {brand.name}
              </h1>
              {brand.description && (
                <p className="text-text-secondary text-sm mt-2 max-w-2xl">
                  {brand.description}
                </p>
              )}
            </div>
          </div>

          <ProductListing
            locked={{ brand_id: brand.id }}
            showBrandFilter={false}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
