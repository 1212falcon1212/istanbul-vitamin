import Link from "next/link";
import type { Banner, Product } from "@/types";
import { bannersAt } from "@/lib/banner-slots";
import ProductCard from "@/components/product/ProductCard";
import { PromoBanner } from "./ThemePromos";

export default function BannerProductRows({ banners, products }: { banners: Banner[]; products: Product[] }) {
  const promos = bannersAt(banners, "promo_inline");
  if (!promos.length) return null;
  return <section aria-labelledby="banner-products-title">
    <div className="catalog-section-heading"><div><h2 id="banner-products-title">Çok satanlar</h2><p>En çok tercih edilen ürünleri keşfet.</p></div><Link href="/magaza?sort=trending" className="catalog-section-link">Tümünü gör →</Link></div>
    <div className="banner-product-rows">
      {promos.map((banner, index) => <div className="banner-product-row" key={banner.id}>
        {products.slice(index * 4, index * 4 + 2).map(product => <ProductCard key={product.id} product={product} />)}
        <PromoBanner banner={banner} variant="inline" />
        {products.slice(index * 4 + 2, index * 4 + 4).map(product => <ProductCard key={product.id} product={product} />)}
      </div>)}
    </div>
  </section>;
}
