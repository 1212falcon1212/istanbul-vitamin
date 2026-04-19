"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Category } from "@/types";
import SectionLabel from "@/components/ui/SectionLabel";
import SerifHeading from "@/components/ui/SerifHeading";
import FadeUp from "@/components/animations/FadeUp";

interface CategoryBentoProps {
  categories: Category[];
}

type CardTheme = {
  bg: string;
  textPrimary: string;
  textSecondary: string;
  numberColor: string;
  dark: boolean;
};

const cardThemes: CardTheme[] = [
  {
    bg: "bg-bg-footer",
    textPrimary: "text-white",
    textSecondary: "text-white/50",
    numberColor: "text-white/40",
    dark: true,
  },
  {
    bg: "bg-primary-soft",
    textPrimary: "text-text-primary",
    textSecondary: "text-text-secondary",
    numberColor: "text-text-secondary",
    dark: false,
  },
  {
    bg: "bg-[#b8a4f0]",
    textPrimary: "text-white",
    textSecondary: "text-white/60",
    numberColor: "text-white/50",
    dark: true,
  },
  {
    bg: "bg-primary",
    textPrimary: "text-white",
    textSecondary: "text-white/60",
    numberColor: "text-white/50",
    dark: true,
  },
  {
    bg: "bg-white",
    textPrimary: "text-text-primary",
    textSecondary: "text-text-secondary",
    numberColor: "text-text-secondary",
    dark: false,
  },
  {
    bg: "bg-primary-soft",
    textPrimary: "text-text-primary",
    textSecondary: "text-text-secondary",
    numberColor: "text-text-secondary",
    dark: false,
  },
  {
    bg: "bg-white",
    textPrimary: "text-text-primary",
    textSecondary: "text-text-secondary",
    numberColor: "text-text-secondary",
    dark: false,
  },
];

const PLACEHOLDER_CATEGORIES: Partial<Category>[] = [
  { id: -1, name: "Nemlendirici", slug: "nemlendirici" },
  { id: -2, name: "Güneş Koruyucu", slug: "gunes-koruyucu" },
  { id: -3, name: "Temizleyici", slug: "temizleyici" },
  { id: -4, name: "Serum", slug: "serum" },
  { id: -5, name: "Göz Bakımı", slug: "goz-bakimi" },
  { id: -6, name: "Dudak Bakımı", slug: "dudak-bakimi" },
  { id: -7, name: "Maske", slug: "maske" },
];

export default function CategoryBento({ categories }: CategoryBentoProps) {
  const rawItems = categories.length > 0 ? categories : PLACEHOLDER_CATEGORIES;
  const items = rawItems.slice(0, 7) as Category[];

  // Pad to 7 if needed
  const padded: (Category | null)[] = [...items];
  while (padded.length < 7) padded.push(null);

  return (
    <FadeUp>
      <section>
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <SectionLabel number="002" title="KATEGORİLER" />
            <SerifHeading size="md" className="mt-2">
              Favori <em>kategorini</em> bul.
            </SerifHeading>
          </div>
          <Link
            href="/kategoriler"
            className="text-xs uppercase tracking-widest text-text-secondary hover:text-primary transition-colors hidden sm:block"
          >
            Tüm kategoriler →
          </Link>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {padded.map((cat, i) => {
            const theme = cardThemes[i] ?? cardThemes[4];
            const isLarge = i === 0;
            const slug = cat?.slug ?? "#";
            const name = cat?.name ?? "";

            return (
              <Link
                key={cat?.id ?? `placeholder-${i}`}
                href={cat ? `/${slug}` : "/kategoriler"}
                className={[
                  isLarge ? "md:row-span-2" : "",
                  isLarge ? "min-h-[280px]" : "min-h-[130px]",
                ].join(" ")}
                tabIndex={cat ? 0 : -1}
                aria-label={name || undefined}
              >
                <motion.div
                  className={`h-full rounded-2xl overflow-hidden cursor-pointer ${theme.bg}`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="p-5 h-full flex flex-col justify-between">
                    <p
                      className={`text-[9px] uppercase tracking-widest font-body ${theme.numberColor}`}
                    >
                      — 0{i + 1}
                    </p>
                    <div>
                      {name && (
                        <p
                          className={`font-display text-lg leading-tight ${theme.textPrimary}`}
                        >
                          {name}
                        </p>
                      )}
                      <p className={`text-xs mt-1 opacity-70 ${theme.textSecondary}`}>
                        ürünler →
                      </p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Mobile "all categories" link */}
        <div className="mt-4 sm:hidden text-center">
          <Link
            href="/kategoriler"
            className="text-xs uppercase tracking-widest text-text-secondary hover:text-primary transition-colors"
          >
            Tüm kategoriler →
          </Link>
        </div>
      </section>
    </FadeUp>
  );
}
