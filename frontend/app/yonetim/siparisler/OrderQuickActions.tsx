"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import LabelPrintModal from "./[id]/LabelPrintModal";
import OrderPrintModal from "./OrderPrintModal";

export default function OrderQuickActions({ order, onInvoiced }: { order: Order; onInvoiced: () => void }) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const [busy, setBusy] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [labelOpen, setLabelOpen] = useState(false);
  const invoiceReason = order.bizimhesap_invoice_id ? "Fatura kesildi"
    : ["pending", "cancelled"].includes(order.status) ? "Bu sipariş durumunda fatura kesilemiyor" : "";
  const item = "block w-full px-3 py-2 text-left rounded-md hover:bg-primary-soft disabled:opacity-50";

  async function run(action: "print" | "invoice") {
    menu.current?.hidePopover();
    setBusy(true);
    try {
      if (action === "print") {
        const { data } = await api.get<Order | { order: Order }>(`/admin/orders/${order.id}`);
        if (!data) throw new Error("Sipariş yüklenemedi");
        setPrintOrder("order" in data ? data.order : data);
      } else {
        await api.post(`/admin/orders/${order.id}/invoice/regenerate`, {});
        toast.success("Fatura kesildi");
        onInvoiced();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" popoverTarget={id} title="Hızlı erişim" disabled={busy}
        aria-label={`${order.order_number} için hızlı erişim`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-primary-soft hover:text-primary disabled:opacity-50"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({
            right: Math.max(8, window.innerWidth - rect.right),
            ...(window.innerHeight - rect.bottom < 144 && rect.top > 144
              ? { bottom: window.innerHeight - rect.top + 4 }
              : { top: rect.bottom + 4 }),
          });
        }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      <div id={id} ref={menu} popover="auto" style={position}
        className="fixed inset-auto m-0 w-48 rounded-xl border border-border bg-white p-1.5 text-sm text-text-primary shadow-lg">
        <button type="button" className={item} onClick={() => run("print")}>Yazdır</button>
        <button type="button" className={item} disabled={!!invoiceReason} title={invoiceReason || undefined}
          onClick={() => run("invoice")}>{order.bizimhesap_invoice_id ? "Fatura kesildi" : "Fatura kes"}</button>
        <button type="button" className={item} disabled={!order.aras_integration_code}
          title={order.aras_integration_code ? undefined : "Önce Aras Kargo gönderisi oluşturulmalı"}
          onClick={() => { menu.current?.hidePopover(); setLabelOpen(true); }}>Kargo çıktısı al</button>
      </div>
      {printOrder && <OrderPrintModal order={printOrder} onClose={() => setPrintOrder(null)} />}
      {labelOpen && <LabelPrintModal orderId={order.id} onClose={() => setLabelOpen(false)} />}
    </>
  );
}
