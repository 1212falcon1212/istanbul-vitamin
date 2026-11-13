"use client";
import { useHomeContent } from "@/lib/use-home-content";
import { safeContentLink } from "@/lib/home-content";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import ProductCard from "@/components/product/ProductCard";

const tabs = [
  { id: "new", label: "Yeni Gelenler" },
  { id: "best", label: "Çok Satanlar" },
] as const;
type Tab = (typeof tabs)[number]["id"];

export default function ProductSelection({
  newArrivals,
  bestSellers,
}: {
  newArrivals: Product[];
  bestSellers: Product[];
}) {
  const c = useHomeContent();
  const tabs = [
    { id: "new" as const, label: c.selection.newLabel },
    { id: "best" as const, label: c.selection.bestLabel },
  ];
  const [selected, setSelected] = useState<Tab>(
    newArrivals.length ? "new" : "best",
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  if (!newArrivals.length && !bestSellers.length) return null;
  const products = selected === "new" ? newArrivals : bestSellers;

  return (
    <section
      aria-labelledby="product-selection-title"
      className="theme-selection"
    >
      <div className="mx-auto max-w-[1376px]">
        <h2
          id="product-selection-title"
          className="font-body text-center text-2xl sm:text-3xl lg:text-[32px] leading-tight font-semibold uppercase tracking-[-0.035em]"
        >
          {c.selection.title}
        </h2>
        <div
          role="tablist"
          aria-label="Ürün seçkisi"
          className="theme-selection-tabs"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`selection-tab-${tab.id}`}
              aria-controls={`selection-panel-${tab.id}`}
              aria-selected={selected === tab.id}
              tabIndex={selected === tab.id ? 0 : -1}
              onClick={() => setSelected(tab.id)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                setSelected(tabs[next].id);
                tabRefs.current[next]?.focus();
              }}
              className={`min-h-11 border-b-2 px-1 text-sm sm:text-lg font-semibold uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#511b3c] ${selected === tab.id ? "border-[#171217] text-[#171217]" : "border-transparent text-[#777277] hover:text-[#171217]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`selection-panel-${tab.id}`}
            aria-labelledby={`selection-tab-${tab.id}`}
            hidden={selected !== tab.id}
            tabIndex={0}
          >
            {selected === tab.id &&
              (products.length ? (
                <SelectionSlider
                  key={selected}
                  products={products}
                  label={tab.label}
                />
              ) : (
                <p className="py-12 text-center text-text-secondary">
                  Bu seçkide henüz ürün bulunmuyor.
                </p>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function SelectionSlider({
  products,
  label,
}: {
  products: Product[];
  label: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () =>
      setEdges({
        prev: element.scrollLeft > 2,
        next:
          element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
      });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, []);

  function move(direction: number) {
    const element = viewport.current;
    if (!element) return;
    const slide = element.firstElementChild as HTMLElement | null;
    element.scrollBy({
      left: direction * ((slide?.offsetWidth ?? element.clientWidth) + 16),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  return (
    <div>
      <div
        ref={viewport}
        className="selection-slider"
        role="region"
        aria-roledescription="karusel"
        aria-label={`${label} ürünleri`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            !["ArrowLeft", "ArrowRight"].includes(event.key)
          )
            return;
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }}
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className="selection-slide"
            role="group"
            aria-label={`${index + 1} / ${products.length}`}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      <div
        className="mt-3 flex justify-end gap-2"
        aria-label="Slider kontrolleri"
      >
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!edges.prev}
          aria-label="Önceki ürünler"
          className="selection-slider-arrow"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={!edges.next}
          aria-label="Sonraki ürünler"
          className="selection-slider-arrow"
        >
          →
        </button>
      </div>
    </div>
  );
}
