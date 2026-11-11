"use client";

import Link from "next/link";
import type { Product } from "@/types";
import ProductCard from "@/components/product/ProductCard";

export default function TrendingWall({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return <section>
    <div className="catalog-section-heading">
      <div><h2>Bu hafta çok aranan.</h2><p>Dermokozmetik ürün seçkimizi keşfedin.</p></div>
      <Link href="/magaza" className="catalog-section-link">Tüm ürünleri gör <span aria-hidden="true">→</span></Link>
    </div>
    <div className="catalog-product-grid">
      {products.slice(0, 10).map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  </section>;
}
