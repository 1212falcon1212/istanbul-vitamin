import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Category, Page } from "@/types";
import { fetchAPI } from "@/lib/fetch-api";
import { sanitizeHtml } from "@/lib/sanitize";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductListing from "@/components/product/ProductListing";

type Props = {
  params: Promise<{ categorySlug: string[] }>;
};

async function resolveContent(slugs: string[]) {
  const slug = slugs[slugs.length - 1];

  // Try category first
  const category = await fetchAPI<Category>(`/categories/${slug}`);
  if (category) {
    return { type: "category" as const, category };
  }

  // Try CMS page
  const page = await fetchAPI<Page>(`/pages/${slug}`);
  if (page) {
    return { type: "page" as const, page };
  }

  return null;
}

function getSiteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const content = await resolveContent(categorySlug);
  const base = getSiteBase();
  const canonical = `${base}/${categorySlug.join("/")}`;

  if (!content) {
    return {
      title: "Sayfa Bulunamadi",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  if (content.type === "category") {
    return {
      title: content.category.meta_title || content.category.name,
      description:
        content.category.meta_description ||
        content.category.description ||
        `${content.category.name} kategorisindeki dermokozmetik urunleri - DermoEczane`,
      alternates: { canonical },
      openGraph: {
        title: content.category.meta_title || content.category.name,
        description:
          content.category.meta_description ||
          content.category.description ||
          undefined,
        type: "website",
        url: canonical,
      },
    };
  }

  return {
    title: content.page.meta_title || content.page.title,
    description: content.page.meta_description || undefined,
    alternates: { canonical },
  };
}

export default async function CategoryOrCmsPage({ params }: Props) {
  const { categorySlug } = await params;
  const content = await resolveContent(categorySlug);

  if (!content) {
    notFound();
  }

  if (content.type === "page") {
    return <CmsPageView page={content.page} />;
  }

  return <CategoryView category={content.category} slugs={categorySlug} />;
}

// ---- CMS Page View ----

// İlgili sayfa önerileri için grup tanımları — yardım sayfaları birbirine link verir.
const RELATED_PAGES: Record<string, { slug: string; title: string }[]> = {
  "siparis-takibi": [
    { slug: "kargo-teslimat", title: "Kargo & Teslimat" },
    { slug: "iade-degisim", title: "İade ve Değişim" },
    { slug: "musteri-hizmetleri", title: "Müşteri Hizmetleri" },
  ],
  "kargo-teslimat": [
    { slug: "siparis-takibi", title: "Sipariş Takibi" },
    { slug: "iade-degisim", title: "İade ve Değişim" },
    { slug: "sss", title: "Sıkça Sorulan Sorular" },
  ],
  "iade-degisim": [
    { slug: "kargo-teslimat", title: "Kargo & Teslimat" },
    { slug: "siparis-takibi", title: "Sipariş Takibi" },
    { slug: "musteri-hizmetleri", title: "Müşteri Hizmetleri" },
  ],
  sss: [
    { slug: "kargo-teslimat", title: "Kargo & Teslimat" },
    { slug: "iade-degisim", title: "İade ve Değişim" },
    { slug: "musteri-hizmetleri", title: "Müşteri Hizmetleri" },
  ],
  "musteri-hizmetleri": [
    { slug: "iletisim", title: "İletişim" },
    { slug: "sss", title: "Sıkça Sorulan Sorular" },
    { slug: "siparis-takibi", title: "Sipariş Takibi" },
  ],
  iletisim: [
    { slug: "musteri-hizmetleri", title: "Müşteri Hizmetleri" },
    { slug: "hakkimizda", title: "Hakkımızda" },
    { slug: "basin", title: "Basın" },
  ],
  hakkimizda: [
    { slug: "kariyer", title: "Kariyer" },
    { slug: "basin", title: "Basın" },
    { slug: "iletisim", title: "İletişim" },
  ],
  kariyer: [
    { slug: "hakkimizda", title: "Hakkımızda" },
    { slug: "iletisim", title: "İletişim" },
  ],
  basin: [
    { slug: "hakkimizda", title: "Hakkımızda" },
    { slug: "iletisim", title: "İletişim" },
  ],
  blog: [],
};

function CmsPageView({ page }: { page: Page }) {
  const related = RELATED_PAGES[page.slug] ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Breadcrumb items={[{ label: page.title }]} />

          {/* Başlık bloğu */}
          <div className="bg-gradient-to-br from-primary-soft via-bg-primary to-white rounded-3xl border border-border p-8 lg:p-12 mb-8">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
              {page.slug === "sss"
                ? "Yardım"
                : page.slug === "hakkimizda" || page.slug === "kariyer" || page.slug === "basin"
                  ? "Kurumsal"
                  : page.slug === "blog"
                    ? "Blog"
                    : "İçerik"}
            </p>
            <h1 className="font-display text-4xl lg:text-5xl text-text-primary">
              {page.title}
            </h1>
          </div>

          {/* İçerik + yan öneriler */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            <article className="bg-card-bg rounded-2xl border border-border p-6 lg:p-10">
              {page.content ? (
                <div
                  className="cms-content max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
                />
              ) : (
                <p className="text-text-secondary">
                  Bu sayfa henüz düzenlenmemiştir.
                </p>
              )}
            </article>

            {related.length > 0 && (
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="bg-card-bg rounded-2xl border border-border p-5">
                  <p className="text-[11px] uppercase tracking-widest text-text-secondary font-semibold mb-3">
                    İlgili Sayfalar
                  </p>
                  <ul className="space-y-1">
                    {related.map((r) => (
                      <li key={r.slug}>
                        <a
                          href={`/${r.slug}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:text-primary hover:bg-primary-soft/40 transition-colors group"
                        >
                          <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all shrink-0" />
                          <span className="flex-1">{r.title}</span>
                          <span className="text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                            →
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-5">
                  <p className="text-[11px] uppercase tracking-widest opacity-80 mb-2">
                    Yardıma mı ihtiyacın var?
                  </p>
                  <p className="font-display text-lg leading-snug mb-3">
                    Müşteri hizmetlerimiz her zaman yanında.
                  </p>
                  <a
                    href="/musteri-hizmetleri"
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-white text-primary rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
                  >
                    İletişime Geç →
                  </a>
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ---- Category View ----

async function CategoryView({
  category,
  slugs,
}: {
  category: Category;
  slugs: string[];
}) {
  const base = getSiteBase();

  // Build breadcrumb from slugs
  const breadcrumbItems: { label: string; href?: string }[] = [];
  for (let i = 0; i < slugs.length - 1; i++) {
    const parentSlug = slugs.slice(0, i + 1).join("/");
    const parentCat = await fetchAPI<Category>(`/categories/${slugs[i]}`);
    breadcrumbItems.push({
      label: parentCat?.name || slugs[i],
      href: `/${parentSlug}`,
    });
  }
  breadcrumbItems.push({ label: category.name });

  // BreadcrumbList JSON-LD: mirrors the visual breadcrumb above so crawlers
  // see the same hierarchy. Final item points back to the canonical page URL.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: base,
      },
      ...breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        item: item.href
          ? `${base}${item.href}`
          : `${base}/${slugs.join("/")}`,
      })),
    ],
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb items={breadcrumbItems} />

          {/* Category header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl text-text-primary mb-2">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-text-secondary max-w-3xl">
                {category.description}
              </p>
            )}
          </div>

          {/* Products listing — infinite scroll + filters */}
          <ProductListing
            locked={{ category_id: category.id }}
            showCategoryFilter={false}
            subcategories={(category.children ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              href: `/${[...slugs, c.slug].join("/")}`,
            }))}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
