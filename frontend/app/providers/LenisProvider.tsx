"use client";

import { useEffect, type ReactNode } from "react";

interface LenisProviderProps {
  children: ReactNode;
}

/**
 * Enables CSS-based smooth scrolling globally.
 *
 * This acts as a lightweight drop-in for Lenis smooth scroll without
 * adding an extra runtime dependency. Swap the body of useEffect for
 * a real Lenis instance if the package is added in the future.
 */
export default function LenisProvider({ children }: LenisProviderProps) {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return <>{children}</>;
}
