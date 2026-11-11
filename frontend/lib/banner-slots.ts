import type { Banner } from "@/types";

// Export dimensions are twice the reference display dimensions.
export const bannerPositions = [
  { value: "hero", label: "01 · Ana slider", size: "1800 × 880 px", limit: 0 },
  { value: "promo_triple", label: "02 · Hero altı üçlü yatay", size: "900 × 460 px", limit: 3 },
  { value: "promo_tall", label: "03 · Yeni gelenler altı dörtlü dikey", size: "660 × 820 px", limit: 4 },
  { value: "promo_wide", label: "04 · Öne çıkan ürünler altı ikili geniş", size: "1380 × 580 px", limit: 2 },
  { value: "promo_inline", label: "05 · Çok satanlar arası bannerlar", size: "880 × 880 px", limit: 2 },
  { value: "promo_strip", label: "06 · Alt kampanya şeridi", size: "2760 × 200 px", limit: 1 },
  { value: "promo_brand", label: "07 · Marka ürünleri yanı", size: "660 × 880 px", limit: 1 },
  { value: "hero_tile", label: "Eski üçlü kart (gösterilmiyor)", size: "900 × 1000 px", limit: 0 },
  { value: "seasonal", label: "Eski sezon bannerı (gösterilmiyor)", size: "1800 × 600 px", limit: 0 },
  { value: "mid", label: "Eski orta banner (gösterilmiyor)", size: "900 × 460 px", limit: 0 },
  { value: "footer", label: "Eski final bannerı (gösterilmiyor)", size: "1800 × 600 px", limit: 0 },
] as const;

export function bannersAt(banners: Banner[], position: string) {
  const limit = bannerPositions.find(p => p.value === position)?.limit;
  const selected = banners.filter(b => b.is_active && b.position === position)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return limit ? selected.slice(0, limit) : selected;
}

export function bannerLink(url?: string) {
  return url && (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url)) ? url : "/magaza";
}
