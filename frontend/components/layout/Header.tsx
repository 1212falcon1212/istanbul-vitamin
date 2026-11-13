"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartDrawer } from "@/lib/cart-drawer";
import {useHomeContent} from "@/lib/use-home-content";
import {safeContentLink} from "@/lib/home-content";
import { useSettings } from "@/lib/settings";
import CategoryMenu from "./CategoryMenu";
// Offline entry: icons are registered at build time in lib/iconify-bundle.ts
// so the runtime never reaches out to the Iconify CDN.

import type { Category } from "@/types";
import SearchPreview from "./SearchPreview";

// ---------------------------------------------------------------------------
// Icons (inline SVG for zero-dependency, consistent stroke style)
// ---------------------------------------------------------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2.5 3.5h2.3l2.2 11a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6l1.3-7.2H5.5"/><circle cx="9.2" cy="20" r="1.2"/><circle cx="18.2" cy="20" r="1.2"/></svg>;
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
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
  const home=useHomeContent();
  const { settings, isLoading: settingsLoading } = useSettings();
  const logoUrl = settings.site_logo_url
    ? resolveImageUrl(settings.site_logo_url)
    : "";
  const siteName = settings.site_name || "İstanbul Vitamin";
  const announcementText = settings.top_header_text?.trim() ?? "Stoktaki ürünlerde aynı gün kargo • Bakımın için sevdiğin markalar bir arada";
  const announcementHref = settings.top_header_link?.trim();

  // --- State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);


  const searchRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const showTopHeader = settings.top_header_enabled !== "false";

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
    setCategoryOpen(false);
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

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled])') || []);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key === "Tab") {
        const nodes=focusable(), first=nodes[0], last=nodes[nodes.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener("keydown",handleKey);
    return()=>{window.removeEventListener("keydown",handleKey);previous?.focus();};
  },[mobileOpen]);

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

  // --- Mobile accordion toggle ---
  function toggleMobileCategory(id: number) {
    setExpandedMobileCategory((prev) => (prev === id ? null : id));
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <header className="shop-header w-full z-50 relative">
      {showTopHeader && settings.top_header_mode === "image" && settings.top_header_image ? <Link className="top-strip-banner" href={safeContentLink(settings.top_header_link || "/")}><picture>{settings.top_header_image_mobile && <source media="(max-width:767px)" srcSet={resolveImageUrl(settings.top_header_image_mobile)}/>}<img src={resolveImageUrl(settings.top_header_image)} alt={settings.top_header_image_alt || "Mağaza duyurusu"} fetchPriority="high"/></picture></Link> : showTopHeader && announcementText && <div className="theme-announcement" aria-label="Mağaza duyurusu"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7" strokeLinejoin="round"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>{announcementHref ? <Link href={safeContentLink(announcementHref)}>{announcementText}</Link> : announcementText}</div>}
      {home.header.utilitiesEnabled && <div className="theme-utilities theme-container"><div>{home.header.utilityLinks.map((link,i)=><Link key={i} href={safeContentLink(link.href)}>{link.label}</Link>)}<span>{home.header.utilityText}</span></div><Link href={safeContentLink(home.header.trackingHref)}>{home.header.trackingLabel}</Link></div>}
      {/* ======================== Main Bar ======================== */}
      <div
        className={cn(
          "bg-card-bg border-b border-border sticky top-0 z-50 transition-shadow duration-300",
          scrolled && "shadow-lg shadow-primary/5"
        )}
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-5 flex flex-wrap md:flex-nowrap items-center gap-4 lg:gap-8">
          {/* --- Logo (left) --- */}
          <Link href="/" className="shrink-0 group" aria-label={siteName}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={siteName}
                className="h-10 lg:h-11 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
            ) : settingsLoading ? (
              // Settings yüklenirken logo placeholder — fallback metin "İstanbul Vitamin"
              // birden fazla yerde flash oluşturuyordu, bunun yerine boş alan tutuyoruz.
              <span className="block h-10 lg:h-11 w-32" aria-hidden />
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
            className="shop-search flex flex-1 mx-auto"
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
                  "w-full h-12 pl-5 pr-12 rounded-md border bg-[#f3f4f6] text-sm text-text-primary",
                  "placeholder:text-text-secondary",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300",
                  searchFocused ? "border-primary" : "border-border"
                )}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md text-text-primary flex items-center justify-center hover:bg-primary-soft transition-colors"
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
          <div className="theme-header-actions flex items-center gap-2 shrink-0">
            {/* User */}
            <Link
              href="/giris-yap"
              className="relative group inline-flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
              aria-label="Hesabım" data-account-link
            >
              <UserIcon className="w-5 h-5" /><span className="theme-account-label">Giriş yap<strong>Hesabım</strong></span>
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
              <CartIcon className="w-5 h-5" />
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
              aria-label="Menü"
              aria-expanded={mobileOpen}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <nav className="shop-navbar hidden lg:block" aria-label="Ana menü">
        <div className="shop-nav-inner">
          <div className="shop-all-categories">
            <button type="button" onClick={() => setCategoryOpen(!categoryOpen)} aria-expanded={categoryOpen} aria-controls="header-category-menu"><GridIcon className="w-5 h-5" />Tüm Kategoriler<ChevronDownIcon className="w-4 h-4 ml-auto" /></button>
            {categoryOpen && <div id="header-category-menu" className="shop-category-dropdown" onKeyDown={e => { if (e.key === "Escape") setCategoryOpen(false); }}><CategoryMenu categories={categories} /></div>}
          </div>
          <div className="shop-nav-links">
            {home.header.menu.map((link,i)=><Link key={i} href={safeContentLink(link.href)} aria-current={pathname===link.href?"page":undefined}>{link.label}</Link>)}
          </div>
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
        inert={!mobileOpen}
        aria-hidden={!mobileOpen}
        role="dialog"
        aria-modal={mobileOpen || undefined}
        aria-label="Mobil menü"
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[85vw] max-w-[360px] bg-card-bg z-[70] lg:hidden",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-0.5"
            onClick={() => setMobileOpen(false)}
            aria-label={siteName}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={siteName}
                className="h-8 w-auto object-contain"
              />
            ) : settingsLoading ? (
              <span className="block h-8 w-24" aria-hidden />
            ) : (
              <span className="flex items-baseline gap-0.5">
                <span className="font-display text-xl font-bold text-text-primary">İstanbul</span>
                <span className="font-display text-xl font-bold text-primary">Vitamin</span>
                <LeafAccent />
              </span>
            )}
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
            <CartIcon className="w-5 h-5" />
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
