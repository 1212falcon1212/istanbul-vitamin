"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  getOrderStatusLabel,
  getOrderStatusColor,
  cn,
} from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import type { Order, OrderStatus } from "@/types";

const STATUS_STEPS: OrderStatus[] = ["pending", "shipped", "delivered"];

function getStepIndex(status: OrderStatus): number {
  if (status === "cancelled" || status === "refunded") return -1;
  return STATUS_STEPS.indexOf(status);
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<Order | { order: Order }>(`/orders/${id}`);
        const raw = res.data as Order | { order?: Order } | undefined;
        const o = raw && "order" in raw ? raw.order : (raw as Order | undefined);
        if (o) {
          setOrder(o);
        }
      } catch {
        setError("Siparis detaylari yuklenirken bir hata olustu.");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center">
        <p>{error || "Siparis bulunamadi."}</p>
        <Link
          href="/hesabim/siparisler"
          className="mt-3 inline-block text-sm font-medium underline hover:no-underline"
        >
          Siparislere Don
        </Link>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelledOrRefunded =
    order.status === "cancelled" || order.status === "refunded";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/hesabim/siparisler"
            className="text-sm text-primary hover:underline mb-2 inline-flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Siparislere Don
          </Link>
          <h1 className="font-display text-3xl text-text-primary">
            Siparis #{order.order_number}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {formatDate(order.created_at)}
          </p>
        </div>
        <span
          className={cn(
            "text-sm font-medium px-4 py-2 rounded-full self-start",
            getOrderStatusColor(order.status)
          )}
        >
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      {/* Status timeline */}
      {!isCancelledOrRefunded && (
        <div className="bg-card-bg rounded-2xl border border-border p-6">
          <h2 className="font-display text-lg text-text-primary mb-6">
            Siparis Durumu
          </h2>
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width:
                    currentStep >= 0
                      ? `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`
                      : "0%",
                }}
              />
            </div>

            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;
              return (
                <div
                  key={step}
                  className="relative flex flex-col items-center z-10"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                      isCompleted
                        ? "bg-primary border-primary text-white"
                        : "bg-card-bg border-border text-text-secondary"
                    )}
                  >
                    {isCompleted ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-[10px] sm:text-xs font-medium text-center whitespace-nowrap",
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                          ? "text-text-primary"
                          : "text-text-secondary"
                    )}
                  >
                    {getOrderStatusLabel(step)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled/refunded notice */}
      {isCancelledOrRefunded && (
        <div
          className={cn(
            "rounded-2xl border p-6",
            order.status === "cancelled"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-gray-50 border-gray-200 text-gray-700"
          )}
        >
          <p className="font-medium">
            {order.status === "cancelled"
              ? "Bu siparis iptal edilmistir."
              : "Bu siparis iade edilmistir."}
          </p>
        </div>
      )}

      {/* Cargo tracking */}
      {order.tracking_number && (
        <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5">
          <h3 className="text-sm font-medium text-purple-800 mb-2">
            Kargo Takip Bilgisi
          </h3>
          <p className="text-sm text-purple-700">
            {order.cargo_company && (
              <span className="font-medium">{order.cargo_company}: </span>
            )}
            {order.tracking_number}
          </p>
          {order.shipped_at && (
            <p className="text-xs text-purple-600 mt-1">
              Kargoya verilme tarihi: {formatDate(order.shipped_at)}
            </p>
          )}
        </div>
      )}

      {/* Order items */}
      <div className="bg-card-bg rounded-2xl border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-lg text-text-primary">Siparis Urunleri</h2>
        </div>
        <div className="divide-y divide-border">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-5">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-bg-primary shrink-0">
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-border">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.product_name}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {item.quantity} adet x {formatPrice(item.unit_price)}
                </p>
              </div>
              <span className="text-sm font-bold text-text-primary price shrink-0">
                {formatPrice(item.total_price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Addresses & Price breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipping address */}
        <div className="bg-card-bg rounded-2xl border border-border p-5">
          <h3 className="font-display text-lg text-text-primary mb-3">
            Teslimat Adresi
          </h3>
          <div className="text-sm text-text-secondary space-y-1">
            <p className="font-medium text-text-primary">
              {order.shipping_first_name} {order.shipping_last_name}
            </p>
            <p>{order.shipping_address}</p>
            <p>
              {order.shipping_district}, {order.shipping_city}
            </p>
            <p>{order.shipping_phone}</p>
          </div>
        </div>

        {/* Billing address */}
        <div className="bg-card-bg rounded-2xl border border-border p-5">
          <h3 className="font-display text-lg text-text-primary mb-3">
            Fatura Bilgileri
          </h3>
          <div className="text-sm text-text-secondary space-y-1">
            <p className="font-medium text-text-primary">
              {order.billing_first_name} {order.billing_last_name}
            </p>
            <p className="capitalize">
              Fatura Tipi:{" "}
              {order.invoice_type === "corporate" ? "Kurumsal" : "Bireysel"}
            </p>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-card-bg rounded-2xl border border-border p-5">
        <h3 className="font-display text-lg text-text-primary mb-4">
          Fiyat Detayi
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Ara Toplam</span>
            <span className="price">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Kargo</span>
            <span className="price">
              {order.shipping_cost > 0
                ? formatPrice(order.shipping_cost)
                : "Ucretsiz"}
            </span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Indirim</span>
              <span className="price">
                -{formatPrice(order.discount_amount)}
              </span>
            </div>
          )}
          {order.coupon_discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>
                Kupon Indirimi
                {order.coupon_code && (
                  <span className="ml-1 text-xs text-text-secondary">
                    ({order.coupon_code})
                  </span>
                )}
              </span>
              <span className="price">
                -{formatPrice(order.coupon_discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-text-secondary">
            <span>KDV</span>
            <span className="price">{formatPrice(order.tax_amount)}</span>
          </div>
          <div className="pt-3 border-t border-border flex justify-between font-bold text-text-primary text-base">
            <span>Toplam</span>
            <span className="price">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Customer note */}
      {order.customer_note && (
        <div className="bg-card-bg rounded-2xl border border-border p-5">
          <h3 className="font-display text-lg text-text-primary mb-2">
            Siparis Notu
          </h3>
          <p className="text-sm text-text-secondary">{order.customer_note}</p>
        </div>
      )}
    </div>
  );
}
