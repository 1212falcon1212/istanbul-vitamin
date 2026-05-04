import type { NextConfig } from "next";

// deploymentId her build'de yeni bir id üretir. Canlı tarafta açık bir
// tarayıcı deploy olduktan sonra eski chunk hash'lerini prefetch cache'inde
// tutuyordu; Link'e tıklayınca URL pushState ile değişiyor ama yeni RSC
// fetch'i stale bundle'a denk gelip sessizce başarısız oluyor, sayfa
// olduğu yerde kalıyordu (refresh sonrası gidiyor). deploymentId set
// edilince Next.js chunk fetch'lerine dId param'ı ekleyip mismatch'i
// yakalıyor ve tam page reload tetikliyor.
const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  String(Date.now());

const nextConfig: NextConfig = {
  deploymentId,
  images: {
    remotePatterns: [
      { hostname: "placehold.co" },
      { hostname: "cdn.myikas.com" },
      { hostname: "*.myikas.com" },
      { hostname: "localhost", port: "8080", pathname: "/uploads/**" },
      { hostname: "localhost" },
    ],
  },
};

export default nextConfig;
