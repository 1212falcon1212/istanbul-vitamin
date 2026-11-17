import "server-only";
import { cache } from "react";
import type { Brand, Category, Product, Page } from "@/types";
import { parseHomeContent } from "./home-content";
import { footerCategories, footerIds, type FooterCatalog } from "./footer-catalog";

const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
async function resource<T>(path: string, fresh = false): Promise<T | null> {
  try {
    const response = await fetch(`${API}${path}`, {
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    return (await response.json()).data as T;
  } catch { return null; }
}

export const getFooterData = cache(async () => {
  // Only the explicitly public settings endpoint is serialized into HTML.
  const response = await resource<{ settings: Record<string, string> }>("/settings", true);
  const settings = response?.settings ?? {};
  const c = parseHomeContent(settings.homepage_content).footer;
  const productIds = footerIds(c.productIds).slice(0, 12);
  const slugs = [...new Set(c.blogSlugs.split(",").map(s => s.trim()).filter(s => /^[\p{L}\p{N}_-]+$/u.test(s)))].slice(0, 8);
  const [categories, brands, products, pages] = await Promise.all([
    c.catalogEnabled ? resource<{ categories: Category[] }>("/categories/tree") : null,
    c.catalogEnabled ? resource<Brand[]>("/brands?per_page=500") : null,
    c.catalogEnabled ? resource<{ products: Product[] }>(`/products?per_page=12&sort=newest${productIds.length ? `&ids=${productIds.join(",")}` : ""}`) : null,
    c.blogEnabled ? Promise.all(slugs.map(slug => resource<{ page: Page }>(`/pages/${encodeURIComponent(slug)}`))) : [],
  ]);
  const catalog: FooterCatalog = {
    categories: footerCategories(categories?.categories ?? []),
    brands: (Array.isArray(brands) ? brands : []).filter(b => b.is_active !== false).map(b => ({ id: b.id, label: b.name, href: `/markalar/${encodeURIComponent(b.slug)}` })),
    products: (products?.products ?? []).map(p => ({ id: p.id, label: p.name, href: `/urun/${encodeURIComponent(p.slug)}` })),
    articles: pages.flatMap(result => {
      const p = result?.page;
      return p?.is_active && p.content?.replace(/<[^>]*>/g, "").trim()
        ? [{ id: p.id, label: p.title, href: `/${encodeURIComponent(p.slug)}` }] : [];
    }),
  };
  return { settings, catalog };
});
