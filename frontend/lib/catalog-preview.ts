/** Visual fixtures only. Never written to the catalog, reviews or cart. */
const examples: Record<number, { rating: number; count: number; comparePrice: number; favorite?: boolean }> = {
  5201: { rating: 4.7, count: 328, comparePrice: 279.90 },
  1280: { rating: 4.8, count: 615, comparePrice: 699.90, favorite: true },
  512: { rating: 4.7, count: 1042, comparePrice: 875 },
  1536: { rating: 4.6, count: 412, comparePrice: 725 },
  768: { rating: 4.8, count: 287, comparePrice: 1075, favorite: true },
  2048: { rating: 4.5, count: 193, comparePrice: 199.90 },
};

export function catalogPreviewEnabled(hostname: string) {
  return process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_CATALOG_PREVIEW === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function catalogPreview(product: { id: number; price: number }) {
  return examples[product.id] ?? {
    rating: 4.5 + (product.id % 4) / 10,
    count: 120 + product.id % 500,
    comparePrice: Math.round(product.price / 0.8 * 100) / 100,
    favorite: false,
  };
}
