"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";
import { resolveImageUrl } from "@/lib/utils";

/**
 * Settings'te admin tarafından yüklenmiş favicon varsa onu kullanır.
 * Yüklenemezse Next.js'in default `/favicon.ico` linkini bozmaz —
 * yeni URL'i image preload ile doğruladıktan sonra swap eder.
 */
export default function FaviconInjector() {
  const { settings } = useSettings();
  const faviconUrl = settings.site_favicon_url;

  useEffect(() => {
    if (!faviconUrl) return;
    const href = resolveImageUrl(faviconUrl);
    if (!href) return;

    // Preload — başarısızsa default favicon'a dokunma.
    const probe = new Image();
    probe.onload = () => {
      document
        .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
        .forEach((n) => n.parentElement?.removeChild(n));
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = href;
      document.head.appendChild(link);
    };
    probe.src = href;
  }, [faviconUrl]);

  return null;
}
