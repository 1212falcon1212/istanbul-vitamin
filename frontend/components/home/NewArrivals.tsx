"use client";

import Link from "next/link";
import type { Product } from "@/types";
import ProductCard from "@/components/product/ProductCard";

export default function NewArrivals({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return <section>
    <div className="catalog-section-heading">
      <div><h2>Bu hafta gelenler.</h2><p>Dermokozmetik dünyasına yeni eklenen ürünleri keşfedin.</p></div>
      <Link href="/magaza?sort=newest" className="catalog-section-link">Tüm yeni ürünleri gör <span aria-hidden="true">→</span></Link>
    </div>
    <div className="catalog-product-grid">
      {products.slice(0, 10).map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  </section>;
}
