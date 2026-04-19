"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";
import { resolveImageUrl } from "@/lib/utils";

export default function FaviconInjector() {
  const { settings } = useSettings();
  const faviconUrl = settings.site_favicon_url;

  useEffect(() => {
    if (!faviconUrl) return;
    const href = resolveImageUrl(faviconUrl);
    const selector = 'link[rel="icon"]';
    document.querySelectorAll(selector).forEach((n) => n.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
  }, [faviconUrl]);

  return null;
}
