/**
 * Build-time Iconify icon bundle.
 *
 * Registers every icon used by the app directly into the Iconify runtime so
 * that `@iconify/react` never performs a network request to the Iconify CDN.
 *
 * Why inline SVG bodies instead of pulling `@iconify/json` at runtime?
 *   - `@iconify/json` ships as multi-megabyte JSON per collection and Next.js
 *     cannot tree-shake individual icons out of those JSON files.
 *   - `@iconify-icons/*` per-icon packages exist but add a pile of dependency
 *     boilerplate for 11 icons.
 *   - Hand-pasting the SVG bodies keeps this file ~5 KB, zero runtime deps,
 *     fully tree-shakable, and decouples us from the CDN.
 *
 * The SVG bodies below were extracted verbatim from `@iconify/json`
 * (kept as a dev dependency purely for this extraction step) and match the
 * icons exactly as served by api.iconify.design.
 *
 * To add a new icon:
 *   1. npx --yes @iconify/tools icon <prefix> <name>  (or copy from iconify.design)
 *   2. Add an `addIcon("<prefix>:<name>", { body, width, height })` call below.
 *   3. Update `lib/category-icons.ts` (or the consuming component).
 *
 * This module is imported for side effects only from `components/Providers.tsx`.
 */

// Import from the `/offline` entry point on purpose: it is the exact same
// public API (`addIcon`, `Icon`, `InlineIcon`, …) but the bundle is stripped
// of all CDN / API client code. Combined with the registrations below, this
// guarantees zero outbound icon fetches at runtime.
import { addIcon } from "@iconify/react/offline";

// -- Phosphor (ph:*) — viewBox 256x256 -------------------------------------

addIcon("ph:drop-duotone", {
  body:
    '<g fill="currentColor"><path d="M208 144a80 80 0 0 1-160 0c0-72 80-128 80-128s80 56 80 128" opacity=".2"/><path d="M174 47.75a254.2 254.2 0 0 0-41.45-38.3a8 8 0 0 0-9.18 0A254.2 254.2 0 0 0 82 47.75C54.51 79.32 40 112.6 40 144a88 88 0 0 0 176 0c0-31.4-14.51-64.68-42-96.25M128 216a72.08 72.08 0 0 1-72-72c0-57.23 55.47-105 72-118c16.53 13 72 60.75 72 118a72.08 72.08 0 0 1-72 72m55.89-62.66a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.33.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68Z"/></g>',
  width: 256,
  height: 256,
});

addIcon("ph:baby-duotone", {
  body:
    '<g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M92 140a12 12 0 1 1 12-12a12 12 0 0 1-12 12m72-24a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-12.27 45.23a45 45 0 0 1-47.46 0a8 8 0 0 0-8.54 13.54a61 61 0 0 0 64.54 0a8 8 0 0 0-8.54-13.54M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88.11 88.11 0 0 0-84.09-87.91C120.32 56.38 120 71.88 120 72a8 8 0 0 0 16 0a8 8 0 0 1 16 0a24 24 0 0 1-48 0c0-.73.13-14.3 8.46-30.63A88 88 0 1 0 216 128"/></g>',
  width: 256,
  height: 256,
});

addIcon("ph:heart-duotone", {
  body:
    '<g fill="currentColor"><path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2"/><path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8"/></g>',
  width: 256,
  height: 256,
});

addIcon("ph:gift-duotone", {
  body:
    '<g fill="currentColor"><path d="M208 128v72a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8v-72Z" opacity=".2"/><path d="M216 72h-35.08c.39-.33.79-.65 1.17-1A29.53 29.53 0 0 0 192 49.57A32.62 32.62 0 0 0 158.44 16A29.53 29.53 0 0 0 137 25.91a55 55 0 0 0-9 14.48a55 55 0 0 0-9-14.48A29.53 29.53 0 0 0 97.56 16A32.62 32.62 0 0 0 64 49.57A29.53 29.53 0 0 0 73.91 71c.38.33.78.65 1.17 1H40a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16v64a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16v-64a16 16 0 0 0 16-16V88a16 16 0 0 0-16-16m-67-35.49a13.7 13.7 0 0 1 10-4.5h.49A16.62 16.62 0 0 1 176 49.08a13.7 13.7 0 0 1-4.5 10c-9.49 8.4-25.24 11.36-35 12.4c1.2-10.59 4.5-25.98 12.5-34.97m-64.09.36A16.63 16.63 0 0 1 96.59 32h.49a13.7 13.7 0 0 1 10 4.5c8.39 9.48 11.35 25.2 12.39 34.92c-9.72-1-25.44-4-34.92-12.39a13.7 13.7 0 0 1-4.5-10a16.6 16.6 0 0 1 4.82-12.16ZM40 88h80v32H40Zm16 48h64v64H56Zm144 64h-64v-64h64Zm16-80h-80V88h80z"/></g>',
  width: 256,
  height: 256,
});

addIcon("ph:tag-duotone", {
  body:
    '<g fill="currentColor"><path d="M237.66 153L153 237.66a8 8 0 0 1-11.31 0l-99.35-99.32a8 8 0 0 1-2.34-5.65V40h92.69a8 8 0 0 1 5.65 2.34l99.32 99.32a8 8 0 0 1 0 11.34" opacity=".2"/><path d="M243.31 136L144 36.69A15.86 15.86 0 0 0 132.69 32H40a8 8 0 0 0-8 8v92.69A15.86 15.86 0 0 0 36.69 144L136 243.31a16 16 0 0 0 22.63 0l84.68-84.68a16 16 0 0 0 0-22.63m-96 96L48 132.69V48h84.69L232 147.31ZM96 84a12 12 0 1 1-12-12a12 12 0 0 1 12 12"/></g>',
  width: 256,
  height: 256,
});

// -- Material Design Icons (mdi:*) — viewBox 24x24 --------------------------

addIcon("mdi:lipstick", {
  body:
    '<path fill="currentColor" d="M9 23c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1h6c.55 0 1 .45 1 1v9c0 .55-.45 1-1 1zm1-12c-.55 0-1-.45-1-1V5.25S11 3 11.75 1c1.08.67 2.17 1.33 2.71 2.83S15 7.67 15 10c0 .55-.45 1-1 1z"/>',
  width: 24,
  height: 24,
});

// -- Tabler (tabler:*) — viewBox 24x24 --------------------------------------

addIcon("tabler:scissors", {
  body:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a3 3 0 1 0 6 0a3 3 0 1 0-6 0m0 10a3 3 0 1 0 6 0a3 3 0 1 0-6 0m5.6-8.4L19 19M8.6 15.4L19 5"/>',
  width: 24,
  height: 24,
});

addIcon("tabler:sun", {
  body:
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0m-5 0h1m8-9v1m8 8h1m-9 8v1M5.6 5.6l.7.7m12.1-.7l-.7.7m0 11.4l.7.7m-12.1-.7l-.7.7"/>',
  width: 24,
  height: 24,
});

addIcon("tabler:leaf", {
  body:
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M5 21c.5-4.5 2.5-8 7-10"/><path d="M9 18c6.218 0 10.5-3.288 11-12V4h-4.014c-9 0-11.986 4-12 9c0 1 0 3 2 5z"/></g>',
  width: 24,
  height: 24,
});

// -- Material Symbols (material-symbols:*) — viewBox 24x24 ------------------

addIcon("material-symbols:spa-outline", {
  body:
    '<path fill="currentColor" d="M12 22q-1.825-.225-3.625-.987t-3.212-2.188t-2.288-3.6T2 10V9h1q1.275 0 2.625.325t2.525.975q.3-2.15 1.363-4.413T12 2q1.425 1.625 2.488 3.888T15.85 10.3q1.175-.65 2.525-.975T21 9h1v1q0 3.05-.875 5.225t-2.287 3.6t-3.2 2.188T12 22m-.05-2.05q-.275-4.15-2.463-6.275T4.05 11.05q.275 4.275 2.538 6.375t5.362 2.525M12 13.6q.375-.55.913-1.137t1.037-1.013q-.05-1.425-.562-2.975T12 5.45q-.875 1.475-1.388 3.025t-.562 2.975q.5.425 1.05 1.013T12 13.6m1.95 5.9q.925-.3 1.925-.875t1.863-1.562t1.475-2.463t.737-3.55q-2.35.35-4.125 1.563T13.1 15.7q.3.8.513 1.75t.337 2.05M12 22"/>',
  width: 24,
  height: 24,
});

// -- Fluent (fluent:*) — viewBox 24x24 --------------------------------------

addIcon("fluent:food-apple-24-regular", {
  body:
    '<path fill="currentColor" d="M8.397 11.235a.75.75 0 0 0-.294-1.471c-.903.18-1.585.812-1.948 1.659c-.36.838-.413 1.886-.132 3.008a.75.75 0 1 0 1.455-.363c-.22-.878-.148-1.58.055-2.054c.2-.466.518-.71.864-.78M5.471 3.419A5.18 5.18 0 0 0 6.89 7.302a5.12 5.12 0 0 0-3.66 4.216a10.46 10.46 0 0 0 1.37 6.796l.35.59l.043.063l1.416 1.906a3.462 3.462 0 0 0 5.275.336a.437.437 0 0 1 .63 0a3.462 3.462 0 0 0 5.275-.336l1.416-1.907l.042-.063l.351-.59a10.46 10.46 0 0 0 1.373-6.795a5.12 5.12 0 0 0-6.11-4.306l-1.901.394h-.003c.03-.78.152-1.62.391-2.338c.29-.868.692-1.39 1.14-1.576a.75.75 0 1 0-.578-1.385c-1.052.439-1.65 1.48-1.985 2.486l-.046.142a5.2 5.2 0 0 0-.943-1.29a5.18 5.18 0 0 0-3.98-1.51A1.367 1.367 0 0 0 5.47 3.418m1.493.207a3.68 3.68 0 0 1 2.712 1.08a3.68 3.68 0 0 1 1.08 2.712a4 4 0 0 1-.543-.025l-.617-.128a3.7 3.7 0 0 1-1.552-.927a3.68 3.68 0 0 1-1.08-2.712m2.07 5.055l.202.042q.36.102.73.152l.97.2a5.25 5.25 0 0 0 2.13 0l1.902-.394a3.62 3.62 0 0 1 4.32 3.045a8.96 8.96 0 0 1-1.177 5.821l-.331.557l-1.393 1.876a1.962 1.962 0 0 1-2.99.19a1.936 1.936 0 0 0-2.792 0a1.962 1.962 0 0 1-2.99-.19l-1.393-1.876l-.331-.557a8.96 8.96 0 0 1-1.176-5.821A3.62 3.62 0 0 1 9.033 8.68"/>',
  width: 24,
  height: 24,
});
