import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchAPI } from "@/lib/fetch-api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductListing from "@/components/product/ProductListing";

interface Concern {
  id: number;
  name: string;
  slug: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  count?: number;
}

interface ConcernsResp {
  concerns: Concern[];
}

type Props = { params: Promise<{ slug: string }> };

async function getConcern(slug: string): Promise<Concern | null> {
  const single = await fetchAPI<Concern>(`/skin-concerns/${slug}`);
  if (single && "id" in single) return single;
  const list = await fetchAPI<Concern[] | ConcernsResp>(`/skin-concerns`);
  const arr: Concern[] = Array.isArray(list) ? list : list?.concerns ?? [];
  return arr.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const concern = await getConcern(slug);
  if (!concern) return { title: "Cilt sorunu bulunamadı" };

  const title =
    concern.meta_title || `${concern.name} için Ürünler — Dermokozmetik Çözümler`;
  const description =
    concern.meta_description ||
    `${concern.name} cilt sorununa özel dermatoloji onaylı dermokozmetik ürünler. Eczane güvencesiyle DermoEczane'de.`;

  return {
    title,
    description,
    alternates: { canonical: `/cilt-sorunlari/${concern.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function ConcernPage({ params }: Props) {
  const { slug } = await params;
  const concern = await getConcern(slug);
  if (!concern) notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb
            items={[
              { label: "Cilt Sorunları", href: "/cilt-sorunlari" },
              { label: concern.name },
            ]}
          />

          <header className="mt-4 mb-8 bg-white border border-border rounded-2xl p-6 md:p-8">
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl text-text-primary">
              {concern.name} için Dermokozmetik Çözümler
            </h1>
            <p className="text-text-secondary mt-3 max-w-3xl leading-relaxed">
              {concern.description ||
                `${concern.name} sorunlu ciltler için dermatoloji uzmanlarının önerdiği,
                klinik olarak test edilmiş bakım ürünleri. Hassas formülasyonlar,
                kanıtlanmış aktifler ve eczane güvencesi.`}
            </p>
            {concern.count !== undefined && concern.count > 0 && (
              <p className="mt-4 text-xs uppercase tracking-widest text-primary font-semibold">
                {concern.count} ürün mevcut
              </p>
            )}
          </header>

          <ProductListing locked={{ concern: concern.slug }} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
