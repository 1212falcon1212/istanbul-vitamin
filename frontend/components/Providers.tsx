"use client";

// Side-effect import: registers every Iconify icon used by the app into the
// runtime at module load so <Icon /> never falls back to a CDN fetch.
// Must stay at the top so registration runs before any <Icon /> renders.
import "@/lib/iconify-bundle";

import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { CartDrawerProvider } from "@/lib/cart-drawer";
import { FavoritesProvider } from "@/lib/favorites";
import { FooterCatalogContext } from "@/lib/footer-context";
import type { FooterCatalog } from "@/lib/footer-catalog";
import { SettingsProvider, type SiteSettings } from "@/lib/settings";
import CartDrawer from "@/components/cart/CartDrawer";
import Marketing from "@/components/Marketing";
import PWAPushPrompt from "@/components/PWAPushPrompt";
import PWA from "@/components/PWA";
import FaviconInjector from "@/components/FaviconInjector";

export default function Providers({ children, initialSettings, footerCatalog }: { children: React.ReactNode; initialSettings: SiteSettings; footerCatalog: FooterCatalog }) {
  return (
    <SettingsProvider initialSettings={initialSettings}>
      <FooterCatalogContext.Provider value={footerCatalog}>
      <FaviconInjector />
      <PWA />
      <PWAPushPrompt />
      <Marketing />
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <CartDrawerProvider>
              {children}
              <CartDrawer />
            </CartDrawerProvider>
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
      </FooterCatalogContext.Provider>
    </SettingsProvider>
  );
}
