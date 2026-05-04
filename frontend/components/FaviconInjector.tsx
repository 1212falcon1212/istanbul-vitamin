"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";
import { resolveImageUrl } from "@/lib/utils";

/**
 * Admin'in yüklediği favicon varsa onu set eder. Eskiden mevcut <link rel=icon>
 * elementlerini DOM'dan siliyorduk — React'in head üzerinde tuttuğu referansları
 * altından çekince navigation sırasında "Cannot read properties of null (reading
 * 'removeChild')" patlıyordu ve URL değişip sayfa açılmıyordu (refresh ile
 * düzeliyordu çünkü ağaç sıfırdan kuruluyordu).
 *
 * Çözüm: hiçbir node silmiyoruz; React'in render ettiği favicon link'ini
 * yerinde bırakıp sadece `href` attribute'ünü güncelliyoruz. Yoksa kendi
 * data-attribute'lı linkimizi ekliyoruz (sonraki güncellemelerde yine yerinde
 * güncelleriz).
 */
export default function FaviconInjector() {
  const { settings } = useSettings();
  const faviconUrl = settings.site_favicon_url;

  useEffect(() => {
    if (!faviconUrl) return;
    const href = resolveImageUrl(faviconUrl);
    if (!href) return;

    const probe = new window.Image();
    probe.onload = () => {
      let link = document.head.querySelector<HTMLLinkElement>(
        'link[rel="icon"][data-managed="favicon-injector"]'
      );
      if (!link) {
        // İlk çağrıda Next.js'in yerleştirdiği <link rel=icon>'u tekrar kullan;
        // yoksa yeni bir tane oluştur.
        const existing = document.head.querySelector<HTMLLinkElement>(
          'link[rel="icon"]'
        );
        if (existing) {
          link = existing;
        } else {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.setAttribute("data-managed", "favicon-injector");
      }
      if (link.href !== href) {
        link.href = href;
      }
    };
    probe.src = href;
  }, [faviconUrl]);

  return null;
}
