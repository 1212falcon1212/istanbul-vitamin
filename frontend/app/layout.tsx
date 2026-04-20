import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import Providers from "@/components/Providers";
import LenisProvider from "@/app/providers/LenisProvider";
import { Toaster } from "sonner";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-serif-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "İstanbul Vitamin — Dermokozmetik Ürünleri",
    template: "%s | İstanbul Vitamin",
  },
  description:
    "Orijinal dermokozmetik ürünleri en uygun fiyatlarla İstanbul Vitamin'de. Cilt bakımı, saç bakımı, güneş ürünleri ve daha fazlası.",
  keywords: [
    "dermokozmetik",
    "cilt bakımı",
    "eczane",
    "kozmetik",
    "güneş kremi",
    "saç bakımı",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "İstanbul Vitamin",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${dmSerifDisplay.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary font-body">
        <LenisProvider>
          <Providers>{children}</Providers>
          <Toaster position="top-right" richColors />
        </LenisProvider>
      </body>
    </html>
  );
}
