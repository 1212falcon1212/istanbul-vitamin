"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { Category, Product } from "@/types";
import { api } from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";

async function fetchProducts(path: string) {
  const response = await api.get<Product[]>(path);
  return response.data ?? [];
}

export default function CategoryProducts({ categories }: { categories: Category[] }) {
  const options = categories.filter((category) => category.is_active);
  const [selectedId, setSelectedId] = useState<number | undefined>(() => options.find((category) => category.slug === "cilt-bakimi")?.id ?? options[0]?.id);
  const selected = options.find((category) => category.id === selectedId) ?? options[0];
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const { data: products, error, isLoading, mutate } = useSWR(
    selected ? `/products?category_id=${selected.id}&sort=trending&per_page=12` : null,
    fetchProducts,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
  if (!selected) return null;

  return <section aria-labelledby="category-products-title">
    <div className="catalog-section-heading">
      <div>
        <h2 id="category-products-title">Kategoriden ürünler.</h2>
        <p>Kategorini seç, sana uygun ürünleri keşfet.</p>
      </div>
      <Link href={`/${selected.slug}`} className="catalog-section-link">{selected.name}: tüm ürünler <span aria-hidden="true">→</span></Link>
    </div>
    <div role="tablist" aria-label="Ürün kategorisi seçimi" className="mb-6 flex flex-wrap gap-2">
      {options.map((category, index) => <button key={category.id} ref={(element) => { tabs.current[index] = element; }}
        type="button" role="tab" id={`category-products-tab-${category.id}`} aria-selected={category.id === selected.id}
        aria-controls="category-products-panel" tabIndex={category.id === selected.id ? 0 : -1}
        onClick={() => setSelectedId(category.id)}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
          setSelectedId(options[next].id); tabs.current[next]?.focus();
        }}
        className={`min-h-11 rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${category.id === selected.id ? "border-primary bg-primary text-white" : "border-[#e2d2fc] bg-white text-[#625074] hover:border-primary hover:text-primary"}`}
      >{category.name}</button>)}
    </div>
    <div id="category-products-panel" role="tabpanel" aria-labelledby={`category-products-tab-${selected.id}`} aria-busy={isLoading} tabIndex={0}>
      {isLoading ? <>
        <p role="status" className="sr-only">{selected.name} ürünleri yükleniyor.</p>
        <div className="catalog-product-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => index).map((index) => <div key={index} className="h-[440px] rounded-[18px] border border-[#e2d2fc] bg-white/70 motion-safe:animate-pulse" />)}</div>
      </> : error ? <div role="alert" className="rounded-2xl border border-[#e2d2fc] bg-white p-8 text-center">
        <p>Ürünler yüklenemedi. Lütfen tekrar deneyin.</p>
        <button type="button" onClick={() => void mutate()} className="mt-4 rounded-full bg-primary px-5 py-2 text-white">Tekrar dene</button>
      </div> : products?.length ? <div className="catalog-product-grid">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div> : <p role="status" className="rounded-2xl bg-white p-8 text-center text-text-secondary">Bu kategoride henüz ürün bulunmuyor.</p>}
    </div>
  </section>;
}
