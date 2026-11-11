import type { Metadata } from "next";
import Link from "next/link";
import { fetchHomepageData } from "@/lib/homepage-api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import CategoryProducts from "@/components/home/CategoryProducts";
import ProductSelection from "@/components/home/ProductSelection";
import BrandSpotlight from "@/components/home/BrandSpotlight";
import ThemePromos from "@/components/home/ThemePromos";
import BannerProductRows from "@/components/home/BannerProductRows";
import { bannersAt } from "@/lib/banner-slots";
import ProductCard from "@/components/product/ProductCard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "İstanbul Vitamin — Dermokozmetik Ürünleri",
  description:
    "5.200'den fazla orijinal dermokozmetik ürün tek platformda. Cilt bakımı, saç bakımı, güneş ürünleri ve daha fazlası.",
};

export default async function HomePage() {
  const data = await fetchHomepageData();
  return <>
    <Header />
    <main className="storefront-home grogin-home">
      <HeroSection banners={data.banners} featuredProducts={data.trending.slice(0,4)} categories={data.categories} />
      <div className="theme-container theme-home-sections">
        <ThemePromos banners={data.banners} position="promo_triple" />
        <ProductSelection newArrivals={data.newArrivals} bestSellers={data.bestSellers} />
        <ThemePromos banners={data.banners} position="promo_tall" />
        <section aria-labelledby="theme-featured-title">
          <div className="catalog-section-heading"><div><h2 id="theme-featured-title">Öne çıkan ürünler</h2><p>Bakım rutinin için seçtiğimiz ürünleri keşfet.</p></div><Link className="catalog-section-link" href="/magaza">Tümünü gör →</Link></div>
          <div className="catalog-product-grid">{data.trending.slice(0,12).map(product => <ProductCard key={product.id} product={product}/>)}</div>
        </section>
        <ThemePromos banners={data.banners} position="promo_wide" />
        <BannerProductRows banners={data.banners} products={data.bestSellers} />
        <ThemePromos banners={data.banners} position="promo_strip" />
        <BrandSpotlight spotlight={data.spotlight} banner={bannersAt(data.banners, "promo_brand")[0]}/>
        <CategoryProducts categories={data.categories}/>

        <section aria-label="Markalar"><div className="catalog-section-heading"><div><h2>Seçkin markalar</h2><p>Dermokozmetik dünyasının markaları.</p></div><Link href="/markalar" className="catalog-section-link">Tümünü gör →</Link></div><div className="theme-brand-list">{data.brands.slice(0,6).map(brand => <Link key={brand.id} href={`/markalar/${brand.slug}`}><strong>{brand.name}</strong><span>Ürünleri keşfet →</span></Link>)}</div></section>
      </div>
    </main><Footer />
  </>;
}
