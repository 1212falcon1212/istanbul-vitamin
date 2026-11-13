export type Consent = { analytics: boolean; ads: boolean; expires: number };
export type TrackingConfig = {
  enabled: boolean;
  measurement_id: string;
  ads_id: string;
  conversion_label: string;
};
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
const CONSENT_KEY = "iv-consent-v1";
let config: TrackingConfig | null = null;
let lastPage = "";
const pending: Array<() => void> = [];
function afterConfig(fn: () => void) {
  if (!config && pending.length < 20 && readConsent()) pending.push(fn);
}
export function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
    return c &&
      c.expires > Date.now() &&
      typeof c.analytics === "boolean" &&
      typeof c.ads === "boolean"
      ? c
      : null;
  } catch {
    return null;
  }
}
export function saveConsent(analytics: boolean, ads: boolean) {
  localStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({ analytics, ads, expires: Date.now() + 180 * 86400000 }),
  );
  // Removing cookies plus a reload stops an already loaded third-party runtime.
  if (!analytics || !ads)
    for (const part of document.cookie.split(";")) {
      const name = part.trim().split("=")[0];
      if ((!analytics && /^_ga/.test(name)) || (!ads && /^_gcl/.test(name))) {
        for (const domain of ["", location.hostname, "." + location.hostname])
          document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""}`;
      }
    }
}
export function configureTracking(value: TrackingConfig) {
  config = value;
  const consent = readConsent();
  // Local test data must never reach real accounts.
  if (
    !value.enabled ||
    !consent ||
    (!consent.analytics && !consent.ads) ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
  )
    return;
  if (window.gtag) return;
  const ga = /^G-[A-Z0-9]+$/.test(value.measurement_id)
    ? value.measurement_id
    : "";
  const ads = /^AW-\d+$/.test(value.ads_id) ? value.ads_id : "";
  const id = (consent.analytics && ga) || (consent.ads && ads);
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: consent.ads ? "granted" : "denied",
    ad_user_data: consent.ads ? "granted" : "denied",
    ad_personalization: consent.ads ? "granted" : "denied",
  });
  window.gtag("js", new Date());
  const safePage = location.origin + location.pathname;
  if (consent.analytics && ga)
    window.gtag("config", ga, {
      send_page_view: false,
      page_location: safePage,
      page_referrer: "",
      allow_google_signals: false,
    });
  if (consent.ads && ads)
    window.gtag("config", ads, {
      send_page_view: false,
      page_location: safePage,
      page_referrer: "",
    });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  pending.splice(0).forEach((fn) => fn());
}
export function trackPage(path: string) {
  if (
    lastPage === path ||
    /^\/(yonetim|hesabim|giris-yap|kayit-ol|sifremi)/.test(path)
  )
    return;
  if (!window.gtag || !readConsent()?.analytics || !config?.measurement_id)
    return;
  lastPage = path;
  window.gtag("event", "page_view", {
    send_to: config.measurement_id,
    page_location: location.origin + path,
    page_referrer: "",
  });
}
export type CommerceItem = { item_id: string; price: number; quantity: number };
export function trackCommerce(
  event: "view_item" | "add_to_cart" | "remove_from_cart" | "begin_checkout",
  items: CommerceItem[],
) {
  if (!config) {
    afterConfig(() => trackCommerce(event, items));
    return;
  }
  if (!window.gtag || !readConsent()?.analytics || !config?.measurement_id)
    return;
  window.gtag("event", event, {
    send_to: config.measurement_id,
    currency: "TRY",
    value: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    items,
    page_location: location.origin + location.pathname,
    page_referrer: "",
  });
}
// Purchase must only be called with a server-confirmed paid order, never URL parameters.
// Transaction ID is shared by GA4 and Ads for provider-side deduplication.
export function trackPaidPurchase(order: {
  id: string;
  payment_status: string;
  total: number;
  items: CommerceItem[];
}) {
  if (!config) {
    afterConfig(() => trackPaidPurchase(order));
    return;
  }
  if (order.payment_status !== "paid" || !window.gtag || !config) return;
  const consent = readConsent();
  if (!consent) return;
  const base = {
    transaction_id: order.id,
    value: order.total,
    currency: "TRY",
    page_location: location.origin + "/odeme/basarili",
    page_referrer: "",
  };
  for (const [provider, allowed] of [
    ["analytics", consent.analytics],
    ["ads", consent.ads],
  ] as const) {
    const key = `iv-purchase-${provider}-${order.id}`;
    if (!allowed || localStorage.getItem(key)) continue;
    if (provider === "analytics" && config.measurement_id) {
      window.gtag("event", "purchase", {
        ...base,
        items: order.items,
        send_to: config.measurement_id,
      });
      localStorage.setItem(key, "1");
    }
    if (provider === "ads" && config.ads_id && config.conversion_label) {
      window.gtag("event", "conversion", {
        ...base,
        send_to: `${config.ads_id}/${config.conversion_label}`,
      });
      localStorage.setItem(key, "1");
    }
  }
}
