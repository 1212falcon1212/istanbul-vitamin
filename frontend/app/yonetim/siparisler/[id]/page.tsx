"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import Spinner from "@/components/ui/Spinner";
import ArasShipmentPanel from "./ArasShipmentPanel";
import { api } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  formatDateShort,
  getOrderStatusLabel,
  getOrderStatusColor,
} from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

// Admin dropdown'da sadece mevcut durumdan geçerli hedeflere izin verilir.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["pending", "shipped", "cancelled"],
  shipped: ["shipped", "delivered", "refunded"],
  delivered: ["delivered", "refunded"],
  cancelled: ["cancelled"],
  refunded: ["refunded"],
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [regenerating, setRegenerating] = useState(false);
  const [invoiceMsg, setInvoiceMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get<Order | { order: Order }>(`/admin/orders/${orderId}`);
      const raw = res.data as Order | { order?: Order } | undefined;
      const o = raw && "order" in raw ? raw.order : (raw as Order | undefined);
      if (!o) throw new Error("Sipariş bulunamadı");
      setOrder(o);
      setNewStatus(o.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleRegenerateInvoice() {
    setRegenerating(true);
    setInvoiceMsg(null);
    try {
      await api.post(`/admin/orders/${orderId}/invoice/regenerate`, {});
      await fetchOrder();
      setInvoiceMsg({ kind: "success", text: "Fatura yeniden oluşturuldu." });
    } catch (err) {
      setInvoiceMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Fatura oluşturulamadı.",
      });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleStatusUpdate() {
    if (!newStatus || !order || newStatus === order.status) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      await api.put(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        note: statusNote || undefined,
      });
      await fetchOrder();
      setUpdateMsg({ kind: "success", text: "Durum güncellendi." });
      setStatusNote("");
    } catch (err) {
      setUpdateMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Güncelleme başarısız",
      });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Sipariş Detayı">
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </AdminShell>
    );
  }

  if (error || !order) {
    return (
      <AdminShell title="Sipariş Detayı">
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error || "Sipariş bulunamadı"}</div>
      </AdminShell>
    );
  }

  const allowedStatuses = ALLOWED_TRANSITIONS[order.status] ?? [order.status];
  const terminal = order.status === "cancelled" || order.status === "refunded";
  const showInvoiceCard = order.status !== "pending" && order.status !== "cancelled";

  return (
    <AdminShell title="Sipariş Detayı">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <Link
            href="/yonetim/siparisler"
            className="text-xs text-text-secondary hover:text-primary transition-colors mb-1 inline-block"
          >
            ← Siparişlere dön
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-2xl text-text-primary">#{order.order_number}</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getOrderStatusColor(order.status)}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {getOrderStatusLabel(order.status)}
            </span>
            <SourceBadge source={order.source} />
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 sm:text-right">
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary"
          >
            Sipariş Çıktısı
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-text-secondary">Toplam</p>
            <p className="font-display text-2xl text-primary price">{formatPrice(order.total)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol kolon */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <Section title="Sipariş Kalemleri" subtitle={`${order.items?.length ?? 0} ürün`}>
            <div className="overflow-x-auto -mx-5 lg:-mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-[11px] uppercase tracking-wider text-text-secondary">
                    <th className="px-5 lg:px-6 py-2.5 font-medium">Ürün</th>
                    <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Birim</th>
                    <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Adet</th>
                    <th className="px-5 lg:px-6 py-2.5 font-medium text-right whitespace-nowrap">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items?.length ? (
                    order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 lg:px-6 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-white border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-secondary">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary line-clamp-2">{item.product_name}</p>
                              {item.product_sku && (
                                <p className="text-[11px] text-text-secondary font-mono mt-0.5">{item.product_sku}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-text-secondary whitespace-nowrap price">
                          {formatPrice(item.unit_price)}
                        </td>
                        <td className="px-3 py-3 text-right text-text-secondary whitespace-nowrap">
                          × {item.quantity}
                        </td>
                        <td className="px-5 lg:px-6 py-3 text-right font-medium text-text-primary whitespace-nowrap price">
                          {formatPrice(item.total_price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-text-secondary">
                        Kalem bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Price breakdown */}
            <div className="pt-4 space-y-1.5 text-sm max-w-xs ml-auto">
              <SummaryRow label="Ara Toplam" value={formatPrice(order.subtotal)} />
              <SummaryRow label="Kargo" value={formatPrice(order.shipping_cost)} />
              {order.discount_amount > 0 && (
                <SummaryRow label="İndirim" value={`-${formatPrice(order.discount_amount)}`} positive />
              )}
              {order.coupon_discount > 0 && (
                <SummaryRow
                  label={`Kupon${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
                  value={`-${formatPrice(order.coupon_discount)}`}
                  positive
                />
              )}
              <SummaryRow label="KDV" value={formatPrice(order.tax_amount)} />
              <div className="flex items-center justify-between pt-2 border-t border-border font-display">
                <span className="text-text-primary">Toplam</span>
                <span className="text-primary price text-lg">{formatPrice(order.total)}</span>
              </div>
            </div>
          </Section>

          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Section title="Teslimat Adresi">
              <div className="text-sm text-text-secondary space-y-0.5">
                <p className="font-medium text-text-primary">
                  {order.shipping_first_name} {order.shipping_last_name}
                </p>
                <p>{order.shipping_phone}</p>
                <p>{order.shipping_address}</p>
                <p>
                  {order.shipping_district}, {order.shipping_city}
                </p>
              </div>
            </Section>

            <Section title="Fatura Bilgileri">
              <div className="text-sm text-text-secondary space-y-0.5">
                <p className="font-medium text-text-primary">
                  {order.billing_first_name} {order.billing_last_name}
                </p>
                <p>
                  Tipi:{" "}
                  <span className="text-text-primary">
                    {order.invoice_type === "corporate" ? "Kurumsal" : "Bireysel"}
                  </span>
                </p>
                <p>
                  Ödeme:{" "}
                  <span className="text-text-primary">
                    {order.payment_method === "credit_card" ? "Kredi Kartı" : "Havale/EFT"}
                  </span>
                </p>
              </div>
            </Section>
          </div>

          {/* Müşteri notu */}
          {order.customer_note && (
            <Section title="Müşteri Notu">
              <p className="text-sm text-text-secondary italic">&ldquo;{order.customer_note}&rdquo;</p>
            </Section>
          )}

          {/* Durum geçmişi */}
          {order.status_history && order.status_history.length > 0 && (
            <Section title="Durum Geçmişi" subtitle={`${order.status_history.length} kayıt`}>
              <div className="space-y-0">
                {order.status_history.map((entry, idx) => {
                  const last = idx === (order.status_history?.length ?? 0) - 1;
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        {!last && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className={`pb-${last ? "0" : "4"} min-w-0 flex-1`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.old_status && entry.old_status !== entry.new_status ? (
                            <>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getOrderStatusColor(entry.old_status)}`}
                              >
                                {getOrderStatusLabel(entry.old_status)}
                              </span>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-text-secondary">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getOrderStatusColor(entry.new_status)}`}
                              >
                                {getOrderStatusLabel(entry.new_status)}
                              </span>
                            </>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getOrderStatusColor(entry.new_status)}`}
                            >
                              {getOrderStatusLabel(entry.new_status)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1">
                          {formatDateShort(entry.created_at)} · {entry.changed_by}
                        </p>
                        {entry.note && (
                          <p className="text-sm text-text-secondary mt-1 italic">
                            &ldquo;{entry.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* Sağ kolon — sticky */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Status update */}
          <Section title="Durum Güncelle">
            {terminal ? (
              <div className="text-sm text-text-secondary">
                Bu sipariş {getOrderStatusLabel(order.status).toLowerCase()} durumunda — durum değiştirilemez.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Yeni durum</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className={inputClass}
                  >
                    {allowedStatuses.map((s) => (
                      <option key={s} value={s}>
                        {getOrderStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Not (opsiyonel)</label>
                  <textarea
                    placeholder="Örn. kargo firması bilgileri…"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={3}
                    className={textareaClass}
                  />
                </div>

                {updateMsg && (
                  <div
                    className={`rounded-lg p-2.5 text-xs ${
                      updateMsg.kind === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {updateMsg.text}
                  </div>
                )}

                <button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === order.status}
                  className="w-full h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {updating ? "Güncelleniyor..." : "Durumu Güncelle"}
                </button>
              </div>
            )}
          </Section>

          {/* Bizimhesap Fatura */}
          {showInvoiceCard && (
            <Section title="Fatura">
              {order.bizimhesap_invoice_id ? (
                <div className="space-y-2 text-sm">
                  <InfoRow
                    label="Fatura No"
                    value={order.invoice_number || order.order_number}
                  />
                  <InfoRow
                    label="GUID"
                    value={
                      <code className="text-[11px] break-all">{order.bizimhesap_invoice_id}</code>
                    }
                  />
                  {order.invoice_url && (
                    <a
                      href={order.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 h-10 text-center leading-10 text-sm text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      Faturayı Görüntüle →
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary">
                    Bu sipariş için henüz fatura oluşturulmadı.
                  </p>
                  {order.last_invoice_error && (
                    <p className="text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100">
                      Son hata: {order.last_invoice_error}
                    </p>
                  )}
                  {typeof order.invoice_retry_count === "number" && order.invoice_retry_count > 0 && (
                    <p className="text-[11px] text-text-secondary">
                      Deneme sayısı: {order.invoice_retry_count}
                    </p>
                  )}
                  <button
                    onClick={handleRegenerateInvoice}
                    disabled={regenerating}
                    className="w-full h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {regenerating ? "Oluşturuluyor..." : "Fatura Kes"}
                  </button>
                </div>
              )}

              {invoiceMsg && (
                <div
                  className={`mt-3 rounded-lg p-2.5 text-xs ${
                    invoiceMsg.kind === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {invoiceMsg.text}
                </div>
              )}
            </Section>
          )}

          {/* Kargo (Aras entegrasyonu) — sipariş cancelled/refunded değilse göster */}
          {order.status !== "cancelled" && order.status !== "refunded" && (
            <Section title="Kargo">
              <ArasShipmentPanel order={order} onChange={fetchOrder} />
            </Section>
          )}
        </aside>
      </div>
      {printOpen && <OrderPrintModal order={order} onClose={() => setPrintOpen(false)} />}
    </AdminShell>
  );
}

/* --- Helper Components --- */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card-bg rounded-2xl border border-border p-5 lg:p-6">
      <div className="mb-4">
        <h3 className="font-display text-base text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-text-secondary shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-text-primary text-right break-words min-w-0">{value}</span>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    web: "bg-blue-50 text-blue-700",
    trendyol: "bg-orange-50 text-orange-700",
    hepsiburada: "bg-red-50 text-red-700",
  };
  const labels: Record<string, string> = {
    web: "Web",
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles[source] ?? "bg-gray-50 text-gray-700"}`}>
      {labels[source] ?? source}
    </span>
  );
}

function OrderPrintModal({
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:block print:bg-white print:p-0"
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
          body * {
            visibility: hidden !important;
          }
          .order-print-content,
          .order-print-content * {
            visibility: visible !important;
          }
          .order-print-content {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .print-sheet {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
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

const baseFieldClass = "w-full rounded-lg border border-border bg-white text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";
const inputClass = `${baseFieldClass} h-10 px-3`;
const textareaClass = `${baseFieldClass} px-3 py-2.5 leading-relaxed resize-y`;
const labelClass = "block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide";
