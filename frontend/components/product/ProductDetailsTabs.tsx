"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

interface ProductDetailsTabsProps {
  product: Product;
}

type TabKey = "description" | "specs";

export default function ProductDetailsTabs({ product }: ProductDetailsTabsProps) {
  const [tab, setTab] = useState<TabKey>("description");

  return (
    <Card>
      {/* Tab bar */}
      <div className="border-b border-border px-5 pt-4">
        <div className="flex gap-1">
          <TabButton active={tab === "description"} onClick={() => setTab("description")}>
            Açıklama
          </TabButton>
          <TabButton active={tab === "specs"} onClick={() => setTab("specs")}>
            Özellikler
          </TabButton>
        </div>
      </div>

      <CardContent className="pt-5">
        {tab === "description" ? (
          product.description ? (
            <div
              className="prose prose-sm max-w-none text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(product.description),
              }}
            />
          ) : (
            <p className="text-sm text-text-secondary">
              Bu ürün için henüz açıklama eklenmemiştir.
            </p>
          )
        ) : (
          <div className="space-y-2.5 text-sm">
            <Detail label="Ad" value={product.name} />
            {product.sku && <Detail label="SKU" value={product.sku} />}
            {product.barcode && <Detail label="Barkod" value={product.barcode} />}
            {product.brand && <Detail label="Marka" value={product.brand.name} />}
            {product.categories && product.categories.length > 0 && (
              <Detail
                label="Kategoriler"
                value={product.categories.map((c) => c.name).join(", ")}
              />
            )}
            <Detail label="Para Birimi" value={product.currency || "TRY"} />
            {product.stock !== undefined && (
              <Detail label="Stok" value={String(product.stock)} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-primary"
          : "text-text-secondary hover:text-text-primary"
      )}
    >
      {children}
      {active && (
        <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-primary" />
      )}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 pb-2 border-b border-border last:border-0 last:pb-0">
      <span className="text-text-secondary shrink-0">{label}</span>
      <span className="text-text-primary text-right font-medium break-words">
        {value}
      </span>
    </div>
  );
}
