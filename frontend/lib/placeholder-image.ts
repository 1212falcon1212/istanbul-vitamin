/**
 * Local banner image pool. Görseller /public/banners altında.
 * Backend boş dönse bile anlamlı fallback.
 */

export const LOCAL_BANNERS = [
  "/banners/slider-hediyeli-avene13-tr-320.jpg",
  "/banners/slider-hediyeli-vichy-tr-217.jpg",
  "/banners/papatya-slider-bioderma4-tr-335.jpg",
  "/banners/mobil-papatya-ducray13-tr-22.jpg",
  "/banners/mobil-hediyeli-bioxcin-tr-27.jpg",
  "/banners/marc-anthony-festival-roller-mobil-tr-8.jpg",
  "/banners/idea-derma-mobil6-tr-22.jpg",
  "/banners/from-natura-mobil5-tr-20.jpg",
  "/banners/alls-mobil-1nisan-tr-21.jpg",
] as const;

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pickBanner(seed: string | number): string {
  const s = String(seed);
  return LOCAL_BANNERS[hash(s) % LOCAL_BANNERS.length];
}

export function bannerImage(_title?: string, seed: string | number = "default"): string {
  return pickBanner(seed);
}

export function stockImage(keywords: string, _w = 1200, _h = 600, seed?: string | number): string {
  return pickBanner(seed ?? keywords);
}

export function brandImage(brandName: string): string {
  return pickBanner(brandName);
}
