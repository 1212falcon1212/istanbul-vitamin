"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartDrawer } from "@/lib/cart-drawer";
import { useSettings } from "@/lib/settings";
import { categoryIcon } from "@/lib/category-icons";
// Offline entry: icons are registered at build time in lib/iconify-bundle.ts
// so the runtime never reaches out to the Iconify CDN.
import { Icon } from "@iconify/react/offline";
import type { Category } from "@/types";
import SearchPreview from "./SearchPreview";

// ---------------------------------------------------------------------------
// Icons (inline SVG for zero-dependency, consistent stroke style)
// ---------------------------------------------------------------------------

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function LeafAccent() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-primary inline-block ml-0.5 -mt-2">
      <path d="M13 1C9.5 1.5 3 4.5 3 11c0 1.5.5 3 1.5 4 .3-2.5 1.5-5 4-7 .3-.3.6-.2.7.1.1.3-.1.5-.3.7C6.7 10.8 6 13 5.8 15c1-.3 2-.8 2.8-1.5C12 10.5 14 6 14 2c0-.3-.2-.6-.5-.8-.2-.1-.3-.2-.5-.2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function fetchCategoryTree(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/categories/tree`);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && json.data?.categories) {
      return json.data.categories as Category[];
    }
    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HeaderProps {
  cartItemCount?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Header({ cartItemCount: cartItemCountProp }: HeaderProps) {
  const pathname = usePathname();

  // --- Cart ---
  let cartHookCount = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const cart = useCart();
    cartHookCount = cart.itemCount;
  } catch {
    // CartProvider may not wrap this tree; fall through to prop
  }
  const cartCount = cartItemCountProp ?? cartHookCount;

  // Cart drawer
  let openCartDrawer: () => void = () => {};
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    openCartDrawer = useCartDrawer().open;
  } catch {
    // Provider wrap yoksa fallback: /sepet'e götür
    openCartDrawer = () => {
      if (typeof window !== "undefined") window.location.href = "/sepet";
    };
  }

  // --- Settings (site adı, logo) ---
  const { settings } = useSettings();
  const logoUrl = settings.site_logo_url
    ? resolveImageUrl(settings.site_logo_url)
    : "";
  const siteName = settings.site_name || "İstanbul Vitamin";

  // --- State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<number | null>(null);
  const [activeMegaId, setActiveMegaId] = useState<number | null>(null);

  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // --- Data fetch ---
  useEffect(() => {
    fetchCategoryTree().then(setCategories);
  }, []);

  // --- Scroll listener ---
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // --- Close mobile drawer on route change ---
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // --- Lock body scroll when mobile drawer is open ---
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // --- Search submit ---
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q) {
        window.location.href = `/arama?q=${encodeURIComponent(q)}`;
      }
    },
    [searchQuery]
  );

  // --- Mega menu hover handlers ---
  function openMega(id: number) {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setActiveMegaId(id);
  }

  function closeMega() {
    megaTimeout.current = setTimeout(() => setActiveMegaId(null), 180);
  }

  function cancelCloseMega() {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
  }

  // --- Mobile accordion toggle ---
  function toggleMobileCategory(id: number) {
    setExpandedMobileCategory((prev) => (prev === id ? null : id));
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <header className="w-full z-50 relative">
      {/* ======================== Top Bar ======================== */}
      <div className="hidden md:block bg-primary-dark text-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-1.5 text-xs tracking-wide">
          {/* Left: contact info */}
          <div className="flex items-center gap-5">
            <a
              href="tel:+902121234567"
              className="flex items-center gap-1.5 hover:text-primary-soft transition-colors"
            >
              <PhoneIcon className="w-3.5 h-3.5" />
              <span>0212 123 45 67</span>
            </a>
            <a
              href="mailto:info@dermoeczane.com"
              className="flex items-center gap-1.5 hover:text-primary-soft transition-colors"
            >
              <EnvelopeIcon className="w-3.5 h-3.5" />
              <span>info@dermoeczane.com</span>
            </a>
          </div>

          {/* Right: utility links */}
          <div className="flex items-center gap-5">
            <Link
              href="/hesabim/siparislerim"
              className="hover:text-primary-soft transition-colors"
            >
              Siparis Takip
            </Link>
            <Link
              href="/iletisim"
              className="hover:text-primary-soft transition-colors"
            >
              Yardim
            </Link>
          </div>
        </div>
      </div>

      {/* ======================== Main Bar ======================== */}
      <div
        className={cn(
          "bg-card-bg border-b border-border sticky top-0 z-50 transition-shadow duration-300",
          scrolled && "shadow-lg shadow-primary/5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 lg:gap-6">
          {/* --- Logo (left) --- */}
          <Link href="/" className="shrink-0 group" aria-label={siteName}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={siteName}
                className="h-10 lg:h-11 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <span className="flex items-baseline gap-0.5">
                <span className="font-display text-2xl lg:text-[1.7rem] font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors">
                  İstanbul
                </span>
                <span className="font-display text-2xl lg:text-[1.7rem] font-bold text-primary tracking-tight">
                  Vitamin
                </span>
                <LeafAccent />
              </span>
            )}
          </Link>

          {/* --- Search (center) --- */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-xl mx-auto"
          >
            <div
              className={cn(
                "relative w-full transition-all duration-300",
                searchFocused && "max-w-2xl"
              )}
            >
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Ürün, marka veya kategori ara..."
                className={cn(
                  "w-full h-11 pl-5 pr-12 rounded-full border bg-bg-primary text-sm text-text-primary",
                  "placeholder:text-text-secondary",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300",
                  searchFocused ? "border-primary" : "border-border"
                )}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors"
                aria-label="Ara"
              >
                <SearchIcon className="w-4 h-4" />
              </button>

              {/* Live preview */}
              <SearchPreview
                query={searchQuery}
                open={searchFocused}
                onClose={() => {
                  setSearchQuery("");
                  setSearchFocused(false);
                }}
              />
            </div>
          </form>

          {/* --- Action icons (right) --- */}
          <div className="flex items-center gap-1 shrink-0">
            {/* User */}
            <Link
              href="/giris-yap"
              className="relative group inline-flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
              aria-label="Hesabim"
            >
              <UserIcon className="w-5 h-5" />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-text-primary text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Hesabim
              </span>
            </Link>

            {/* Favorites */}
            <Link
              href="/hesabim/favorilerim"
              className="relative group inline-flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
              aria-label="Favorilerim"
            >
              <HeartIcon className="w-5 h-5" />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-text-primary text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Favorilerim
              </span>
            </Link>

            {/* Cart */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative group inline-flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
              aria-label="Sepet"
            >
              <BagIcon className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-rose text-white text-[10px] font-bold flex items-center justify-center leading-none animate-scale-in">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-text-primary text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Sepet
              </span>
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors ml-1"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================== Category Nav Bar (Desktop) ======================== */}
      <nav
        className="hidden lg:block text-white shadow-md relative z-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex items-center justify-center gap-1 h-12">
            {categories.map((cat, catIdx) => {
              const isActive =
                pathname === `/${cat.slug}` ||
                pathname?.startsWith(`/${cat.slug}/`);
              // Sağ yarıdaki kategorilerin dropdown'ı sağa dayansın (ekran taşmasın)
              const anchorRight = catIdx >= Math.floor(categories.length / 2);
              return (
                <li
                  key={cat.id}
                  className="relative group"
                  onMouseEnter={() => openMega(cat.id)}
                  onMouseLeave={closeMega}
                >
                  <Link
                    href={`/${cat.slug}`}
                    className={cn(
                      "relative flex items-center gap-2 px-4 h-12 text-[14px] font-semibold tracking-[0.01em] whitespace-nowrap transition-all duration-200",
                      "hover:text-white text-white/90",
                      isActive && "text-white"
                    )}
                  >
                    <Icon
                      icon={categoryIcon(cat.slug)}
                      width={18}
                      height={18}
                      className="relative z-10 transition-transform duration-200 group-hover:-translate-y-[1px] shrink-0"
                      aria-hidden
                    />
                    <span className="relative z-10 transition-transform duration-200 group-hover:-translate-y-[1px]">
                      {cat.name}
                    </span>
                    {/* Hover/active pill background */}
                    <span
                      className={cn(
                        "absolute inset-x-2 bottom-0 h-[3px] rounded-t-full transition-all duration-300",
                        isActive
                          ? "bg-white opacity-100 scale-x-100"
                          : "bg-white opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100"
                      )}
                    />
                    <span
                      className="absolute inset-1 rounded-lg bg-white/0 group-hover:bg-white/10 transition-colors duration-200"
                      aria-hidden
                    />
                  </Link>

                  {/* Mega dropdown */}
                  {activeMegaId === cat.id &&
                    cat.children &&
                    cat.children.length > 0 && (
                      <div
                        className={cn(
                          "absolute top-full pt-2 z-50",
                          anchorRight ? "right-0" : "left-0"
                        )}
                        onMouseEnter={cancelCloseMega}
                        onMouseLeave={closeMega}
                      >
                        <div
                          className={cn(
                            "animate-slide-down bg-white rounded-2xl shadow-2xl border border-border p-6 ring-1 ring-primary/5",
                            cat.children.length > 6
                              ? "w-[720px]"
                              : cat.children.length > 3
                                ? "w-[480px]"
                                : "w-[280px]"
                          )}
                        >
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                            <p className="text-[11px] uppercase tracking-widest text-primary font-bold">
                              {cat.name}
                            </p>
                            <Link
                              href={`/${cat.slug}`}
                              className="text-[11px] text-text-secondary hover:text-primary transition-colors"
                            >
                              Tümünü gör →
                            </Link>
                          </div>
                          <ul
                            className={cn(
                              "grid gap-x-4 gap-y-0.5",
                              cat.children.length > 6
                                ? "grid-cols-3"
                                : cat.children.length > 3
                                  ? "grid-cols-2"
                                  : "grid-cols-1"
                            )}
                          >
                            {cat.children.map((sub) => (
                              <li key={sub.id}>
                                <Link
                                  href={`/${cat.slug}/${sub.slug}`}
                                  className="text-sm text-text-primary hover:text-primary hover:bg-primary-soft/60 rounded-lg px-3 py-2 flex items-center gap-2 transition-all duration-150 group/item"
                                >
                                  <span className="w-1 h-1 rounded-full bg-primary/40 group-hover/item:bg-primary group-hover/item:scale-150 transition-all shrink-0" />
                                  <span className="flex-1 leading-snug">
                                    {sub.name}
                                  </span>
                                  <ChevronRightIcon className="w-3.5 h-3.5 text-text-secondary opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                </li>
              );
            })}

          </ul>
        </div>
      </nav>

      {/* ======================== Mobile Overlay ======================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ======================== Mobile Drawer ======================== */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[85vw] max-w-[360px] bg-card-bg z-[70] lg:hidden",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Link href="/" className="flex items-baseline gap-0.5" onClick={() => setMobileOpen(false)}>
            <span className="font-display text-xl font-bold text-text-primary">Dermo</span>
            <span className="font-display text-xl font-bold text-primary">Eczane</span>
            <LeafAccent />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
            aria-label="Menuyu kapat"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer search */}
        <form onSubmit={handleSearch} className="px-4 pt-3 pb-2">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Urun, marka veya kategori ara..."
              className="w-full h-10 pl-4 pr-10 rounded-full border border-border bg-bg-primary text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"
              aria-label="Ara"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Drawer categories */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
            Kategoriler
          </p>

          {/* Category accordion */}
          {categories.map((cat) => {
            const hasChildren = cat.children && cat.children.length > 0;
            const isExpanded = expandedMobileCategory === cat.id;

            return (
              <div key={cat.id}>
                <div className="flex items-center">
                  <Link
                    href={`/${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      pathname === `/${cat.slug}` || pathname?.startsWith(`/${cat.slug}/`)
                        ? "text-primary bg-primary-soft"
                        : "text-text-secondary hover:text-primary hover:bg-primary-soft"
                    )}
                  >
                    {cat.name}
                  </Link>
                  {hasChildren && (
                    <button
                      onClick={() => toggleMobileCategory(cat.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
                      aria-label={isExpanded ? "Alt kategorileri gizle" : "Alt kategorileri goster"}
                    >
                      <ChevronDownIcon
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  )}
                </div>

                {/* Expanded subcategories */}
                {hasChildren && isExpanded && (
                  <div className="ml-4 pl-3 border-l-2 border-border mb-1 animate-slide-down">
                    {cat.children!.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/${cat.slug}/${sub.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === `/${cat.slug}/${sub.slug}`
                            ? "text-primary font-medium"
                            : "text-text-secondary hover:text-primary hover:bg-primary-soft"
                        )}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* Drawer footer: user links */}
        <div className="border-t border-border px-2 py-3 space-y-0.5">
          <Link
            href="/giris-yap"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
          >
            <UserIcon className="w-5 h-5" />
            Hesabim
          </Link>
          <Link
            href="/hesabim/favorilerim"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
          >
            <HeartIcon className="w-5 h-5" />
            Favorilerim
          </Link>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              openCartDrawer();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors text-left w-full"
          >
            <BagIcon className="w-5 h-5" />
            <span>Sepet</span>
            {cartCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-accent-rose text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
