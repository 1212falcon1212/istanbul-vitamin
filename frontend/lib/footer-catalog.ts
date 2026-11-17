import type { Category } from "@/types";

export interface FooterLink { id: number; label: string; href: string }
export interface FooterCatalog { categories: FooterLink[]; brands: FooterLink[]; products: FooterLink[]; articles: FooterLink[] }
export const emptyFooterCatalog: FooterCatalog = { categories: [], brands: [], products: [], articles: [] };

export function footerIds(raw: string): number[] {
  return [...new Set(raw.split(",").map(Number).filter(n => Number.isSafeInteger(n) && n > 0))].slice(0, 20);
}
export function footerSelection(items: FooterLink[], raw: string, limit: number, maximum = 20) {
  const ids = footerIds(raw);
  const selected = ids.length ? ids.flatMap(id => items.filter(item => item.id === id)) : items;
  const count = Number.isFinite(limit) ? Math.max(0, Math.min(maximum, Math.floor(limit))) : 0;
  return selected.filter((item, index, all) => all.findIndex(other => other.href === item.href) === index).slice(0, count);
}
export function footerCategories(categories: Category[], parent = ""): FooterLink[] {
  const active = categories.filter(category => category.is_active !== false);
  const roots = active.map(category => ({ id: category.id, label: category.name, href: `${parent}/${encodeURIComponent(category.slug)}` }));
  return [...roots, ...active.flatMap(category => footerCategories(category.children ?? [], `${parent}/${encodeURIComponent(category.slug)}`))];
}
