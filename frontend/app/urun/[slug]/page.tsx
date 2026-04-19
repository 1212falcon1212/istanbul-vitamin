import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Product } from "@/types";
import { fetchAPI } from "@/lib/fetch-api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfoBound from "@/components/product/ProductInfoBound";
import ProductReviews from "@/components/product/ProductReviews";
import SimilarProducts from "@/components/product/SimilarProducts";
import ProductDetailsTabs from "@/components/product/ProductDetailsTabs";
import { Card } from "@/components/ui/Card";

type Props = { params: Promise<{ slug: string }> };

function getSiteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchAPI<Product>(`/products/${slug}`);
  const base = getSiteBase();

  if (!product) {
    return {
      title: "Ürün Bulunamadı",
      alternates: { canonical: `${base}/urun/${slug}` },
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${base}/urun/${product.slug}`;

  return {
    title: product.meta_title || product.name,
    description:
      product.meta_description ||
      product.short_description ||
      `${product.name} - DermoEczane'de en uygun fiyatlarla.`,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description: product.short_description || undefined,
      type: "website",
      url: canonical,
      images: product.images?.[0]?.image_url
        ? [{ url: product.images[0].image_url }]
        : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await fetchAPI<Product>(`/products/${slug}`);
  if (!product) notFound();

  const breadcrumbItems: { label: string; href?: string }[] = [];
  if (product.categories && product.categories.length > 0) {
    const category = product.categories[0];
    breadcrumbItems.push({ label: category.name, href: `/${category.slug}` });
  }
  breadcrumbItems.push({ label: product.name });

  const categoryId = product.categories?.[0]?.id;
  const relatedResp = categoryId
    ? await fetchAPI<Product[]>(
        `/products?category_id=${categoryId}&per_page=12`
      )
    : [];
  const related = Array.isArray(relatedResp) ? relatedResp : [];
  const relatedProducts = related
    .filter((p) => p.id !== product.id)
    .slice(0, 9);

  const base = getSiteBase();
  const productUrl = `${base}/urun/${product.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description || product.description || "",
    sku: product.sku,
    image: product.images?.map((img) => img.image_url) || [],
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "TRY",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: productUrl,
    },
  };

  // BreadcrumbList JSON-LD: Home -> [Category] -> Product. Category step is
  // included only when the product actually carries category metadata.
  const primaryCategory = product.categories?.[0];
  const breadcrumbListItems: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }> = [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: base },
  ];
  if (primaryCategory) {
    breadcrumbListItems.push({
      "@type": "ListItem",
      position: 2,
      name: primaryCategory.name,
      item: `${base}/${primaryCategory.slug}`,
    });
  }
  breadcrumbListItems.push({
    "@type": "ListItem",
    position: breadcrumbListItems.length + 1,
    name: product.name,
    item: productUrl,
  });
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbListItems,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb items={breadcrumbItems} />

          {/* Üst: Galeri + Ana bilgi kartı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-4">
            <Card className="p-4 md:p-6 bg-white">
              <ProductGallery
                images={product.images ?? []}
                productName={product.name}
              />
            </Card>

            <Card className="p-5 md:p-6 bg-white">
              <ProductInfoBound product={product} />
            </Card>
          </div>

          {/* Açıklama / Özellikler — tabs */}
          <div className="mt-6">
            <ProductDetailsTabs product={product} />
          </div>

          {/* Yorumlar */}
          <div className="mt-6">
            <ProductReviews productId={product.id} />
          </div>

          {/* Benzer Ürünler — slider */}
          {relatedProducts.length > 0 && (
            <div className="mt-6 mb-10">
              <SimilarProducts products={relatedProducts} />
            </div>
          )}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      </main>

      <Footer />
    </div>
  );
}

