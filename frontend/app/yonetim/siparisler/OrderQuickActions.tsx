"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import LabelPrintModal from "./[id]/LabelPrintModal";
import InvoiceAction from "./InvoiceAction";

export default function OrderQuickActions({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [busy, setBusy] = useState<"approve" | "ship" | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [createdShipment, setCreatedShipment] = useState(false);
  const terminal = order.status === "cancelled" || order.status === "refunded";
  const pastApproval = !!order.approved_at || order.status === "shipped" || order.status === "delivered";
  const hasLabel = !!order.aras_integration_code || createdShipment;
  const canShip = order.status === "pending" && order.payment_status === "paid";

  async function run(action: "approve" | "ship") {
    if (busy) return;
    setBusy(action);
    try {
      const path = `/admin/orders/${order.id}`;
      if (action === "ship") {
        if (!window.confirm(`#${order.order_number} için Aras Kargo gönderisi oluşturulsun ve etiket açılsın mı?`)) return;
        await api.post(`${path}/aras/ship`, {});
        setCreatedShipment(true);
        setLabelOpen(true);
      } else {
        await api.post(`${path}/approve`, {});
        toast.success("Sipariş onaylandı");
        onChanged();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı");
    } finally {
      setBusy(null);
    }
  }

  const cargoReason = terminal || order.aras_cancel_succeeded ? "İptal veya iade edilmiş gönderi"
    : !hasLabel && !canShip ? "Etiket için geçerli bir Aras gönderisi veya ödemesi alınmış bekleyen sipariş gerekir" : "";

  return (
    <>
      <div role="group" aria-label="Sipariş işlemleri" className="inline-flex items-center gap-1.5">
        <button type="button" className="h-9 whitespace-nowrap rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-emerald-50 disabled:text-emerald-800" disabled={invoicing || !!busy || terminal || pastApproval} onClick={() => run("approve")}>
          {busy === "approve" ? "Onaylanıyor…" : order.approved_at ? "✓ Onaylandı" : pastApproval ? "✓ İşleme alındı" : "Onayla"}
        </button>
        <InvoiceAction order={order} onIssued={onChanged} onBusy={setInvoicing} disabled={!!busy} />
        <button type="button" className="h-9 whitespace-nowrap rounded-lg bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800 disabled:bg-slate-100 disabled:text-slate-500" disabled={invoicing || !!busy || !!cargoReason}
          title={cargoReason || (hasLabel ? "Aras etiketini aç" : "Aras gönderisi oluştur ve etiketi aç")}
          onClick={() => hasLabel ? setLabelOpen(true) : run("ship")}>
          {busy === "ship" ? "Gönderi oluşturuluyor…" : "Kargo çıktısı al"}
        </button>
      </div>
      {labelOpen && <LabelPrintModal order={order} onClose={(issued) => { setLabelOpen(false); if (createdShipment || issued) onChanged(); }} />}
    </>
  );
}
