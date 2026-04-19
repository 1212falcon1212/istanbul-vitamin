import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Campaign } from "@/types";
import { fetchAPI } from "@/lib/fetch-api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductGrid from "@/components/product/ProductGrid";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await fetchAPI<Campaign>(`/campaigns/${slug}`);

  if (!campaign) {
    return { title: "Kampanya Bulunamadi" };
  }

  return {
    title: campaign.meta_title || campaign.name,
    description:
      campaign.meta_description ||
      campaign.description ||
      `${campaign.name} kampanyasi - DermoEczane`,
    openGraph: {
      title: campaign.name,
      description: campaign.description || undefined,
      images: campaign.banner_image
        ? [{ url: campaign.banner_image }]
        : undefined,
    },
  };
}

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  const campaign = await fetchAPI<Campaign>(`/campaigns/${slug}`);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb
            items={[
              { label: "Kampanyalar", href: "/kampanyalar" },
              { label: campaign.name },
            ]}
          />

          {/* Campaign banner */}
          {campaign.banner_image && (
            <div className="relative aspect-[3/1] rounded-2xl overflow-hidden mb-8">
              <Image
                src={campaign.banner_image}
                alt={campaign.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          )}

          {/* Campaign info */}
          <div className="mb-8">
            <h1 className="font-display text-3xl text-text-primary mb-3">
              {campaign.name}
            </h1>
            {campaign.description && (
              <p className="text-text-secondary max-w-3xl">
                {campaign.description}
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {campaign.discount_type && campaign.discount_value && (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-medium">
                  {campaign.discount_type === "percentage"
                    ? `%${campaign.discount_value} Indirim`
                    : `${campaign.discount_value} TL Indirim`}
                </span>
              )}
              {campaign.expires_at && (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-soft text-primary text-sm">
                  Son tarih:{" "}
                  {new Date(campaign.expires_at).toLocaleDateString("tr-TR")}
                </span>
              )}
            </div>
          </div>

          {/* Campaign products */}
          {campaign.products && campaign.products.length > 0 ? (
            <ProductGrid products={campaign.products} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-text-secondary text-lg">
                Bu kampanyaya ait urun bulunmuyor.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
