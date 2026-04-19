"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Brand } from "@/types";
import SectionLabel from "@/components/ui/SectionLabel";
import SerifHeading from "@/components/ui/SerifHeading";
import FadeUp from "@/components/animations/FadeUp";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

interface BrandGridProps {
  brands: Brand[];
  totalCount?: number;
}

export default function BrandGrid({ brands, totalCount }: BrandGridProps) {
  const displayBrands = brands.slice(0, 15);
  const total = totalCount ?? 200;
  const remaining = Math.max(0, total - 15);

  return (
    <FadeUp>
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <SectionLabel number="007" title="TÜM MARKALAR" />
          <SerifHeading size="md" className="mt-3">
            {total}+ <em>marka.</em>
          </SerifHeading>

          {/* Grid */}
          <StaggerContainer className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-8">
            {displayBrands.map((brand, index) => (
              <StaggerItem key={brand.id}>
                <motion.div
                  whileHover={{ backgroundColor: "#ede9fe", scale: 1.03 }}
                  transition={{ duration: 0.18 }}
                  className="aspect-square rounded-xl border border-border bg-white flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  <Link
                    href={`/markalar/${brand.slug}`}
                    className="w-full h-full flex items-center justify-center px-2"
                  >
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span
                        className={`font-display text-[11px] text-center text-text-primary leading-tight${index % 2 === 0 ? " italic" : ""}`}
                      >
                        {brand.name}
                      </span>
                    )}
                  </Link>
                </motion.div>
              </StaggerItem>
            ))}

            {/* More card */}
            <StaggerItem>
              <div className="bg-footer rounded-xl aspect-square flex flex-col items-center justify-center overflow-hidden">
                <Link
                  href="/markalar"
                  className="w-full h-full flex flex-col items-center justify-center"
                >
                  <span className="font-display text-2xl text-white">
                    +{remaining}
                  </span>
                  <span className="text-[9px] text-white/50 mt-1 font-body">
                    Tüm Markalar
                  </span>
                </Link>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>
    </FadeUp>
  );
}
