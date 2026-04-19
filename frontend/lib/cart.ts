"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import React from "react";
import type { Cart, CartItem } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("cart_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("cart_session_id", sessionId);
  }
  return sessionId;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function cartRequest<T>(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Session-ID": getSessionId(),
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Bir hata oluştu");
  }
  return data as T;
}

interface CartContextType {
  cartId: number | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  addItem: (productId: number, quantity: number, variantId?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      // Backend cevabı: {success, data: {cart: {items: [...]}}} şeklinde sarmalı.
      const res = await cartRequest<{
        success: boolean;
        data?: Cart | { cart?: Cart };
      }>("/cart");
      const payload = res.data as Cart | { cart?: Cart } | undefined;
      const cart =
        payload && "cart" in (payload as { cart?: Cart })
          ? (payload as { cart?: Cart }).cart
          : (payload as Cart | undefined);
      setItems(cart?.items ?? []);
      setCartId(cart?.id ?? null);
    } catch {
      setItems([]);
      setCartId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Login/logout sonrası sepeti yeniden yükle — aksi halde guest cart item ID'leri stale kalır.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onAuthChange() {
      fetchCart();
    }
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, [fetchCart]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const price = item.variant?.price ?? item.product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const addItem = useCallback(
    async (productId: number, quantity: number, variantId?: number) => {
      setIsLoading(true);
      try {
        await cartRequest("/cart/items", "POST", {
          product_id: productId,
          quantity,
          variant_id: variantId,
        });
        await fetchCart();
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCart]
  );

  const updateItem = useCallback(
    async (itemId: number, quantity: number) => {
      setIsLoading(true);
      try {
        await cartRequest(`/cart/items/${itemId}`, "PUT", { quantity });
        await fetchCart();
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCart]
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      setIsLoading(true);
      try {
        await cartRequest(`/cart/items/${itemId}`, "DELETE");
      } catch (err) {
        // Item zaten yoksa (stale ID — ör. login sonrası merge) hatayı yutup senkronla.
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("bulunamadı")) {
          await fetchCart();
          throw err;
        }
      }
      await fetchCart();
      setIsLoading(false);
    },
    [fetchCart]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setCartId(null);
  }, []);

  return React.createElement(
    CartContext.Provider,
    {
      value: {
        cartId,
        items,
        itemCount,
        subtotal,
        isLoading,
        addItem,
        updateItem,
        removeItem,
        clearCart,
      },
    },
    children
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
