"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import type { Category, Product } from "@/types";
import ProductCard from "@/components/product/ProductCard";
import { cn } from "@/lib/utils";

interface ShowcaseItem {
  category: Category;
  products: Product[];
}

interface ShowcaseSectionProps {
  showcases: ShowcaseItem[];
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
        <div className="catalog-product-grid">
          {showcase.products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
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
