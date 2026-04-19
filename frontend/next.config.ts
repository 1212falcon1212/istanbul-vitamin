import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
