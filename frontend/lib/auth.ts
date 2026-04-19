"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { User, Admin, AuthResponse } from "@/types";
import React from "react";

interface AuthContextType {
  user: User | null;
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  /** Yalnızca kullanıcı oturumunu kapatır, admin oturumuna dokunmaz. */
  logout: () => Promise<void>;
  /** Yalnızca admin panel oturumunu kapatır. */
  adminLogout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// Kullanıcı ve admin oturumları ayrı localStorage anahtarlarında tutulur —
// aynı tarayıcıda her iki oturum eş zamanlı açık kalabilsin diye.
const USER_TOKEN = "auth_token";
const USER_ROLE = "auth_role"; // her zaman "user"
const ADMIN_TOKEN = "admin_token";
const ADMIN_ROLE = "admin_role"; // "super_admin" | "admin" | "editor"

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function mergeGuestCart() {
  try {
    const sessionId = localStorage.getItem("cart_session_id");
    if (!sessionId) return;
    const token = localStorage.getItem(USER_TOKEN);
    await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1") +
        "/cart/merge",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  } catch {
    // Non-critical
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    const userToken = localStorage.getItem(USER_TOKEN);
    const adminToken = localStorage.getItem(ADMIN_TOKEN);

    // User ve admin oturumları birbirinden bağımsız — paralel yükle.
    const tasks: Promise<void>[] = [];

    if (userToken) {
      tasks.push(
        (async () => {
          try {
            const res = await api.get<{ user: User } | User>("/users/me");
            const raw = res.data as { user?: User } | User | undefined;
            const u = raw && "user" in raw ? raw.user : (raw as User | undefined);
            if (u) setUser(u);
          } catch {
            localStorage.removeItem(USER_TOKEN);
            localStorage.removeItem(USER_ROLE);
          }
        })()
      );
    }

    if (adminToken) {
      tasks.push(
        (async () => {
          try {
            const res = await api.get<{ user: Admin } | Admin>("/admin/users/me");
            const raw = res.data as { user?: Admin } | Admin | undefined;
            const a = raw && "user" in raw ? raw.user : (raw as Admin | undefined);
            if (a) setAdmin(a);
          } catch {
            localStorage.removeItem(ADMIN_TOKEN);
            localStorage.removeItem(ADMIN_ROLE);
          }
        })()
      );
    }

    await Promise.all(tasks);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    if (res.data) {
      localStorage.setItem(USER_TOKEN, res.data.token);
      localStorage.setItem(USER_ROLE, "user");
      if (res.data.user) setUser(res.data.user);
      await mergeGuestCart();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-changed"));
      }
    }
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/admin/login", {
      email,
      password,
    });
    if (res.data) {
      localStorage.setItem(ADMIN_TOKEN, res.data.token);
      localStorage.setItem(ADMIN_ROLE, res.data.admin?.role || "admin");
      if (res.data.admin) setAdmin(res.data.admin);
    }
  };

  const register = async (data: RegisterData) => {
    const res = await api.post<AuthResponse>("/auth/register", data);
    if (res.data) {
      localStorage.setItem(USER_TOKEN, res.data.token);
      localStorage.setItem(USER_ROLE, "user");
      if (res.data.user) setUser(res.data.user);
      await mergeGuestCart();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-changed"));
      }
    }
  };

  const logout = async () => {
    try {
      // Backend role'e göre doğru cookie'yi temizler — user cookie hedeflenir.
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem(USER_TOKEN);
    localStorage.removeItem(USER_ROLE);
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth-changed"));
    }
  };

  const adminLogout = async () => {
    try {
      // Admin endpoint'e çağır ki backend admin cookie'sini temizlesin.
      await api.post("/admin/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem(ADMIN_TOKEN);
    localStorage.removeItem(ADMIN_ROLE);
    setAdmin(null);
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        admin,
        isLoading,
        isAuthenticated: !!user || !!admin,
        isAdmin: !!admin,
        login,
        adminLogin,
        register,
        logout,
        adminLogout,
      },
    },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
