"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import { api } from "@/lib/api";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductGrid from "@/components/product/ProductGrid";
import Spinner from "@/components/ui/Spinner";

interface AramaPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function AramaPage({ searchParams }: AramaPageProps) {
  const sp = use(searchParams);
  const router = useRouter();

  const initialQuery = typeof sp.q === "string" ? sp.q : "";

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!initialQuery);

  useEffect(() => {
    if (!query) {
      setProducts([]);
      setSearched(false);
      return;
    }

    async function search() {
      setLoading(true);
      setSearched(true);
      try {
        const res = await api.get<Product[]>(
          `/search?q=${encodeURIComponent(query)}`
        );
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      setQuery(trimmed);
      router.replace(`/arama?q=${encodeURIComponent(trimmed)}`, {
        scroll: false,
      });
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumb items={[{ label: "Arama" }]} />

          <h1 className="font-display text-3xl text-text-primary mb-6">
            Urun Ara
          </h1>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mb-8">
            <div className="relative">
              <input
                type="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Urun, marka veya kategori ara..."
                className="w-full h-12 pl-5 pr-14 rounded-full border border-border bg-card-bg text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-base"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
                aria-label="Ara"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
            </div>
          </form>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : searched ? (
            <>
              {query && (
                <p className="text-sm text-text-secondary mb-6">
                  &quot;{query}&quot; icin{" "}
                  <strong>{products.length}</strong> sonuc bulundu.
                </p>
              )}

              {products.length === 0 ? (
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
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                  <p className="text-text-secondary text-lg mb-2">
                    Sonuc bulunamadi.
                  </p>
                  <p className="text-text-secondary text-sm">
                    Farkli bir arama terimi deneyin veya filtrelerinizi degistirin.
                  </p>
                </div>
              ) : (
                <ProductGrid products={products} />
              )}
            </>
          ) : (
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
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <p className="text-text-secondary text-lg">
                Aramanizi yapmak icin yukaridaki kutuya yazin.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
