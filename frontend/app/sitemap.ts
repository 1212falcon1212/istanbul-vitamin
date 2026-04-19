import type { MetadataRoute } from "next";
import type { Brand, Category, Product } from "@/types";
import { fetchAPI } from "@/lib/fetch-api";

// Next.js 16: sitemap route. Revalidate hourly so search engines always
// see a recent index without hammering the backend on every request.
export const revalidate = 3600;

type SitemapEntry = MetadataRoute.Sitemap[number];

function flattenCategories(nodes: Category[]): Category[] {
  const flat: Category[] = [];
  const walk = (list: Category[]) => {
    for (const node of list) {
      flat.push(node);
      if (node.children && node.children.length > 0) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return flat;
}

function buildCategoryPath(
  node: Category,
  lookup: Map<number, Category>
): string {
  const parts: string[] = [];
  let cursor: Category | undefined = node;
  // Walk up the parent chain so the sitemap URL mirrors the catch-all
  // `/[...categorySlug]` route. Protect against malformed data by capping depth.
  let guard = 0;
  while (cursor && guard < 16) {
    parts.unshift(cursor.slug);
    if (cursor.parent_id == null) break;
    cursor = lookup.get(cursor.parent_id);
    guard += 1;
  }
  return parts.join("/");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
  const now = new Date();

  const staticPaths: Array<{
    path: string;
    changeFrequency: SitemapEntry["changeFrequency"];
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/magaza", changeFrequency: "daily", priority: 0.8 },
    { path: "/markalar", changeFrequency: "weekly", priority: 0.8 },
    { path: "/kampanyalar", changeFrequency: "daily", priority: 0.8 },
    { path: "/one-cikanlar", changeFrequency: "daily", priority: 0.8 },
    { path: "/hakkimizda", changeFrequency: "monthly", priority: 0.5 },
  ];

  const staticEntries: SitemapEntry[] = staticPaths.map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  // Fetch everything in parallel; each helper returns null on failure so
  // a single backend hiccup cannot wipe the whole sitemap.
  const [products, categoryTree, brands] = await Promise.all([
    fetchAPI<Product[]>("/products?per_page=1000", { revalidate: 3600 }),
    fetchAPI<Category[]>("/categories/tree", { revalidate: 3600 }),
    fetchAPI<Brand[]>("/brands?per_page=500", { revalidate: 3600 }),
  ]);

  const productEntries: SitemapEntry[] = (products ?? []).map((product) => ({
    url: `${base}/urun/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const categoryEntries: SitemapEntry[] = (() => {
    if (!categoryTree || categoryTree.length === 0) return [];
    const flat = flattenCategories(categoryTree).filter(
      (c) => c.is_active !== false
    );
    const lookup = new Map<number, Category>(flat.map((c) => [c.id, c]));
    return flat.map((category) => ({
      url: `${base}/${buildCategoryPath(category, lookup)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  })();

  const brandEntries: SitemapEntry[] = (brands ?? [])
    .filter((b) => b.is_active !== false)
    .map((brand) => ({
      url: `${base}/markalar/${brand.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...brandEntries,
    ...productEntries,
  ];
}
