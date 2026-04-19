"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductListing from "@/components/product/ProductListing";

export default function MagazaPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb items={[{ label: "Mağaza" }]} />

          <div className="mb-6">
            <h1 className="font-display text-3xl text-text-primary">Mağaza</h1>
            <p className="text-sm text-text-secondary mt-1">
              Tüm ürünleri marka, kategori, fiyat ve stok durumuna göre keşfedin.
            </p>
          </div>

          <ProductListing />
        </div>
      </main>
      <Footer />
    </div>
  );
}
