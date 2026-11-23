"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Order } from "@/types";

export default function InvoiceAction({ order, onIssued, disabled, onBusy }: {
  order: Order;
  onIssued: () => void;
  disabled?: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(false);
  const invoiced = issued || !!order.bizimhesap_invoice_id;
  async function issue() {
    setBusy(true);
    onBusy(true);
    try {
      await api.post(`/admin/orders/${order.id}/invoice/regenerate`, {});
      setIssued(true);
      toast.success("Fatura kesildi");
      onIssued();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fatura kesilemedi");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <button type="button" disabled={disabled || busy || invoiced || order.status === "cancelled" || order.status === "refunded"}
      onClick={issue} className="h-9 whitespace-nowrap rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white hover:bg-violet-800 disabled:bg-violet-50 disabled:text-violet-800">
      {busy ? "Kesiliyor…" : invoiced ? "✓ Fatura kesildi" : "Fatura kes"}
    </button>
  );
}
