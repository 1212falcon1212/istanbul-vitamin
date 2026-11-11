import type { CSSProperties } from "react";
const paths = {
  cart: <><path d="M3 3h2l3 12h10l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  share: <><path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8"/></>,
  truck: <><path d="M2 4h12v13H2zm12 5h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m8 12 3 3 5-6"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/></>,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  left: <path d="m14 6-6 6 6 6"/>,
  right: <path d="m10 6 6 6-6 6"/>,
};
export default function DetailIcon({ name, filled = false }: { name: keyof typeof paths; filled?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
export function RatingStars({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`pdp-stars ${className}`} aria-label={`5 üzerinden ${value.toLocaleString("tr-TR")} yıldız`} style={{ "--rating": `${Math.max(0, Math.min(5, value)) * 20}%` } as CSSProperties}><span aria-hidden="true">★★★★★</span><span aria-hidden="true">★★★★★</span></span>;
}
