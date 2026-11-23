"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import InvoiceAction from "../InvoiceAction";
import Image from "next/image";
import JsBarcode from "jsbarcode";
import { api } from "@/lib/api";
import type { ArasLabelData, Order } from "@/types";

/**
 * Aras Kargo etiket basım modal'ı.
 *
 * 100×150mm thermal etiket boyutu, parça sayısı kadar sayfa.
 * @media print kuralları sadece etiket alanını yazdırır; modal arka plan + butonlar yok olur.
 * jsbarcode ile Code128 üretiliyor (her parçanın `barcode_number`'ı).
 */
export default function LabelPrintModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: (issued: boolean) => void;
}) {
  const orderId = order.id;
  const [invoicing, setInvoicing] = useState(false);
  const [issued, setIssued] = useState(false);
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

  return createPortal(
    <div
      className="print-root fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal frame — print sırasında sadece içerik görünür */}
      <div className="aras-print-area relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none print:overflow-visible">
        {/* Header — print sırasında gizli */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white p-4 print:hidden">
          <h3 className="font-display text-lg text-text-primary">Aras Kargo Etiketi</h3>
          <div className="flex items-center gap-2">
            <InvoiceAction order={order} onIssued={() => setIssued(true)} onBusy={setInvoicing} />
            <button
              onClick={handlePrint}
              disabled={!data}
              className="h-9 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Yazdır
            </button>
            <button
              disabled={invoicing} onClick={() => onClose(issued)}
              className="h-9 px-4 border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>

        <div className="bg-slate-100 p-4 print:bg-white print:p-0">
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
          .print-root { position: static !important; display: block !important; }
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

    </div>, document.body
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
          marginLeft: 20,
          marginRight: 20,
        });
      } catch {
        // jsbarcode bazı karakter setlerinde hata atabilir; yutuyoruz, fallback için sayısal göster.
      }
    }
  }, [parcel]);

  if (!parcel) return null;
  return (
    <article className="print-page mx-auto max-w-[100mm] rounded-xl border border-slate-300 bg-white p-5 text-slate-950 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:text-black print:shadow-none">
      <header className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
        <Image src="/aras-kargo.svg" alt="Aras Kargo" width={148} height={40} unoptimized className="h-8 w-auto" />
        <span className="text-xs font-semibold">Parça {parcel.sequence} / {parcel.total}</span>
      </header>
      <section className="border-b border-slate-300 py-3 text-xs leading-snug">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider">Gönderen</h4>
        <p className="font-semibold">{data.ship_from_name}</p>
        <p>{data.ship_from_address}</p>
        <p>{data.ship_from_town}, {data.ship_from_city}</p>
        <p>{data.ship_from_phone}</p>
      </section>
      <section className="break-words py-4 text-sm leading-snug">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider">Alıcı</h4>
        <p className="text-lg font-bold">{data.ship_to_name}</p>
        <p>{data.ship_to_address}</p>
        <p className="font-semibold">{data.ship_to_town}, {data.ship_to_city}</p>
        <p>{data.ship_to_phone}</p>
      </section>
      <footer className="break-inside-avoid border-t-2 border-slate-900 pt-4 text-center">
        <svg ref={barcodeRef} aria-label={parcel.barcode_number} className="mx-auto block h-auto max-w-full" />
        <p className="mt-3 text-xs">Sipariş <strong>#{data.order_number}</strong></p>
        {data.integration_code !== data.order_number && <p className="text-xs">Entegrasyon {data.integration_code}</p>}
      </footer>
      {!!data.product_names?.length && (
        <section className="mt-3 border-t border-slate-300 pt-2">
          <h4 className="mb-1 break-after-avoid text-xs font-bold">Siparişteki ürünler</h4>
          <ul className="list-disc space-y-1 pl-4 text-sm font-medium leading-snug">
            {data.product_names.map((name, index) => (
              <li key={index} className="break-inside-avoid [overflow-wrap:anywhere]">{name}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
