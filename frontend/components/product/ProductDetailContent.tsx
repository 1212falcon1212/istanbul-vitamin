"use client";
import { useState } from "react";
import type { Product } from "@/types";
import { calcDiscount } from "@/lib/utils";
import ProductGallery from "./ProductGallery";
import ProductInfoBound from "./ProductInfoBound";
import ProductDetailsTabs, { type ProductTab } from "./ProductDetailsTabs";

export default function ProductDetailContent({ product }: { product: Product }) {
  const [tab, setTab] = useState<ProductTab>("description");
  function showTab(next: ProductTab) {
    setTab(next);
    document.getElementById(`product-tab-${next}`)?.focus();
    document.getElementById("product-details-tabs")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  return <>
    <div className="pdp-main-grid">
      <ProductGallery images={product.images ?? []} productName={product.name} discount={product.compare_price ? calcDiscount(product.price, product.compare_price) : 0}/>
      <ProductInfoBound product={product} onShowTab={showTab}/>
    </div>
    <ProductDetailsTabs product={product} tab={tab} onTabChange={setTab}/>
  </>;
}
