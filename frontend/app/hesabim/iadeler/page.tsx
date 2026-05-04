"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import type { OrderCancellation } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  cancel: "İptal",
  return: "İade",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Bekleniyor",
  approved: "Onaylandı",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
};

const STATUS_CLASSES: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const REFUND_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  completed: "Yapıldı",
  failed: "Başarısız",
};

const REFUND_CLASSES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

export default function CustomerCancellationsPage() {
  const [rows, setRows] = useState<OrderCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get<OrderCancellation[]>("/me/cancellations")
      .then((res) => {
        if (!alive) return;
        setRows((res.data as OrderCancellation[] | undefined) ?? []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Talepler yüklenemedi");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-text-primary">İade & İptallerim</h1>
        <p className="text-sm text-text-secondary mt-1">
          Açtığınız iade/iptal taleplerinin durumunu buradan takip edebilirsiniz.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="bg-card-bg rounded-2xl border border-border p-10 text-center text-text-secondary">
          Henüz hiç iade/iptal talebiniz yok.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-card-bg rounded-2xl border border-border p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    row.type === "cancel" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"
                  )}>
                    {TYPE_LABELS[row.type]}
                  </span>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_CLASSES[row.status]
                  )}>
                    {STATUS_LABELS[row.status]}
                  </span>
                  {row.refund_status && (
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      REFUND_CLASSES[row.refund_status]
                    )}>
                      İade: {REFUND_LABELS[row.refund_status]}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-secondary">
                  {formatDateShort(row.created_at)}
                </span>
              </div>

              <div className="text-sm text-text-secondary space-y-0.5">
                {row.order && (
                  <p>
                    Sipariş:{" "}
                    <Link
                      href={`/hesabim/siparisler/${row.order.id}`}
                      className="text-primary hover:underline font-mono text-xs"
                    >
                      #{row.order.order_number}
                    </Link>
                  </p>
                )}
                {row.refund_amount != null && (
                  <p>İade tutarı: <span className="text-text-primary font-medium">{formatPrice(row.refund_amount)}</span></p>
                )}
                {row.note && (
                  <p className="italic">&ldquo;{row.note}&rdquo;</p>
                )}
                {row.aras_return_tracking && (
                  <p>
                    İade kargo no:{" "}
                    <span className="font-mono text-xs text-text-primary">
                      {row.aras_return_tracking}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
