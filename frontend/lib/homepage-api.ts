import type { Category, Product, Brand, Banner } from "@/types";
import type { BrandSpotlightData } from "@/components/home/BrandSpotlight";
import type { ConcernItem } from "@/components/home/SkinConcerns";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// ----------------------------------------------------------------
// Internal response types (match Go backend)
// ----------------------------------------------------------------

interface CategoriesResponse { categories: Category[] }
interface ProductsResponse { products: Product[] }
interface ConcernsResponse { concerns: ConcernItem[] }
interface BannersResponse { banners: Banner[] }

export interface HomepageData {
  categories: Category[];
  trending: Product[];
  recommended: Product[];
  spotlight: BrandSpotlightData | null;
  concerns: ConcernItem[];
  newArrivals: Product[];
  brands: Brand[];
  banners: Banner[];
}

// ----------------------------------------------------------------
// Fetcher
// ----------------------------------------------------------------

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
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

export async function fetchHomepageData(): Promise<HomepageData> {
  const [categories, trendingRaw, recommendedRaw, spotlightRaw, concernsRaw,
         newArrivalsRaw, brandsRaw, bannersRaw] = await Promise.all([
    safeFetch<CategoriesResponse>(`${API}/categories/tree`),
    safeFetch<ProductsResponse>(`${API}/products?sort=trending&per_page=18`),
    safeFetch<ProductsResponse>(`${API}/products?sort=featured&per_page=9`),
    safeFetch<BrandSpotlightData>(`${API}/brands/spotlight`),
    safeFetch<ConcernsResponse>(`${API}/skin-concerns`),
    safeFetch<ProductsResponse>(`${API}/products?sort=newest&per_page=9`),
    safeFetch<Brand[]>(`${API}/brands?limit=15`),
    safeFetch<BannersResponse>(`${API}/banners`),
  ]);

  const trendingProducts = trendingRaw?.products ?? [];
  const recommendedProducts = recommendedRaw?.products ?? [];

  // "Sizin için seçtiklerimiz" 9'a kadar — featured boşsa trending sonundan al
  const recommended = (
    recommendedProducts.length > 0
      ? recommendedProducts
      : trendingProducts.slice(-9)
  ).slice(0, 9);

  // Trending 9'a kadar — recommended ile çakışanları çıkar
  const recommendedIds = new Set(recommended.map((p) => p.id));
  const trending = trendingProducts
    .filter((p) => !recommendedIds.has(p.id))
    .slice(0, 9);

  return {
    categories:  categories?.categories ?? [],
    trending,
    recommended,
    spotlight:   spotlightRaw ?? null,
    concerns:    concernsRaw?.concerns ?? [],
    newArrivals: newArrivalsRaw?.products ?? [],
    brands:      Array.isArray(brandsRaw) ? brandsRaw : [],
    banners:     bannersRaw?.banners ?? [],
  };
}
