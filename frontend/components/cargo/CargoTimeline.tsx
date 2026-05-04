"use client";

import { ARAS_STATUS_STEPS, cn, formatDate, getArasStatusLabel } from "@/lib/utils";

type CargoTimelineProps = {
  statusCode?: number | null;
  statusText?: string;
  trackingNumber?: string;
  cargoCompany?: string;
  lastChecked?: string;
  /** "shipped" / "delivered" / "cancelled" — sipariş ana statüsü.
   *  Henüz kargoya verilmemişse timeline pasif renderlanır. */
  orderStatus?: string;
};

/**
 * 7 adımlı Aras Kargo timeline'ı. statusCode null/0 ise tüm adımlar bekleme rengi alır.
 * Mobile'da yatay scroll edebilir; bağımsız renderlanır, kart sarmalı parent component'in işidir.
 */
export default function CargoTimeline({
  statusCode,
  statusText,
  trackingNumber,
  cargoCompany,
  lastChecked,
  orderStatus,
}: CargoTimelineProps) {
  const current = typeof statusCode === "number" ? statusCode : 0;
  const inactive = !current && orderStatus !== "shipped" && orderStatus !== "delivered";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-text-secondary">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-text-primary">
            {cargoCompany || "Kargo"}
          </span>
          {trackingNumber ? (
            <span className="font-mono text-xs text-primary">
              {trackingNumber}
            </span>
          ) : (
            <span className="italic">Takip numarası bekleniyor…</span>
          )}
        </div>
        {lastChecked && (
          <span className="text-[11px] text-text-secondary">
            Güncelleme: {formatDate(lastChecked)}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <ol className="flex min-w-[640px] items-start gap-1">
          {ARAS_STATUS_STEPS.map((step, idx) => {
            const reached = !inactive && current >= step.code;
            const isCurrent = !inactive && current === step.code;
            const isLast = idx === ARAS_STATUS_STEPS.length - 1;
            const isYonlendirildi = step.code === 7;
            // 7 (Yönlendirildi) yan-rota; sadece o kod gerçekten geldiyse gösterilir.
            const dim = isYonlendirildi && current !== 7;
            return (
              <li
                key={step.code}
                className={cn(
                  "flex flex-1 flex-col items-center text-center",
                  dim && "opacity-40"
                )}
              >
                <div className="flex w-full items-center">
                  <div className={cn("h-1 flex-1", reached ? "bg-primary" : "bg-gray-200", idx === 0 && "opacity-0")} />
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-medium",
                      reached
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300 bg-white text-text-secondary",
                      isCurrent && "ring-2 ring-primary/30"
                    )}
                    aria-current={isCurrent}
                  >
                    {step.code}
                  </div>
                  <div className={cn("h-1 flex-1", reached && current > step.code ? "bg-primary" : "bg-gray-200", isLast && "opacity-0")} />
                </div>
                <span
                  className={cn(
                    "mt-1.5 px-1 text-[10px] leading-tight",
                    reached ? "font-medium text-text-primary" : "text-text-secondary"
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {statusText && current > 0 && (
        <p className="text-xs text-text-secondary">
          Aras: <span className="font-medium text-text-primary">{statusText || getArasStatusLabel(current)}</span>
        </p>
      )}
    </div>
  );
}
