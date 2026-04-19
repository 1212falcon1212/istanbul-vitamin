"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types";
import { cn, resolveImageUrl } from "@/lib/utils";

/** Yerel backend upload'ları için next/image optimizer'ını atla. */
function isLocalUpload(url: string): boolean {
  return url.includes("/uploads/");
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName?: string;
}

export default function ProductGallery({ images, productName = "" }: ProductGalleryProps) {
  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const [selected, setSelected] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  if (sorted.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-bg-primary border border-border flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="w-20 h-20 text-border"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
    );
  }

  const current = sorted[selected];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image with zoom */}
      <div
        ref={mainRef}
        className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border cursor-zoom-in"
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
      >
        <Image
          src={resolveImageUrl(current.image_url)}
          alt={current.alt_text || productName}
          fill
          className={cn(
            "object-contain p-4 transition-transform duration-200",
            isZooming && "scale-200"
          )}
          style={
            isZooming
              ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
              : undefined
          }
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized={isLocalUpload(current.image_url)}
        />

        {/* Prev / Next arrows */}
        {sorted.length > 1 && (
          <>
            <button
              onClick={() =>
                setSelected((prev) =>
                  prev === 0 ? sorted.length - 1 : prev - 1
                )
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-border flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary transition-colors"
              aria-label="Onceki gorsel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() =>
                setSelected((prev) =>
                  prev === sorted.length - 1 ? 0 : prev + 1
                )
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-border flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary transition-colors"
              aria-label="Sonraki gorsel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* Image counter */}
        {sorted.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {selected + 1} / {sorted.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={cn(
                "relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-200",
                i === selected
                  ? "border-primary shadow-sm"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Image
                src={resolveImageUrl(img.image_url)}
                alt={img.alt_text || `${productName} ${i + 1}`}
                fill
                className="object-contain p-1"
                sizes="80px"
                unoptimized={isLocalUpload(img.image_url)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
