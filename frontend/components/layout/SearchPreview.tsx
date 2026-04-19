"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";

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
          <ul className="max-h-[460px] overflow-y-auto">
            {results.map((p) => {
              const img =
                p.images?.find((i) => i.is_primary)?.image_url ??
                p.images?.[0]?.image_url ??
                null;
              return (
                <li key={p.id}>
                  <Link
                    href={`/urun/${p.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-soft/50 transition-colors border-b border-border last:border-0"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary">
                      {img ? (
                        <img
                          src={img}
                          alt={p.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <circle cx="8.5" cy="10.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {p.brand?.name && (
                        <p className="text-[10px] uppercase tracking-wider text-text-secondary truncate">
                          {p.brand.name}
                        </p>
                      )}
                      <p className="text-sm text-text-primary line-clamp-1">
                        {p.name}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-primary price shrink-0">
                      {formatPrice(p.price)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
