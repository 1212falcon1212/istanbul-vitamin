"use client";

import { useEffect } from "react";

/**
 * Favicon'u kod deposundaki `public/favicon.png` dosyasından set eder.
 * Eskiden mevcut <link rel=icon> elementlerini DOM'dan siliyorduk — React'in head üzerinde tuttuğu referansları
 * altından çekince navigation sırasında "Cannot read properties of null (reading
 * 'removeChild')" patlıyordu ve URL değişip sayfa açılmıyordu (refresh ile
 * düzeliyordu çünkü ağaç sıfırdan kuruluyordu).
 *
 * Çözüm: hiçbir node silmiyoruz; head'deki tüm icon linklerini aynı dosyaya
 * yönlendiriyoruz ve en sona yönetilen linkleri ekliyoruz. Böylece settings veya
 * Next'in otomatik icon linkleri dosyadan okunan favicon'u ezemiyor.
 */
const FAVICON_HREF = "/favicon.png?v=8";

export default function FaviconInjector() {
  useEffect(() => {
    const probe = new window.Image();
    probe.onload = () => {
      document.head
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')
        .forEach((link) => {
          link.href = FAVICON_HREF;
          link.type = "image/png";
          link.sizes.value = "64x64";
        });

      ensureIconLink("icon");
      ensureIconLink("shortcut icon");
      ensureIconLink("apple-touch-icon");
    };
    probe.src = FAVICON_HREF;
  }, []);

  return null;
}

function ensureIconLink(rel: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"][data-managed="favicon-injector"]`
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    link.setAttribute("data-managed", "favicon-injector");
    document.head.appendChild(link);
  }
  link.href = FAVICON_HREF;
  link.type = "image/png";
  link.sizes.value = "64x64";
}
