"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  title: string;
  children: React.ReactNode;
}

type NavLeaf = { href: string; label: string };
type NavEntry =
  | { kind: "link"; href: string; label: string; icon: IconCmp }
  | { kind: "group"; label: string; icon: IconCmp; items: NavLeaf[] };

type IconCmp = (props: { className?: string }) => React.ReactElement;

const navEntries: NavEntry[] = [
  { kind: "link", href: "/yonetim", label: "Dashboard", icon: DashboardIcon },
  {
    kind: "group",
    label: "Ürün Yönetimi",
    icon: ProductIcon,
    items: [
      { href: "/yonetim/urunler", label: "Ürünler" },
      { href: "/yonetim/kategoriler", label: "Kategoriler" },
      { href: "/yonetim/markalar", label: "Markalar" },
      { href: "/yonetim/varyasyonlar", label: "Varyasyonlar" },
    ],
  },
  {
    kind: "group",
    label: "Sipariş Yönetimi",
    icon: OrderIcon,
    items: [
      { href: "/yonetim/siparisler", label: "Siparişler" },
      { href: "/yonetim/kampanyalar", label: "Kampanyalar" },
      { href: "/yonetim/kuponlar", label: "Kuponlar" },
      { href: "/yonetim/musteriler", label: "Müşteriler" },
    ],
  },
  {
    kind: "group",
    label: "Fatura Yönetimi",
    icon: InvoiceIcon,
    items: [
      { href: "/yonetim/faturalar", label: "Faturalar" },
      { href: "/yonetim/ayarlar/bizimhesap", label: "Bizimhesap API Ayarları" },
    ],
  },
  {
    kind: "group",
    label: "Site Tasarımı",
    icon: DesignIcon,
    items: [
      { href: "/yonetim/sayfalar", label: "Sayfalar" },
      { href: "/yonetim/bannerlar", label: "Banner'lar" },
    ],
  },
  { kind: "link", href: "/yonetim/ayarlar", label: "Site Ayarları", icon: SettingsIcon },
  { kind: "link", href: "/yonetim/marketplace", label: "Pazaryeri", icon: MarketplaceIcon },
];

export default function AdminShell({ title, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const role = localStorage.getItem("admin_role");
    if (!token || !["super_admin", "admin", "editor"].includes(role || "")) {
      router.push("/yonetim/giris");
      return;
    }
    setIsAuthed(true);
    setAdminName(localStorage.getItem("admin_name") || "Admin");
  }, [router]);

  async function handleLogout() {
    try {
      // Backend admin cookie'sini temizler.
      await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1") +
          "/admin/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
          },
        }
      );
    } catch {
      // ignore
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_name");
    router.push("/yonetim/giris");
  }

  if (!isAuthed) return null;

  function isActive(href: string): boolean {
    if (href === "/yonetim") return pathname === "/yonetim";
    // /yonetim/ayarlar -> /yonetim/ayarlar/bizimhesap çakışmasını engellemek için tam eşitlik veya /altyol kontrolü.
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isGroupActive(items: NavLeaf[]): boolean {
    return items.some((it) => isActive(it.href));
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card-bg border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border shrink-0">
          <Link href="/yonetim" className="font-display text-lg text-primary">
            İstanbul Vitamin
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-secondary hover:text-text-primary"
            aria-label="Menuyu kapat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navEntries.map((entry, idx) => {
            if (entry.kind === "link") {
              const active = isActive(entry.href);
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-text-secondary hover:bg-primary-soft/50 hover:text-text-primary"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {entry.label}
                </Link>
              );
            }

            return (
              <NavGroup
                key={`group-${idx}`}
                entry={entry}
                isActive={isActive}
                groupActive={isGroupActive(entry.items)}
                onLeafClick={() => setSidebarOpen(false)}
              />
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card-bg border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text-secondary hover:text-text-primary"
              aria-label="Menuyu ac"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h1 className="font-display text-xl text-text-primary">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary hidden sm:block">{adminName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-text-secondary hover:text-red-500 transition-colors"
            >
              Cikis Yap
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/* --- NavGroup --- */

function NavGroup({
  entry,
  isActive,
  groupActive,
  onLeafClick,
}: {
  entry: Extract<NavEntry, { kind: "group" }>;
  isActive: (href: string) => boolean;
  groupActive: boolean;
  onLeafClick: () => void;
}) {
  const [open, setOpen] = useState(groupActive);
  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  const Icon = entry.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          groupActive
            ? "text-text-primary"
            : "text-text-secondary hover:bg-primary-soft/50 hover:text-text-primary"
        )}
        aria-expanded={open}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={cn("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <ul className="mt-1 ml-3 pl-4 border-l border-border space-y-0.5">
          {entry.items.map((leaf) => {
            const active = isActive(leaf.href);
            return (
              <li key={leaf.href}>
                <Link
                  href={leaf.href}
                  onClick={onLeafClick}
                  className={cn(
                    "block px-3 py-1.5 rounded-md text-sm transition-colors",
                    active
                      ? "bg-primary-soft text-primary font-medium"
                      : "text-text-secondary hover:bg-primary-soft/40 hover:text-text-primary"
                  )}
                >
                  {leaf.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --- Icon Components --- */

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ProductIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function OrderIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.34-1.872l1.005-4.397A.75.75 0 0019.58 7.5H6.75l-.562-2.228M7.5 14.25L5.106 5.272M15 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm-6 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function InvoiceIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function DesignIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

function MarketplaceIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
