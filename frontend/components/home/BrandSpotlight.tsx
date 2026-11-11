"use client";

import type { Product, Brand, Banner } from "@/types";
import ProductCard from "@/components/product/ProductCard";
import { PromoBanner } from "./ThemePromos";
import styles from "./BrandSpotlight.module.css";

export interface BrandSpotlightData {
  brand: Brand;
  products: Product[];
  product_count: number;
}

export default function BrandSpotlight({ spotlight, banner }: { spotlight: BrandSpotlightData | null; banner?: Banner }) {
  if (!spotlight || !spotlight.products.length || !banner) return null;
  const { brand, products } = spotlight;

  return <section aria-label={`${brand.name} marka seçkisi`}>
    <div className={styles.row} tabIndex={0} aria-label="Marka bannerı ve ürünleri">
      <PromoBanner banner={banner} variant="brand" />
      {products.slice(0, 4).map((product) => <div key={product.id} className={styles.product}><ProductCard product={product} /></div>)}
    </div>
  </section>;
}
