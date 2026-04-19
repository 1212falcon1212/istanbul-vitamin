/**
 * Kategori slug → Iconify ikon adı eşlemesi.
 * Kullanımı: <Icon icon={categoryIcon(slug)} />
 */

const MAP: Record<string, string> = {
  "cilt-bakimi": "ph:drop-duotone",
  "makyaj": "mdi:lipstick",
  "sac-bakimi": "tabler:scissors",
  "gunes-urunleri": "tabler:sun",
  "anne-bebek": "ph:baby-duotone",
  "kisisel-bakim": "material-symbols:spa-outline",
  "besin-takviyeleri": "tabler:leaf",
  "vitamin": "fluent:food-apple-24-regular",
  "vitaminler": "fluent:food-apple-24-regular",
  "vucut-bakimi": "ph:heart-duotone",
  "kampanyalar": "ph:gift-duotone",
};

// Varsayılan ikon — eşleşme yoksa
const DEFAULT_ICON = "ph:tag-duotone";

export function categoryIcon(slug?: string | null): string {
  if (!slug) return DEFAULT_ICON;
  return MAP[slug] ?? DEFAULT_ICON;
}
