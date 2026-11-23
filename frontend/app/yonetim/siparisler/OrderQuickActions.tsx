"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import LabelPrintModal from "./[id]/LabelPrintModal";
import OrderPrintModal from "./OrderPrintModal";

type Action = "approve" | "invoice" | "ship" | "print";
const stepClass = "h-8 rounded-lg border border-border px-2.5 text-xs font-medium text-primary hover:bg-primary-soft disabled:cursor-default disabled:bg-gray-50 disabled:text-text-secondary";

export default function OrderQuickActions({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [labelOpen, setLabelOpen] = useState(false);
  const [createdShipment, setCreatedShipment] = useState(false);
  const terminal = order.status === "cancelled" || order.status === "refunded";
  const invoiced = !!order.bizimhesap_invoice_id;
  const pastApproval = !!order.approved_at || invoiced || order.status === "shipped" || order.status === "delivered";
  const hasLabel = !!order.aras_integration_code || createdShipment;
  const canShip = order.status === "pending" && order.payment_status === "paid";

  async function run(action: Action) {
    if (busy) return;
    setBusy(action);
    try {
      const path = `/admin/orders/${order.id}`;
      if (action === "print") {
        const { data } = await api.get<Order | { order: Order }>(path);
        if (!data) throw new Error("Sipariş yüklenemedi");
        setPrintOrder("order" in data ? data.order : data);
      } else if (action === "ship") {
        if (!window.confirm(`#${order.order_number} için Aras Kargo gönderisi oluşturulsun ve etiket açılsın mı?`)) return;
        await api.post(`${path}/aras/ship`, {});
        setCreatedShipment(true);
        setLabelOpen(true);
      } else {
        await api.post(`${path}/${action === "approve" ? "approve" : "invoice/regenerate"}`, {});
        toast.success(action === "approve" ? "Sipariş onaylandı" : "Fatura kesildi");
        onChanged();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı");
    } finally {
      setBusy(null);
    }
  }

  const cargoReason = terminal || order.aras_cancel_succeeded ? "İptal veya iade edilmiş gönderi"
    : !invoiced ? "Önce fatura kesin"
    : !hasLabel && !canShip ? "Etiket için geçerli bir Aras gönderisi veya ödemesi alınmış bekleyen sipariş gerekir" : "";

  return (
    <>
      <button type="button" title="Siparişi yazdır" aria-label="Siparişi yazdır" disabled={!!busy} onClick={() => run("print")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-primary-soft">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/><path d="M16 11h2"/>
        </svg>
      </button>
      <div role="group" aria-label="Sipariş işlem adımları" className="inline-flex items-center gap-1.5">
        <button type="button" className={stepClass} disabled={!!busy || terminal || pastApproval} onClick={() => run("approve")}>
          {busy === "approve" ? "Onaylanıyor…" : order.approved_at ? "✓ Onaylandı" : pastApproval ? "✓ İşleme alındı" : "1. Onayla"}
        </button>
        <button type="button" className={stepClass} disabled={!!busy || terminal || !pastApproval || invoiced}
          title={!pastApproval ? "Önce siparişi onaylayın" : undefined} onClick={() => run("invoice")}>
          {busy === "invoice" ? "Kesiliyor…" : invoiced ? "✓ Fatura kesildi" : "2. Fatura kes"}
        </button>
        <button type="button" className={stepClass} disabled={!!busy || !!cargoReason}
          title={cargoReason || (hasLabel ? "Aras etiketini aç" : "Aras gönderisi oluştur ve etiketi aç")}
          onClick={() => hasLabel ? setLabelOpen(true) : run("ship")}>
          {busy === "ship" ? "Gönderi oluşturuluyor…" : "3. Kargo çıktısı al"}
        </button>
      </div>
      {printOrder && <OrderPrintModal order={printOrder} onClose={() => setPrintOrder(null)} />}
      {labelOpen && <LabelPrintModal orderId={order.id} onClose={() => { setLabelOpen(false); if (createdShipment) onChanged(); }} />}
    </>
  );
}
