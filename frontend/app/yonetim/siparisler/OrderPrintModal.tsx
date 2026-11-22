"use client";

import { createPortal } from "react-dom";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderPrintModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const customerName = `${order.shipping_first_name} ${order.shipping_last_name}`.trim();
  const cargoCompany = order.cargo_company || (order.aras_integration_code ? "Aras Kargo" : "Atanmadı");
  const cargoCode = order.tracking_number || order.aras_integration_code || "Henüz oluşmadı";
  const barcodeText = order.tracking_number || order.aras_integration_code;

  return createPortal(
    <div
      className="order-print-root fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:block print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
    >
      <div className="order-print-content max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-white p-4 print:hidden">
          <h3 className="font-display text-lg text-text-primary">Sipariş Çıktısı</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Yazdır
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
            >
              Kapat
            </button>
          </div>
        </div>

        <div className="p-6 print:p-0">
          <div className="print-sheet mx-auto max-w-3xl rounded-xl border border-border bg-white p-6 print:max-w-none print:rounded-none print:border-0">
            <div className="flex items-start justify-between gap-6 border-b border-gray-300 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">İstanbul Vitamin</p>
                <h2 className="mt-1 font-display text-2xl text-gray-950">Sipariş Çıktısı</h2>
                <p className="mt-1 text-sm text-gray-600">#{order.order_number}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>{formatDate(order.created_at)}</p>
                <p className="mt-1 font-semibold text-gray-950">{formatPrice(order.total)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <PrintBox title="Alıcı">
                <p className="font-semibold text-gray-950">{customerName}</p>
                <p>{order.shipping_phone}</p>
                <p>{order.shipping_address}</p>
                <p>
                  {order.shipping_district}, {order.shipping_city}
                </p>
              </PrintBox>
              <PrintBox title="Kargo Bilgileri">
                <PrintLine label="Firma" value={cargoCompany} />
                <PrintLine label="Şube" value="Aras Kargo canlı entegrasyonu sonrası eklenecek" />
                <PrintLine label="Kod" value={cargoCode} />
                <PrintLine label="Barkod" value={barcodeText || "Aras Kargo canlıya alınınca eklenecek"} />
              </PrintBox>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-gray-300">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ürün İsmi</th>
                    <th className="px-3 py-3 text-right font-medium">Birim</th>
                    <th className="px-3 py-3 text-right font-medium">Adet</th>
                    <th className="px-4 py-3 text-right font-medium">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items?.length ? (
                    order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-950">{item.product_name}</p>
                          {item.product_sku && (
                            <p className="mt-0.5 font-mono text-xs text-gray-500">{item.product_sku}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatPrice(item.unit_price)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-950">{formatPrice(item.total_price)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        Ürün kalemi bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 ml-auto max-w-xs space-y-1.5 text-sm">
              <SummaryRow label="Ara Toplam" value={formatPrice(order.subtotal)} />
              <SummaryRow label="Kargo" value={formatPrice(order.shipping_cost)} />
              {order.discount_amount > 0 && <SummaryRow label="İndirim" value={`-${formatPrice(order.discount_amount)}`} positive />}
              {order.coupon_discount > 0 && <SummaryRow label="Kupon" value={`-${formatPrice(order.coupon_discount)}`} positive />}
              <SummaryRow label="KDV" value={formatPrice(order.tax_amount)} />
              <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold text-gray-950">
                <span>Toplam</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500">
              Kargo barkodu alanı Aras Kargo canlı entegrasyonu tamamlandığında gerçek barkod ile doldurulacak.
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body > :not(.order-print-root) { display: none !important; }
          .order-print-root { position: static !important; display: block !important; }
          .print-sheet {
            width: 100% !important;
          }
        }
      `}</style>
    </div>, document.body
  );
}

function PrintBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-300 p-4 text-gray-700">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function PrintLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p className="flex items-start justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-950">{value}</span>
    </p>
  );
}

export function SummaryRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className={`price ${positive ? "text-green-600" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}
