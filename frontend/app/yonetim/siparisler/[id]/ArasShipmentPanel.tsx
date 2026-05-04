"use client";

import { useState } from "react";
import CargoTimeline from "@/components/cargo/CargoTimeline";
import LabelPrintModal from "./LabelPrintModal";
import { api } from "@/lib/api";
import { formatDateShort } from "@/lib/utils";
import type { Order } from "@/types";

type Props = {
  order: Order;
  onChange: () => Promise<void> | void;
};

/**
 * Sticky kargo panel — admin sipariş detayında sağ kolonda yer alır.
 *
 * Aksiyonlar:
 *  - Kargoya Ver  : pending && !aras_integration_code
 *  - Yenile       : tracking_number var (Aras durumu çek)
 *  - Kargoyu İptal: aras_status_code < 3 (irsaliye kesilmemiş olası)
 *  - Etiket Bas   : aras_integration_code var
 */
export default function ArasShipmentPanel({ order, onChange }: Props) {
  const [busy, setBusy] = useState<"" | "ship" | "refresh" | "cancel">("");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [labelOpen, setLabelOpen] = useState(false);

  const hasShipment = !!order.aras_integration_code;
  const hasTracking = !!order.tracking_number;
  const canShip = order.status === "pending" && !hasShipment;
  const canCancel =
    hasShipment &&
    order.status !== "cancelled" &&
    order.status !== "refunded" &&
    (order.aras_status_code == null || order.aras_status_code < 3);

  async function action(kind: "ship" | "refresh" | "cancel") {
    if (busy) return;
    setBusy(kind);
    setMsg(null);
    const endpoints: Record<typeof kind, string> = {
      ship: `/admin/orders/${order.id}/aras/ship`,
      refresh: `/admin/orders/${order.id}/aras/refresh`,
      cancel: `/admin/orders/${order.id}/aras/cancel`,
    };
    try {
      await api.post(endpoints[kind], {});
      await onChange();
      const successText: Record<typeof kind, string> = {
        ship: "Sipariş Aras Kargo'ya verildi.",
        refresh: "Kargo durumu güncellendi.",
        cancel: "Aras gönderisi iptal edildi.",
      };
      setMsg({ kind: "success", text: successText[kind] });
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "İşlem başarısız",
      });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <CargoTimeline
        statusCode={order.aras_status_code ?? null}
        statusText={order.aras_status_text}
        trackingNumber={order.tracking_number}
        cargoCompany={order.cargo_company || (hasShipment ? "Aras Kargo" : undefined)}
        lastChecked={order.aras_status_checked_at}
        orderStatus={order.status}
      />

      <div className="space-y-1.5 text-sm">
        {order.aras_integration_code && (
          <Row label="Entegrasyon Kodu" value={<code className="text-xs">{order.aras_integration_code}</code>} />
        )}
        {typeof order.aras_parcel_count === "number" && order.aras_parcel_count > 0 && (
          <Row label="Parça" value={`${order.aras_parcel_count}`} />
        )}
        {order.shipped_at && (
          <Row label="Kargoya Verildi" value={formatDateShort(order.shipped_at)} />
        )}
        {order.delivered_at && (
          <Row label="Teslim Edildi" value={formatDateShort(order.delivered_at)} />
        )}
        {order.aras_cancel_attempted_at && (
          <Row
            label="İptal Denemesi"
            value={
              <span className={order.aras_cancel_succeeded ? "text-green-700" : "text-amber-700"}>
                {formatDateShort(order.aras_cancel_attempted_at)} —{" "}
                {order.aras_cancel_succeeded ? "Başarılı" : "İrsaliye kesildi"}
              </span>
            }
          />
        )}
      </div>

      {msg && (
        <div
          className={`rounded-lg p-2.5 text-xs ${
            msg.kind === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {canShip && (
          <button
            onClick={() => action("ship")}
            disabled={!!busy}
            className="col-span-2 h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {busy === "ship" ? "Gönderiliyor…" : "Aras Kargo'ya Ver"}
          </button>
        )}
        {hasTracking && (
          <button
            onClick={() => action("refresh")}
            disabled={!!busy}
            className="h-9 border border-border bg-white text-text-primary rounded-lg text-xs font-medium hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {busy === "refresh" ? "…" : "Yenile"}
          </button>
        )}
        {hasShipment && (
          <button
            onClick={() => setLabelOpen(true)}
            disabled={!!busy}
            className="h-9 border border-border bg-white text-text-primary rounded-lg text-xs font-medium hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            Etiket Bas
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => {
              if (!window.confirm("Aras gönderisini iptal etmek istediğinize emin misiniz?")) return;
              action("cancel");
            }}
            disabled={!!busy}
            className="col-span-2 h-9 border border-red-200 bg-white text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {busy === "cancel" ? "…" : "Aras Gönderisini İptal Et"}
          </button>
        )}
      </div>

      {labelOpen && (
        <LabelPrintModal orderId={order.id} onClose={() => setLabelOpen(false)} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-text-secondary shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-text-primary text-right break-words min-w-0">{value}</span>
    </div>
  );
}
