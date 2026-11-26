"use client";

import { useReportWebVitals } from "next/web-vitals";
import { readConsent } from "@/lib/marketing";

type Page = "home" | "category" | "product";
type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];
const reported = new Set<string>();

function report(page: Page, metric: Metric) {
  if (metric.name !== "LCP" || !readConsent()?.analytics || !window.matchMedia("(max-width: 767px)").matches) return;
  const navigation = performance.getEntriesByType("navigation")[0];
  if (!navigation || new URL(navigation.name).pathname !== location.pathname || reported.has(metric.id)) return;
  reported.add(metric.id);
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
  void fetch(api + "/metrics/mobile-lcp", {
    method: "POST", keepalive: true, credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, ms: Math.round(metric.value) }),
  }).catch(() => {});
}

const reporters = {
  home: (metric: Metric) => report("home", metric),
  category: (metric: Metric) => report("category", metric),
  product: (metric: Metric) => report("product", metric),
};
export default function MobileLCP({ page }: { page: Page }) {
  useReportWebVitals(reporters[page]);
  return null;
}
