"use client";
import useSWR from "swr";

export interface ProductReview {
  id: number;
  rating: number;
  title?: string;
  body: string;
  created_at: string;
  user?: { first_name: string; last_name: string };
}
interface ReviewResponse {
  data: { reviews: ProductReview[]; stats: { average_rating: number; total_count: number } };
  pagination: { page: number; total_pages: number };
}
async function fetchReviews(path: string): Promise<ReviewResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}${path}`);
  if (!res.ok) throw new Error("Değerlendirmeler yüklenemedi.");
  return res.json();
}
export function useProductReviews(productId: number, page = 1) {
  return useSWR(`/products/${productId}/reviews?per_page=5&page=${page}`, fetchReviews, { revalidateOnFocus: false });
}
