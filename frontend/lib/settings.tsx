"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Site settings — backend `settings` tablosundan key-value olarak gelir.
 * Header/Footer logo, site adı, iletişim bilgileri gibi tüm frontend
 * tarafından paylaşılan değerler burada tutulur.
 */
export interface SiteSettings {
  site_name?: string;
  site_logo_url?: string;
  site_logo_url_dark?: string;
  site_favicon_url?: string;
  site_description?: string;
  phone?: string;
  email?: string;
  address?: string;
  whatsapp_number?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

interface SettingsContextValue {
  settings: SiteSettings;
  isLoading: boolean;
  /** Admin panel ayar güncellediğinde manuel yenileme için. */
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function fetchSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      credentials: "include",
    });
    if (!res.ok) return {};
    const json = await res.json();
    // Backend: { success, data: { settings: { key: value, ... } } }
    const inner = json?.data?.settings ?? json?.data ?? {};
    return (inner && typeof inner === "object" ? inner : {}) as SiteSettings;
  } catch {
    return {};
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    setIsLoading(true);
    const data = await fetchSettings();
    setSettings(data);
    setIsLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Fallback — provider dışı kullanımda boş settings döndür
    return { settings: {}, isLoading: false, reload: async () => {} };
  }
  return ctx;
}
