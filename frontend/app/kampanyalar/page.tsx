import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { Campaign } from "@/types";
import { fetchAPI } from "@/lib/fetch-api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";

export const metadata: Metadata = {
  title: "Kampanyalar",
  description:
    "DermoEczane kampanyalari ve indirimli dermokozmetik urunleri. Firsatlari kacirmayin!",
};

export default async function KampanyalarPage() {
  const campaigns = await fetchAPI<Campaign[]>("/campaigns").then(
    (d) => d ?? []
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb items={[{ label: "Kampanyalar" }]} />

          <h1 className="font-display text-3xl text-text-primary mb-8">
            Kampanyalar
          </h1>

          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                className="w-16 h-16 text-border mb-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6h.008v.008H6V6z"
                />
              </svg>
              <p className="text-text-secondary text-lg">
                Henuz aktif kampanya bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/kampanyalar/${campaign.slug}`}
                  className="group bg-card-bg rounded-2xl border border-border overflow-hidden hover:border-primary hover:shadow-lg transition-all duration-300"
                >
                  {/* Banner image */}
                  {campaign.banner_image ? (
                    <div className="relative aspect-[2/1] overflow-hidden">
                      <Image
                        src={campaign.banner_image}
                        alt={campaign.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/1] bg-primary-soft flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1}
                        stroke="currentColor"
                        className="w-12 h-12 text-primary"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-5">
                    <h2 className="font-display text-xl text-text-primary group-hover:text-primary transition-colors mb-2">
                      {campaign.name}
                    </h2>
                    {campaign.description && (
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                    {campaign.discount_type && campaign.discount_value && (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-600 text-sm font-medium">
                          {campaign.discount_type === "percentage"
                            ? `%${campaign.discount_value} Indirim`
                            : `${campaign.discount_value} TL Indirim`}
                        </span>
                      </div>
                    )}
                    {campaign.expires_at && (
                      <p className="text-xs text-text-secondary mt-3">
                        Son tarih:{" "}
                        {new Date(campaign.expires_at).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
