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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function mergeGuestCart() {
  try {
    const sessionId = localStorage.getItem("cart_session_id");
    if (!sessionId) return;
    await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1") +
        "/cart/merge",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
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
    const [userResult, adminResult] = await Promise.allSettled([
      api.get<{ user: User } | User>("/users/me"),
      api.get<{ user: Admin } | Admin>("/admin/users/me"),
    ]);

    if (userResult.status === "fulfilled") {
      const raw = userResult.value.data as { user?: User } | User | undefined;
      const u = raw && "user" in raw ? raw.user : (raw as User | undefined);
      setUser(u ?? null);
    } else {
      setUser(null);
    }

    if (adminResult.status === "fulfilled") {
      const raw = adminResult.value.data as { user?: Admin } | Admin | undefined;
      const a = raw && "user" in raw ? raw.user : (raw as Admin | undefined);
      setAdmin(a ?? null);
    } else {
      setAdmin(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(loadSessions, 0);
    return () => window.clearTimeout(id);
  }, [loadSessions]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    if (res.data) {
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
      if (res.data.admin) setAdmin(res.data.admin);
    }
  };

  const register = async (data: RegisterData) => {
    const res = await api.post<AuthResponse>("/auth/register", data);
    if (res.data) {
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
