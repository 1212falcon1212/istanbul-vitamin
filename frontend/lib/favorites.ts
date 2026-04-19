"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import React from "react";
import { api } from "./api";

interface Favorite {
  id: number;
  product_id: number;
}

interface FavoritesContextType {
  ids: Set<number>;
  isLoading: boolean;
  isFavorite: (productId: number) => boolean;
  toggle: (productId: number) => Promise<void>;
}

const Ctx = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      setIds(new Set());
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get<Favorite[] | { favorites: Favorite[] }>(
        "/favorites"
      );
      const list: Favorite[] = Array.isArray(res.data)
        ? res.data
        : res.data?.favorites ?? [];
      setIds(new Set(list.map((f) => f.product_id)));
    } catch {
      setIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auth değişikliğinde favorileri yeniden yükle (login/logout sonrası stale list).
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onAuthChange() {
      load();
    }
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, [load]);

  const isFavorite = useCallback((pid: number) => ids.has(pid), [ids]);

  const toggle = useCallback(
    async (productId: number) => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Favori eklemek için giriş yapmalısın");
      }
      const has = ids.has(productId);
      // Optimistic
      setIds((prev) => {
        const next = new Set(prev);
        if (has) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        if (has) {
          await api.delete(`/favorites/${productId}`);
        } else {
          await api.post("/favorites", { product_id: productId });
        }
      } catch (err) {
        // Revert
        setIds((prev) => {
          const next = new Set(prev);
          if (has) next.add(productId);
          else next.delete(productId);
          return next;
        });
        throw err;
      }
    },
    [ids]
  );

  return React.createElement(
    Ctx.Provider,
    { value: { ids, isLoading, isFavorite, toggle } },
    children
  );
}

export function useFavorites() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFavorites must be used within FavoritesProvider");
  return c;
}
