import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Yönetim Paneli",
    template: "%s | DermoEczane Yönetim",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
