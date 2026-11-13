"use client";

// Side-effect import: registers every Iconify icon used by the app into the
// runtime at module load so <Icon /> never falls back to a CDN fetch.
// Must stay at the top so registration runs before any <Icon /> renders.
import "@/lib/iconify-bundle";

import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { CartDrawerProvider } from "@/lib/cart-drawer";
import { FavoritesProvider } from "@/lib/favorites";
import { SettingsProvider } from "@/lib/settings";
import CartDrawer from "@/components/cart/CartDrawer";
import Marketing from "@/components/Marketing";
import PWA from "@/components/PWA";
import FaviconInjector from "@/components/FaviconInjector";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <FaviconInjector />
      <PWA />
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
    </SettingsProvider>
  );
}
