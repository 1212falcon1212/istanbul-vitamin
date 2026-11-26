import { cache } from "react";
import { parseHomeContent, type HomeContent } from "./home-content";
import type { Category, Product, ProductCardData, Brand, Banner } from "@/types";
import type { BrandSpotlightData } from "@/components/home/BrandSpotlight";

const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// ----------------------------------------------------------------
// Internal response types (match Go backend)
// ----------------------------------------------------------------

interface CategoriesResponse {
  categories: Category[];
}
interface ProductsResponse {
  products: Product[];
}
interface BannersResponse {
  banners: Banner[];
}

export interface HomepageData {
  content: HomeContent;
  categories: Category[];
  trending: ProductCardData[];
  bestSellers: ProductCardData[];
  spotlight: BrandSpotlightData | null;
  newArrivals: ProductCardData[];
  brands: Brand[];
  banners: Banner[];
}

// ----------------------------------------------------------------
// Fetcher
// ----------------------------------------------------------------

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------
// Homepage Data Aggregator
// ----------------------------------------------------------------

export const fetchHomepageData = cache(
  async function (): Promise<HomepageData> {
    const [
      categories,
      trendingRaw,
      recommendedRaw,
      spotlightRaw,
      newArrivalsRaw,
      brandsRaw,
      bannersRaw,
      settingsRaw,
    ] = await Promise.all([
      safeFetch<CategoriesResponse>(`${API}/categories/tree`),
      safeFetch<ProductsResponse>(`${API}/products?sort=trending&per_page=30`),
      safeFetch<ProductsResponse>(`${API}/products?sort=featured&per_page=12`),
      safeFetch<BrandSpotlightData>(`${API}/brands/spotlight`),
      safeFetch<ProductsResponse>(`${API}/products?sort=newest&per_page=12`),
      safeFetch<Brand[]>(`${API}/brands?per_page=500`),
      safeFetch<BannersResponse>(`${API}/banners`),
      safeFetch<{ settings: Record<string, string> }>(`${API}/settings`),
    ]);

    const content = parseHomeContent(settingsRaw?.settings?.homepage_content);
    const customBrand = content.spotlight.brandSlug
      ? await safeFetch<{ brand: Brand }>(
          `${API}/brands/${encodeURIComponent(content.spotlight.brandSlug)}`,
        )
      : null;
    const spotlightBrand = content.spotlight.brandSlug
      ? customBrand?.brand
      : spotlightRaw?.brand;
    // Resolve an explicitly selected brand before loading its products.
    const spotlightProducts = spotlightBrand?.id
      ? await safeFetch<ProductsResponse>(
          `${API}/products?brand_id=${spotlightBrand.id}&sort=trending&per_page=12`,
        )
      : null;

    async function curated(raw: string, fallback: Product[]) {
      const ids = [
        ...new Set(
          raw
            .split(",")
            .map(Number)
            .filter((n) => Number.isInteger(n) && n > 0),
        ),
      ].slice(0, 12);
      if (!ids.length) return fallback;
      const result = await safeFetch<ProductsResponse>(
        `${API}/products?ids=${ids.join(",")}&per_page=12`,
      );
      return ids.flatMap((id) =>
        (result?.products ?? []).filter((p) => p.id === id),
      );
    }
    const trendingProducts = trendingRaw?.products ?? [];
    const recommendedProducts = recommendedRaw?.products ?? [];

    // "Sizin için seçtiklerimiz" 10'a kadar — featured boşsa trending sonundan al
    const recommended = (
      recommendedProducts.length > 0
        ? recommendedProducts
        : trendingProducts.slice(-10)
    ).slice(0, 12);

    // Trending 10'a kadar — recommended ile çakışanları çıkar
    const recommendedIds = new Set(recommended.map((p) => p.id));
    const trending = trendingProducts
      .filter((p) => !recommendedIds.has(p.id))
      .slice(0, 12);

    function card({ id, slug, name, price, compare_price, stock, created_at, review_stats, brand, images }: Product): ProductCardData {
      const image = images?.find(item => item.is_primary) ?? images?.[0];
      return { id, slug, name, price, compare_price, stock, created_at, review_stats, brand, images: image ? [image] : [] };
    }

    const [featured, best, spotlightItems, newest] = await Promise.all([
      curated(content.featured.productIds, trending),
      curated(content.selection.bestProductIds, trendingProducts.filter(p => p.sold_count > 0).slice(0, 12)),
      spotlightBrand ? curated(content.spotlight.productIds, spotlightProducts?.products ?? []) : [],
      curated(content.selection.newProductIds, newArrivalsRaw?.products ?? []),
    ]);
    return {
      content,
      categories: categories?.categories ?? [],
      trending: featured.map(card),
      bestSellers: best.map(card),
      spotlight: spotlightBrand ? {
        brand: spotlightBrand,
        product_count: spotlightRaw?.product_count ?? 0,
        products: spotlightItems.map(card),
      } : null,
      newArrivals: newest.map(card),
      brands: Array.isArray(brandsRaw) ? brandsRaw : [],
      banners: bannersRaw?.banners ?? [],
    };
  },
);
