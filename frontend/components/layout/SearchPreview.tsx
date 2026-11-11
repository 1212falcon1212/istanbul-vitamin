"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { Product } from "@/types";
import ProductCard from "@/components/product/ProductCard";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface SearchPreviewProps {
  query: string;
  /** Panel açık olsun mu (input focused + query>=2). */
  open: boolean;
  /** Sonuç seçildiğinde kapatmak için. */
  onClose?: () => void;
}

const fetcher = async (url: string): Promise<Product[]> => {
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const inner =
    json.data?.products ?? (Array.isArray(json.data) ? json.data : []);
  return Array.isArray(inner) ? inner : [];
};

export default function SearchPreview({
  query,
  open,
  onClose,
}: SearchPreviewProps) {
  const trimmed = useMemo(() => query.trim(), [query]);

  // Debounced query — 200ms beklemeden SWR çağrılmasın
  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(trimmed), 200);
    return () => clearTimeout(t);
  }, [trimmed]);

  // SWR: dedup + cache. 2 karakterden kısa ise key null → fetch yok.
  const key =
    debouncedQuery.length >= 2
      ? `${API}/search/autocomplete?q=${encodeURIComponent(debouncedQuery)}&limit=6`
      : null;
  const { data, isLoading } = useSWR<Product[]>(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30s aynı query re-dedupe
  });
  const results = data ?? [];
  const loading = isLoading;

  if (!open || trimmed.length < 2) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-border ring-1 ring-primary/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest text-text-secondary font-semibold">
            {loading
              ? "Aranıyor…"
              : results.length > 0
                ? `${results.length} ürün bulundu`
                : "Sonuç yok"}
          </p>
          <Link
            href={`/arama?q=${encodeURIComponent(trimmed)}`}
            onClick={onClose}
            className="text-[11px] text-primary hover:underline"
          >
            Tümünü gör →
          </Link>
        </div>

        {/* Results */}
        {loading && results.length === 0 ? (
          <ul className="px-2 py-3 space-y-1">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-14 bg-bg-primary/60 rounded-lg animate-pulse" />
            ))}
          </ul>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-secondary">
              <strong>{trimmed}</strong> için eşleşme bulunamadı.
            </p>
            <Link
              href={`/arama?q=${encodeURIComponent(trimmed)}`}
              onClick={onClose}
              className="inline-block mt-2 text-xs text-primary hover:underline"
            >
              Yine de tüm sonuçlarda ara →
            </Link>
          </div>
        ) : (
          <ul className="max-h-[460px] overflow-y-auto grid grid-cols-2">
            {results.map((product) => (
              <li key={product.id} className="p-2" onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) onClose?.();
              }}><ProductCard product={product} /></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
