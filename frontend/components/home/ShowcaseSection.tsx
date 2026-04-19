"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import type { Category, Product } from "@/types";
import { formatPrice, calcDiscount, cn } from "@/lib/utils";

interface ShowcaseItem {
  category: Category;
  products: Product[];
}

interface ShowcaseSectionProps {
  showcases: ShowcaseItem[];
}

/* ---- Compact horizontal card for showcase ---- */
function ShowcaseCard({ product }: { product: Product }) {
  const primaryImage =
    product.images?.find((img) => img.is_primary) ?? product.images?.[0];
  const imageUrl = primaryImage?.image_url;
  const discount = product.compare_price
    ? calcDiscount(product.price, product.compare_price)
    : 0;

  return (
    <Link
      href={`/urun/${product.slug}`}
      className="group flex flex-row bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow duration-300 h-[130px]"
    >
      {/* Image */}
      <div className="relative shrink-0 w-[110px] bg-white flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary-soft/50" />
        )}
        {discount > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-accent-rose text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            %{discount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-center p-3 min-w-0">
        {product.brand && (
          <p className="text-[10px] uppercase tracking-wider text-text-secondary truncate">
            {product.brand.name}
          </p>
        )}
        <h3 className="text-xs font-medium text-text-primary line-clamp-2 mt-0.5 leading-snug group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-sm font-bold text-primary price">
            {formatPrice(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="text-[10px] line-through text-text-secondary price">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ---- Single showcase row ---- */
function ShowcaseRow({ showcase }: { showcase: ShowcaseItem }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "py-8 md:py-10 bg-white transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl md:text-2xl text-text-primary">
            {showcase.category.name}
          </h2>
          <Link
            href={`/${showcase.category.slug}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Tumunu Gor
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {/* 2 rows x 3 columns grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {showcase.products.slice(0, 6).map((product) => (
            <ShowcaseCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ShowcaseSection({ showcases }: ShowcaseSectionProps) {
  if (showcases.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {showcases.map((showcase) => (
        <ShowcaseRow key={showcase.category.id} showcase={showcase} />
      ))}
    </div>
  );
}
