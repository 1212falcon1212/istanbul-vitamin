import type { Metadata } from "next";
import type { Brand } from "@/types";
import { fetchAPI } from "@/lib/fetch-api";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

function getSiteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchAPI<Brand>(`/brands/${slug}`);
  const base = getSiteBase();

  if (!brand) {
    return {
      title: "Marka bulunamadı",
      alternates: { canonical: `${base}/markalar/${slug}` },
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${base}/markalar/${brand.slug}`;
  const description =
    brand.meta_description ||
    brand.description ||
    `${brand.name} dermokozmetik ürünleri - İstanbul Vitamin`;

  return {
    title: brand.meta_title || `${brand.name} Ürünleri`,
    description,
    alternates: { canonical },
    openGraph: {
      title: brand.name,
      description,
      type: "website",
      url: canonical,
      images: brand.logo_url ? [{ url: brand.logo_url }] : [],
    },
  };
}

export default async function BrandLayout({ params, children }: Props) {
  const { slug } = await params;
  const brand = await fetchAPI<Brand>(`/brands/${slug}`);
  const base = getSiteBase();

  const breadcrumbLd = brand
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Ana Sayfa",
            item: base,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Markalar",
            item: `${base}/markalar`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: brand.name,
            item: `${base}/markalar/${brand.slug}`,
          },
        ],
      }
    : null;

  return (
    <>
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      {children}
    </>
  );
}
