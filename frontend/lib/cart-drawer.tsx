"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface CartDrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const Ctx = createContext<CartDrawerContextType | undefined>(undefined);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((p) => !p), []);
  return (
    <Ctx.Provider value={{ isOpen, open, close, toggle }}>{children}</Ctx.Provider>
  );
}

export function useCartDrawer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCartDrawer must be used within CartDrawerProvider");
  return c;
}
