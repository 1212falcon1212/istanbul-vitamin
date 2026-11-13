"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Brand, Category, Product } from "@/types";
import ProductCard from "./ProductCard";
import Spinner from "@/components/ui/Spinner";

export type SortOption =
  | "newest"
  | "trending"
  | "featured"
  | "price_asc"
  | "price_desc";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "En Yeni",
  trending: "Çok Satan",
  featured: "Öne Çıkan",
  price_asc: "Fiyat: Artan",
  price_desc: "Fiyat: Azalan",
};

interface LockedFilters {
  brand_id?: number;
  category_id?: number;
  concern?: string;
  campaign_id?: number;
}

interface SubcategoryLink {
  id: number;
  name: string;
  href: string;
}

interface ProductListingProps {
  locked?: LockedFilters;
  showBrandFilter?: boolean;
  showCategoryFilter?: boolean;
  apiBase?: string;
  /** Sol widget'ta gösterilecek alt kategori listesi (breadcrumb olmayan link liste). */
  subcategories?: SubcategoryLink[];
  /** Alt kategori bloğu başlığı. */
  subcategoriesTitle?: string;
}

const DEFAULT_API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const PER_PAGE = 24;

export default function ProductListing({
  locked = {},
  showBrandFilter = true,
  showCategoryFilter = true,
  apiBase = DEFAULT_API,
  subcategories,
  subcategoriesTitle = "Alt Kategoriler",
}: ProductListingProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState<SortOption>("newest");

  // Filter state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        locked,
        sort,
        selectedBrands,
        selectedCategory,
        minPrice,
        maxPrice,
        inStockOnly,
      }),
    [locked, sort, selectedBrands, selectedCategory, minPrice, maxPrice, inStockOnly]
  );

  // Load brand options — kategori seçiliyse o kategoriye özgü markaları çek
  const activeCategoryId = locked.category_id ?? selectedCategory ?? undefined;
  useEffect(() => {
    if (!showBrandFilter) return;
    const controller = new AbortController();
    async function loadBrands() {
      const all: Brand[] = [];
      for (let page = 1; ; page++) {
        const params = new URLSearchParams({ per_page: "500", page: String(page) });
        if (activeCategoryId) params.set("category_id", String(activeCategoryId));
        const res = await fetch(`${apiBase}/brands?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Markalar yüklenemedi");
        const json = await res.json();
        const list: Brand[] = Array.isArray(json.data) ? json.data : json.data?.brands ?? [];
        all.push(...list);
        if (!list.length || page >= (json.pagination?.total_pages ?? 1)) break;
      }
      if (controller.signal.aborted) return;
      setBrands(all);
      setSelectedBrands(prev => prev.filter(id => all.some(b => b.id === id)));
    }
    loadBrands().catch(() => {});
    return () => controller.abort();
  }, [apiBase, showBrandFilter, activeCategoryId]);

  useEffect(() => {
    if (!showCategoryFilter) return;
    fetch(`${apiBase}/categories/tree`)
      .then((r) => r.json())
      .then((j) => {
        const inner = j.data?.categories ?? j.data ?? [];
        setCategories(Array.isArray(inner) ? inner : []);
      })
      .catch(() => {});
  }, [apiBase, showCategoryFilter]);

  // Build query
  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("per_page", String(PER_PAGE));

      if (locked.brand_id) params.set("brand_id", String(locked.brand_id));
      if (locked.category_id) params.set("category_id", String(locked.category_id));
      if (locked.concern) params.set("concern", locked.concern);
      if (locked.campaign_id) params.set("campaign_id", String(locked.campaign_id));

      if (selectedBrands.length > 0 && !locked.brand_id) {
        params.set("brand_ids", selectedBrands.join(","));
      }
      if (selectedCategory && !locked.category_id) {
        params.set("category_id", String(selectedCategory));
      }
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      if (inStockOnly) params.set("in_stock", "1");

      const sortMap: Record<SortOption, string> = {
        newest: "newest",
        trending: "trending",
        featured: "featured",
        price_asc: "price_asc",
        price_desc: "price_desc",
      };
      params.set("sort", sortMap[sort]);

      return `${apiBase}/products?${params.toString()}`;
    },
    [apiBase, locked, selectedBrands, selectedCategory, minPrice, maxPrice, inStockOnly, sort]
  );

  const loadingRef = useRef(false);
  const previousFilter = useRef(filterKey);
  const requestUrl = buildUrl(page);
  useEffect(() => {
    const changed = previousFilter.current !== filterKey;
    previousFilter.current = filterKey;
    if (changed) {
      setProducts([]);
      setHasMore(true);
      if (page !== 1) { setPage(1); return; }
    }
    const controller = new AbortController();
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    fetch(requestUrl, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error("Ürünler yüklenemedi. Filtreleri kontrol edip tekrar deneyin.");
        return res.json();
      })
      .then(json => {
        if (controller.signal.aborted) return;
        const list: Product[] = Array.isArray(json.data) ? json.data : json.data?.products ?? [];
        setProducts(prev => page === 1 ? list : [...prev, ...list.filter(p => !prev.some(old => old.id === p.id))]);
        setHasMore(page < (json.pagination?.total_pages ?? 1) && list.length > 0);
      })
      .catch(err => {
        if (!controller.signal.aborted) { setError(err.message); setHasMore(false); }
      })
      .finally(() => {
        if (!controller.signal.aborted) { setLoading(false); loadingRef.current = false; }
      });
    return () => controller.abort();
  }, [requestUrl, filterKey, page, retry]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  const toggleBrand = (id: number) =>
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategory(null);
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedCategory !== null ||
    minPrice !== "" ||
    maxPrice !== "" ||
    inStockOnly;

  return (
    <div className="theme-listing grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div className="theme-filters bg-white space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base text-text-primary">Filtrele</h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-primary hover:underline"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Subcategories (breadcrumb tree) */}
          {subcategories && subcategories.length > 0 && (
            <FilterSection title={subcategoriesTitle}>
              <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-2">
                {subcategories.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={s.href}
                      className="block text-sm text-text-primary hover:text-primary hover:bg-primary-soft/40 rounded-md px-2 py-1.5 transition-colors"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </FilterSection>
          )}

          {/* Price */}
          <FilterSection title="Fiyat">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-primary"
              />
              <span className="text-text-secondary">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </FilterSection>

          {/* In stock */}
          <FilterSection title="Stok Durumu">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              Sadece stokta olanlar
            </label>
          </FilterSection>

          {/* Brands */}
          {showBrandFilter && brands.length > 0 && (
            <FilterSection title="Markalar">
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {brands.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-primary"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b.id)}
                      onChange={() => toggleBrand(b.id)}
                      className="accent-primary w-4 h-4"
                    />
                    <span className="truncate">{b.name}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
          )}

          {/* Categories */}
          {showCategoryFilter && categories.length > 0 && (
            <FilterSection title="Kategoriler">
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === c.id ? null : c.id
                      )
                    }
                    className={[
                      "block w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                      selectedCategory === c.id
                        ? "bg-primary-soft text-primary font-medium"
                        : "text-text-primary hover:bg-primary-soft/50",
                    ].join(" ")}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0">
        <div className="theme-shop-banner"><span>Bakım dünyasını keşfet</span><h2>Aradığın bakım, sevdiğin markalar.</h2><p>Ürünleri ihtiyacına göre filtrele, sana uygun seçimi yap.</p><Link href="/markalar">Markaları keşfet →</Link></div>
        {/* Toolbar */}
        <div className="theme-toolbar flex items-center justify-between mb-4 gap-3">
          <p className="text-sm text-text-secondary">
            {products.length > 0
              ? `${products.length} ürün görüntüleniyor`
              : loading
                ? "Yükleniyor..."
                : ""}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary hidden sm:block">
              Sırala
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="theme-listing-products">
          {error ? <div role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Tekrar dene</button></div> : products.length === 0 && !loading ? (
            <div className="py-16 text-center text-text-secondary">
              Bu kriterlere uygun ürün bulunamadı.
            </div>
          ) : (
            <div className="catalog-product-grid">
              {products.map((p, i) => (
                <ProductCard key={`${p.id}-${i}`} product={p} index={i} variant="vertical" />
              ))}
            </div>
          )}
        </div>

        {/* Sentinel + spinner */}
        <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-6">
          {loading && <Spinner size="md" />}
          {!hasMore && products.length > 0 && (
            <span className="text-xs text-text-secondary">
              Tüm ürünler yüklendi.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="font-display text-sm text-text-primary mb-3 uppercase tracking-widest">
        {title}
      </h3>
      {children}
    </div>
  );
}
