import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { Brand } from "@/types";
import { fetchAPI } from "@/lib/fetch-api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";

export const metadata: Metadata = {
  title: "Markalar",
  description:
    "İstanbul Vitamin'de bulunan tum dermokozmetik markalari. A'dan Z'ye marka listesi.",
};

export default async function MarkalarPage() {
  const brands = await fetchAPI<Brand[]>("/brands?per_page=100").then(
    (d) => d ?? []
  );

  // Group by first letter A-Z
  const grouped: Record<string, Brand[]> = {};
  for (const brand of brands) {
    const firstLetter = brand.name.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(brand);
  }

  const sortedLetters = Object.keys(grouped).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "tr");
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb items={[{ label: "Markalar" }]} />

          <h1 className="font-display text-3xl text-text-primary mb-8">
            Markalar
          </h1>

          {brands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-text-secondary text-lg">
                Henuz marka bulunmuyor.
              </p>
            </div>
          ) : (
            <>
              {/* Letter nav */}
              <div className="flex flex-wrap gap-2 mb-8">
                {sortedLetters.map((letter) => (
                  <a
                    key={letter}
                    href={`#brand-${letter}`}
                    className="w-9 h-9 rounded-lg bg-primary-soft text-primary text-sm font-medium flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                  >
                    {letter}
                  </a>
                ))}
              </div>

              {/* Brand groups */}
              <div className="space-y-10">
                {sortedLetters.map((letter) => (
                  <div key={letter} id={`brand-${letter}`}>
                    <h2 className="font-display text-2xl text-primary mb-4 border-b border-border pb-2">
                      {letter}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {grouped[letter].map((brand) => (
                        <Link
                          key={brand.id}
                          href={`/markalar/${brand.slug}`}
                          className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-card-bg border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
                        >
                          <div className="w-16 h-16 rounded-full bg-bg-primary flex items-center justify-center overflow-hidden">
                            {brand.logo_url ? (
                              <Image
                                src={brand.logo_url}
                                alt={brand.name}
                                width={64}
                                height={64}
                                className="object-contain"
                              />
                            ) : (
                              <span className="text-lg font-bold text-primary">
                                {brand.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-text-primary text-center">
                            {brand.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
