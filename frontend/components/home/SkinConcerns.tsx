"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SerifHeading from "@/components/ui/SerifHeading";
import StaggerContainer, { StaggerItem } from "@/components/animations/StaggerContainer";

export interface ConcernItem {
  id: number;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

interface SkinConcernsProps {
  concerns: ConcernItem[];
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] rounded-2xl animate-shimmer" />
      ))}
    </div>
  );
}

export default function SkinConcerns({ concerns }: SkinConcernsProps) {
  return (
    <section>
      {!concerns || concerns.length === 0 ? (
        <SkeletonGrid />
      ) : (
        <div className="bg-white/60 border border-border rounded-3xl p-5 md:p-8">
        <div className="mb-6">
          <SerifHeading size="md">
            Cilt sorununa <em>göre bul.</em>
          </SerifHeading>
          <p className="text-sm text-text-secondary mt-2 max-w-lg">
            Dermatoloji onaylı çözümler — cilt ihtiyacına özel seçilmiş ürünler.
          </p>
        </div>
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {concerns.map((concern) => (
            <StaggerItem key={concern.id}>
              <Link href={`/cilt-sorunlari/${concern.slug}`} className="block">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="relative aspect-[4/5] rounded-2xl bg-white border border-border overflow-hidden hover:border-primary hover:shadow-lg transition-all"
                >
                  {/* Initial monogram block */}
                  <div className="absolute inset-x-0 top-0 h-3/5 bg-primary-soft flex items-center justify-center">
                    <span className="font-display text-5xl text-primary/70 leading-none">
                      {concern.name.charAt(0)}
                    </span>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute inset-x-0 bottom-0 h-2/5 p-3 flex flex-col justify-center">
                    <p className="font-display text-sm text-text-primary leading-tight line-clamp-2">
                      {concern.name}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-1 uppercase tracking-widest">
                      {concern.count} ürün
                    </p>
                  </div>

                  {/* Top-right arrow */}
                  <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-primary">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 13L13 3M13 3H5M13 3V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
        </div>
      )}
    </section>
  );
}
