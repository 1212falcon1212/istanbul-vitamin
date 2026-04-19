"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartDrawer } from "@/lib/cart-drawer";
import Spinner from "@/components/ui/Spinner";

/**
 * Eski /sepet rotası — artık sepet drawer ile yönetiliyor.
 * Bu sayfa ana sayfaya yönlendirir ve drawer'ı açar.
 */
export default function SepetRedirect() {
  const router = useRouter();
  const { open } = useCartDrawer();

  useEffect(() => {
    open();
    router.replace("/");
  }, [open, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
