"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { api } from "@/lib/api";
import type { ArasLabelData } from "@/types";

/**
 * Aras Kargo etiket basım modal'ı.
 *
 * 100×150mm thermal etiket boyutu, parça sayısı kadar sayfa.
 * @media print kuralları sadece etiket alanını yazdırır; modal arka plan + butonlar yok olur.
 * jsbarcode ile Code128 üretiliyor (her parçanın `barcode_number`'ı).
 */
export default function LabelPrintModal({
  orderId,
  onClose,
}: {
  orderId: number;
  onClose: () => void;
}) {
  const [data, setData] = useState<ArasLabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get<{ label: ArasLabelData } | ArasLabelData>(`/admin/orders/${orderId}/aras/labels`)
      .then((res) => {
        if (!alive) return;
        const raw = res.data as { label?: ArasLabelData } | ArasLabelData | undefined;
        const label = raw && "label" in raw ? (raw as { label?: ArasLabelData }).label : (raw as ArasLabelData | undefined);
        if (!label) throw new Error("Etiket verisi alınamadı");
        setData(label);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Etiket yüklenemedi");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal frame — print sırasında sadece içerik görünür */}
      <div className="aras-print-area relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none print:overflow-visible">
        {/* Header — print sırasında gizli */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-white p-4 print:hidden">
          <h3 className="font-display text-lg text-text-primary">Aras Kargo Etiketi</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!data}
              className="h-9 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Yazdır
            </button>
            <button
              onClick={onClose}
              className="h-9 px-4 border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>

        <div className="p-4 print:p-0">
          {loading && <p className="text-sm text-text-secondary">Yükleniyor…</p>}
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>
          )}
          {data && (
            <div className="space-y-4 print:space-y-0">
              {data.parcels.map((p, idx) => (
                <LabelSheet
                  key={p.barcode_number + idx}
                  data={data}
                  parcelIndex={idx}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: 100mm 150mm;
            margin: 4mm;
          }
          body {
            background: #fff !important;
          }
          body > *:not(.print-root) {
            display: none !important;
          }
          .aras-print-area .print-page {
            page-break-after: always;
          }
          .aras-print-area .print-page:last-child {
            page-break-after: auto;
          }
          .aras-print-area {
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Print kapsamı için root marker — body > .print-root sayesinde fixed dışındakiler gizlenir */}
      <div className="print-root" style={{ display: "none" }} />
    </div>
  );
}

function LabelSheet({
  data,
  parcelIndex,
}: {
  data: ArasLabelData;
  parcelIndex: number;
}) {
  const parcel = data.parcels[parcelIndex];
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && parcel?.barcode_number) {
      try {
        JsBarcode(barcodeRef.current, parcel.barcode_number, {
          format: "CODE128",
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 14,
          margin: 0,
        });
      } catch {
        // jsbarcode bazı karakter setlerinde hata atabilir; yutuyoruz, fallback için sayısal göster.
      }
    }
  }, [parcel]);

  if (!parcel) return null;
  return (
    <div className="print-page rounded-xl border border-border p-4 print:rounded-none print:border-0">
      <div className="flex items-baseline justify-between border-b border-gray-300 pb-2">
        <span className="font-display text-base font-semibold">Aras Kargo</span>
        <span className="text-xs text-gray-600">
          {parcel.sequence} / {parcel.total} parça
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] leading-snug">
        <div>
          <p className="font-semibold uppercase text-gray-500">Gönderen</p>
          <p className="font-medium">{data.ship_from_name}</p>
          <p>{data.ship_from_phone}</p>
          <p>{data.ship_from_address}</p>
          <p>
            {data.ship_from_town}, {data.ship_from_city}
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase text-gray-500">Alıcı</p>
          <p className="font-medium">{data.ship_to_name}</p>
          <p>{data.ship_to_phone}</p>
          <p>{data.ship_to_address}</p>
          <p>
            {data.ship_to_town}, {data.ship_to_city}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center justify-center border-t border-gray-300 pt-3">
        <svg ref={barcodeRef} />
        <p className="mt-1 text-[10px] text-gray-600">
          Sipariş #{data.order_number} · Entegrasyon: {data.integration_code}
        </p>
      </div>
    </div>
  );
}
