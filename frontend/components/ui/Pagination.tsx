"use client";

import { cn } from "@/lib/utils";
import type { Pagination as PaginationType } from "@/types";

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export default function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, total_pages } = pagination;

  if (total_pages <= 1) return null;

  function getPages(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(total_pages - 1, page + delta);

    pages.push(1);

    if (left > 2) {
      pages.push("ellipsis");
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < total_pages - 1) {
      pages.push("ellipsis");
    }

    if (total_pages > 1) {
      pages.push(total_pages);
    }

    return pages;
  }

  const pages = getPages();

  return (
    <nav aria-label="Sayfalama" className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-colors",
          page <= 1
            ? "text-border cursor-not-allowed"
            : "text-text-secondary hover:bg-primary-soft hover:text-primary"
        )}
        aria-label="Onceki sayfa"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-text-secondary text-sm">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors",
              p === page
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-primary-soft hover:text-primary"
            )}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= total_pages}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-colors",
          page >= total_pages
            ? "text-border cursor-not-allowed"
            : "text-text-secondary hover:bg-primary-soft hover:text-primary"
        )}
        aria-label="Sonraki sayfa"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </nav>
  );
}
