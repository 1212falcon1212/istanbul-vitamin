import { Fragment } from "react";
import { safeContentLink, selectedByIds } from "@/lib/home-content";
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

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await fetchHomepageData();
  return { title: content.seo.title, description: content.seo.description };
}

export default async function HomePage() {
  const data = await fetchHomepageData();
  const c = data.content;
  const sections: Record<string, React.ReactNode> = {
    promo_triple: (
      <ThemePromos banners={data.banners} position="promo_triple" />
    ),
    selection: (
      <ProductSelection
        newArrivals={data.newArrivals}
        bestSellers={data.bestSellers}
      />
    ),
    promo_tall: <ThemePromos banners={data.banners} position="promo_tall" />,
    featured: (
      <section aria-labelledby="theme-featured-title">
        <div className="catalog-section-heading">
          <div>
            <h2 id="theme-featured-title">{c.featured.title}</h2>
            <p>{c.featured.description}</p>
          </div>
          <Link
            className="catalog-section-link"
            href={safeContentLink(c.featured.href)}
          >
            {c.featured.linkText}
          </Link>
        </div>
        <div className="catalog-product-grid">
          {data.trending.slice(0, 12).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    ),
    promo_wide: <ThemePromos banners={data.banners} position="promo_wide" />,
    inline: (
      <BannerProductRows banners={data.banners} products={data.bestSellers} />
    ),
    promo_strip: <ThemePromos banners={data.banners} position="promo_strip" />,
    spotlight: (
      <BrandSpotlight
        spotlight={data.spotlight}
        banner={bannersAt(data.banners, "promo_brand")[0]}
      />
    ),
    categories: (
      <CategoryProducts
        categories={selectedByIds(data.categories, c.categories.categoryIds)}
      />
    ),
    brands: (
      <section aria-label="Markalar">
        <div className="catalog-section-heading">
          <div>
            <h2>{c.brands.title}</h2>
            <p>{c.brands.description}</p>
          </div>
          <Link
            href={safeContentLink(c.brands.href)}
            className="catalog-section-link"
          >
            {c.brands.linkText}
          </Link>
        </div>
        <div className="theme-brand-list">
          {selectedByIds(data.brands, c.brands.brandIds)
            .slice(0, Math.max(1, Math.min(30, c.brands.limit)))
            .map((brand) => (
              <Link key={brand.id} href={`/markalar/${brand.slug}`}>
                <strong>{brand.name}</strong>
                <span>{c.brands.cardText}</span>
              </Link>
            ))}
        </div>
      </section>
    ),
  };
  return (
    <>
      <Header />
      <main className="storefront-home grogin-home">
        {c.hero.enabled && (
          <HeroSection
            banners={data.banners}
            featuredProducts={data.trending.slice(0, 4)}
            categories={data.categories}
          />
        )}
        <div className="theme-container theme-home-sections">
          {c.sections
            .filter((s) => s.enabled)
            .map((s) => (
              <Fragment key={s.id}>{sections[s.id]}</Fragment>
            ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
