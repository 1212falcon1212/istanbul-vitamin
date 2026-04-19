import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { fetchHomepageData } from "@/lib/homepage-api";
import { bannerImage } from "@/lib/placeholder-image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import HeroSection from "@/components/home/HeroSection";
import BrandMarquee from "@/components/home/BrandMarquee";
import CategoryBento from "@/components/home/CategoryBento";
import RecommendedProducts from "@/components/home/RecommendedProducts";
import SeasonalBanner from "@/components/home/SeasonalBanner";
import TrendingWall from "@/components/home/TrendingWall";
import BrandSpotlight from "@/components/home/BrandSpotlight";
import SkinConcerns from "@/components/home/SkinConcerns";
import DualBanner from "@/components/home/DualBanner";
import NewArrivals from "@/components/home/NewArrivals";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "DermoEczane — Dermokozmetik Ürünleri",
  description:
    "5.200'den fazla orijinal dermokozmetik ürün tek platformda. Cilt bakımı, saç bakımı, güneş ürünleri ve daha fazlası.",
};

// Ana sayfadaki tüm bölümler için tek standart genişlik.
const SECTION = "max-w-7xl mx-auto px-4 md:px-6 lg:px-8";

export default async function HomePage() {
  const data = await fetchHomepageData();

  const finalBanner =
    data.banners?.find((b) => b.position === "footer") ??
    data.banners?.[2] ??
    data.banners?.[0];
  const finalSrc = finalBanner?.image_url || bannerImage(undefined, "footer-banner");
  const finalHref = finalBanner?.link_url || "/markalar";

  return (
    <>
      <Header />
      <main>
        {/* Hero slider tam genişlik; yan bannerlar kendi içinde 7xl */}
        <HeroSection
          banners={data.banners}
          featuredProducts={data.trending.slice(0, 4)}
          categories={data.categories}
        />

        <BrandMarquee brands={data.brands} />

        <div className={`${SECTION} py-10 space-y-12`}>
          <RecommendedProducts products={data.recommended} />
          <CategoryBento categories={data.categories} />
          <SeasonalBanner banners={data.banners} />
          <TrendingWall products={data.trending} />
          <BrandSpotlight spotlight={data.spotlight} />
          <SkinConcerns concerns={data.concerns} />
          <DualBanner banners={data.banners} />
          <NewArrivals products={data.newArrivals} />

          {/* Final big banner */}
          <Link
            href={finalHref}
            aria-label={finalBanner?.title || "Tüm markalar"}
            className="block relative w-full max-w-full overflow-hidden rounded-2xl aspect-[16/9] sm:aspect-[16/6] md:aspect-[24/7] bg-white group"
          >
            <Image
              src={finalSrc}
              alt={finalBanner?.title || "Tüm markalar"}
              fill
              sizes="(min-width:1024px) 33vw, 100vw"
              className="object-contain transition-transform duration-700 group-hover:scale-105"
            />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
