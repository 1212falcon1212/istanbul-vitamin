"use client";

import Link from "next/link";
import type { Banner } from "@/types";
import { cn } from "@/lib/utils";

interface CampaignBannerProps {
  banners: Banner[];
}

export default function CampaignBanner({ banners }: CampaignBannerProps) {
  if (banners.length === 0) return null;

  const isSingle = banners.length === 1;

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div
          className={cn(
            "grid gap-4",
            isSingle ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
          )}
        >
          {banners.map((banner) => {
            const content = (
              <div className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                <div className="relative aspect-[2/1]">
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Kampanya"}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {banner.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-white font-display text-xl md:text-2xl drop-shadow-lg">
                        {banner.title}
                      </h3>
                    </div>
                  )}
                </div>
              </div>
            );

            return banner.link_url ? (
              <Link key={banner.id} href={banner.link_url} className="block">
                {content}
              </Link>
            ) : (
              <div key={banner.id}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
