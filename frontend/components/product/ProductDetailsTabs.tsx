"use client";
import { useRef } from "react";
import type { Product } from "@/types";
import { sanitizeHtml } from "@/lib/sanitize";
import { useProductReviews } from "@/lib/product-reviews";
import ProductReviews from "./ProductReviews";

export type ProductTab = "description" | "specs" | "reviews";
export default function ProductDetailsTabs({ product, tab, onTabChange }: { product: Product; tab: ProductTab; onTabChange: (tab: ProductTab) => void }) {
  const { data } = useProductReviews(product.id);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs: { id: ProductTab; label: string }[] = [
    { id: "description", label: "Açıklama" },
    { id: "specs", label: "Ek bilgiler" },
    { id: "reviews", label: `Değerlendirmeler${data ? ` (${data.data.stats.total_count})` : ""}` },
  ];
  const details = [
    ["Ürün", product.name], ["Marka", product.brand?.name], ["SKU", product.sku], ["Barkod", product.barcode],
    ["Kategoriler", product.categories?.map(c => c.name).join(", ")],
    ["Seçenekler", product.variants?.filter(v => v.is_active).map(v => v.name).join(", ")],
  ].filter((entry): entry is [string,string] => Boolean(entry[1]));
  return <section id="product-details-tabs" className="pdp-tabs">
    <div role="tablist" aria-label="Ürün detayları" className="pdp-tab-list">
      {tabs.map((item,index) => <button type="button" key={item.id} ref={el => { buttons.current[index] = el; }} role="tab" id={`product-tab-${item.id}`} aria-controls={`product-panel-${item.id}`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => onTabChange(item.id)} onKeyDown={e => {
        if (!["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length-1 : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        onTabChange(tabs[next].id); buttons.current[next]?.focus();
      }}>{item.label}</button>)}
    </div>
    <div role="tabpanel" id="product-panel-description" aria-labelledby="product-tab-description" hidden={tab !== "description"} tabIndex={0} className="pdp-tab-panel">
      {product.description ? <div className="pdp-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}/> : <p>Bu ürün için henüz açıklama eklenmemiştir.</p>}
    </div>
    <div role="tabpanel" id="product-panel-specs" aria-labelledby="product-tab-specs" hidden={tab !== "specs"} tabIndex={0} className="pdp-tab-panel">
      <dl className="pdp-specs">{details.map(([name,value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    <div role="tabpanel" id="product-panel-reviews" aria-labelledby="product-tab-reviews" hidden={tab !== "reviews"} tabIndex={0} className="pdp-tab-panel">
      {tab === "reviews" && <ProductReviews productId={product.id} productName={product.name} />}
    </div>
  </section>;
}
