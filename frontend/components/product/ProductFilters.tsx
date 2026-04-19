"use client";

import { useState } from "react";
import type { Category, Brand } from "@/types";
import { cn } from "@/lib/utils";

interface FilterValues {
  category_id?: number;
  brand_id?: number;
  min_price?: number;
  max_price?: number;
}

interface ProductFiltersProps {
  categories: Category[];
  brands: Brand[];
  selectedCategoryId?: number;
  selectedBrandId?: number;
  minPrice?: number;
  maxPrice?: number;
  onFilterChange: (filters: FilterValues) => void;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-sm font-medium text-text-primary uppercase tracking-wide"
      >
        {title}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={cn(
            "w-4 h-4 text-text-secondary transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function CategoryTree({
  categories,
  selectedId,
  onSelect,
  depth = 0,
}: {
  categories: Category[];
  selectedId?: number;
  onSelect: (id?: number) => void;
  depth?: number;
}) {
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "ml-4 mt-0.5")}>
      {categories.map((cat) => (
        <li key={cat.id}>
          <button
            onClick={() => onSelect(cat.id === selectedId ? undefined : cat.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
              selectedId === cat.id
                ? "bg-primary-soft text-primary font-medium"
                : "text-text-secondary hover:text-primary hover:bg-primary-soft/50"
            )}
          >
            <span
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                selectedId === cat.id
                  ? "border-primary bg-primary"
                  : "border-border"
              )}
            >
              {selectedId === cat.id && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            {cat.name}
          </button>
          {cat.children && cat.children.length > 0 && (
            <CategoryTree
              categories={cat.children}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ProductFilters({
  categories,
  brands,
  selectedCategoryId,
  selectedBrandId,
  minPrice,
  maxPrice,
  onFilterChange,
}: ProductFiltersProps) {
  const [localMin, setLocalMin] = useState(minPrice?.toString() || "");
  const [localMax, setLocalMax] = useState(maxPrice?.toString() || "");
  const [brandSearch, setBrandSearch] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);

  const filteredBrands = brandSearch
    ? brands.filter((b) =>
        b.name.toLowerCase().includes(brandSearch.toLowerCase())
      )
    : brands;

  const visibleBrands = showAllBrands
    ? filteredBrands
    : filteredBrands.slice(0, 10);

  function buildFilters(overrides: Partial<FilterValues>): FilterValues {
    return {
      category_id: selectedCategoryId,
      brand_id: selectedBrandId,
      min_price: minPrice,
      max_price: maxPrice,
      ...overrides,
    };
  }

  function handlePriceApply() {
    onFilterChange(
      buildFilters({
        min_price: localMin ? Number(localMin) : undefined,
        max_price: localMax ? Number(localMax) : undefined,
      })
    );
  }

  function handleClearAll() {
    setLocalMin("");
    setLocalMax("");
    setBrandSearch("");
    onFilterChange({});
  }

  const hasActiveFilters = !!(
    selectedCategoryId ||
    selectedBrandId ||
    minPrice ||
    maxPrice
  );

  return (
    <aside className="space-y-4">
      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={handleClearAll}
          className="w-full py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Filtreleri Temizle
        </button>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <CollapsibleSection title="Kategoriler">
          <CategoryTree
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={(id) =>
              onFilterChange(buildFilters({ category_id: id }))
            }
          />
        </CollapsibleSection>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <CollapsibleSection title="Markalar">
          {brands.length > 10 && (
            <div className="mb-2">
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Marka ara..."
                className="w-full h-8 px-3 rounded-lg border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
          <ul className="space-y-0.5 max-h-64 overflow-y-auto">
            {visibleBrands.map((brand) => (
              <li key={brand.id}>
                <button
                  onClick={() =>
                    onFilterChange(
                      buildFilters({
                        brand_id:
                          brand.id === selectedBrandId ? undefined : brand.id,
                      })
                    )
                  }
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                    selectedBrandId === brand.id
                      ? "bg-primary-soft text-primary font-medium"
                      : "text-text-secondary hover:text-primary hover:bg-primary-soft/50"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      selectedBrandId === brand.id
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}
                  >
                    {selectedBrandId === brand.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                  {brand.name}
                </button>
              </li>
            ))}
          </ul>
          {!brandSearch && filteredBrands.length > 10 && (
            <button
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="mt-2 text-xs text-primary hover:text-primary-dark transition-colors"
            >
              {showAllBrands
                ? "Daha az goster"
                : `Tumunu goster (${filteredBrands.length})`}
            </button>
          )}
        </CollapsibleSection>
      )}

      {/* Price range */}
      <CollapsibleSection title="Fiyat Araligi">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
            min={0}
          />
          <span className="text-text-secondary text-sm shrink-0">-</span>
          <input
            type="number"
            placeholder="Max"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
            min={0}
          />
        </div>
        <button
          onClick={handlePriceApply}
          className="mt-2 w-full h-9 rounded-lg bg-primary-soft text-primary text-sm font-medium hover:bg-primary hover:text-white transition-colors"
        >
          Uygula
        </button>
      </CollapsibleSection>
    </aside>
  );
}
