"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import React from "react";
import { useAuth } from "./auth";
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

  const { user } = useAuth();
  const generation = useRef(0);
  const pending = useRef(new Set<number>());
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    const version = ++generation.current;
    setIds(new Set());
    pending.current = new Set();
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    async function load() {
      const all = new Set<number>();
      for (let page = 1; ; page++) {
        const res = await api.getList<Favorite[]>(`/favorites?page=${page}&per_page=500`);
        if (generation.current !== version) return;
        const list = Array.isArray(res.data) ? res.data : [];
        list.forEach(f => all.add(f.product_id));
        if (!list.length || page >= (res.pagination?.total_pages ?? 1)) break;
      }
      if (generation.current === version) setIds(all);
    }
    load().catch(() => {}).finally(() => { if (generation.current === version) setIsLoading(false); });
    return () => { ++generation.current; };
  }, [user?.id]);

  const isFavorite = useCallback((pid: number) => ids.has(pid), [ids]);

  const toggle = useCallback(
    async (productId: number) => {
      if (!user) {
        throw new Error("Favori eklemek için giriş yapmalısın");
      }
      if (isLoading) throw new Error("Favoriler yükleniyor, lütfen tekrar deneyin.");
      if (pending.current.has(productId)) return;
      pending.current.add(productId);
      const version = generation.current;
      const has = idsRef.current.has(productId);
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
        // Ignore responses belonging to a previous session.
        if (version !== generation.current) throw err;
        setIds((prev) => {
          const next = new Set(prev);
          if (has) next.add(productId);
          else next.delete(productId);
          return next;
        });
        throw err;
      } finally { if (version === generation.current) pending.current.delete(productId); }
    },
    [isLoading, user]
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
