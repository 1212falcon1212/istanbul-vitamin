"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/api";
import type { Address, SavedCard } from "@/types";
import AddressForm from "@/components/checkout/AddressForm";
import PaymentForm from "@/components/checkout/PaymentForm";
import Spinner from "@/components/ui/Spinner";
import { cn, formatPrice, resolveImageUrl } from "@/lib/utils";
import { useSettings } from "@/lib/settings";

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 39.9;

type Step = "address" | "shipping" | "payment";

interface ShippingData {
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  address_line: string;
  postal_code: string;
}

interface ShippingMethod {
  id: string;
  label: string;
  desc: string;
  duration: string;
  price: number;
}

export default function OdemePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { cartId, items, subtotal, updateItem, removeItem } = useCart();
  const { settings } = useSettings();
  const logoUrl = settings.site_logo_url
    ? resolveImageUrl(settings.site_logo_url)
    : "";
  const siteName = settings.site_name || "İstanbul Vitamin";

  const [step, setStep] = useState<Step>("address");
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [shippingData, setShippingData] = useState<ShippingData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fatura adresi — varsayılan "kargo ile aynı"
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<number | null>(null);
  const [billingData, setBillingData] = useState<ShippingData | null>(null);
  const [showNewBillingAddress, setShowNewBillingAddress] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const shippingMethods: ShippingMethod[] = useMemo(
    () => [
      {
        id: "standard",
        label: "Standart Kargo",
        desc: "Yurtiçi Kargo ile teslimat",
        duration: "2-3 iş günü",
        price: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST,
      },
      {
        id: "express",
        label: "Hızlı Kargo",
        desc: "Aynı gün kargoya verilir",
        duration: "1 iş günü",
        price: 59.9,
      },
    ],
    [subtotal]
  );
  const [selectedShipping, setSelectedShipping] = useState<string>("standard");
  const shippingCost = useMemo(
    () => shippingMethods.find((s) => s.id === selectedShipping)?.price ?? 0,
    [selectedShipping, shippingMethods]
  );

  const total = Math.max(0, subtotal - couponDiscount) + shippingCost;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/giris-yap?redirect=/odeme");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoadingData(true);
      try {
        const [addrRes, cardRes] = await Promise.all([
          api.get<Address[]>("/addresses").catch(() => ({ data: [] })),
          api.get<SavedCard[]>("/cards").catch(() => ({ data: [] })),
        ]);
        const addrs = Array.isArray(addrRes.data) ? addrRes.data : [];
        const cards = Array.isArray(cardRes.data) ? cardRes.data : [];
        setSavedAddresses(addrs);
        setSavedCards(cards);
        const def = addrs.find((a) => a.is_default);
        if (def) {
          setSelectedAddressId(def.id);
          setShippingData({
            title: def.title,
            first_name: def.first_name,
            last_name: def.last_name,
            phone: def.phone,
            city: def.city,
            district: def.district,
            neighborhood: def.neighborhood || "",
            address_line: def.address_line,
            postal_code: def.postal_code || "",
          });
        }
      } finally {
        setLoadingData(false);
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !loadingData && items.length === 0) {
      router.replace("/magaza");
    }
  }, [authLoading, isAuthenticated, loadingData, items.length, router]);

  function addrToShippingData(addr: Address): ShippingData {
    return {
      title: addr.title,
      first_name: addr.first_name,
      last_name: addr.last_name,
      phone: addr.phone,
      city: addr.city,
      district: addr.district,
      neighborhood: addr.neighborhood || "",
      address_line: addr.address_line,
      postal_code: addr.postal_code || "",
    };
  }

  function handleAddressSelect(addr: Address) {
    setSelectedAddressId(addr.id);
    setShippingData(addrToShippingData(addr));
    setShowNewAddress(false);
  }

  function handleBillingAddressSelect(addr: Address) {
    setSelectedBillingAddressId(addr.id);
    setBillingData(addrToShippingData(addr));
    setShowNewBillingAddress(false);
  }

  async function handleApplyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await api.post<{ discount_amount: number }>("/cart/coupon", {
        code,
      });
      if (res.data) {
        setCouponDiscount(res.data.discount_amount);
        setCouponApplied(code);
      }
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : "Kupon uygulanamadı"
      );
    } finally {
      setCouponLoading(false);
    }
  }

  async function handlePaymentSubmit(paymentData: {
    card_number: string;
    expiry: string;
    cvv: string;
    holder_name: string;
    save_card: boolean;
    saved_card_id?: number;
  }) {
    if (!shippingData) return;
    setIsSubmitting(true);

    try {
      if (!cartId) {
        throw new Error("Sepet henüz yüklenmedi, lütfen sayfayı yenileyin");
      }

      type OrderPayload = { id: number; order_number: string };
      // Fatura adresi "kargo ile aynı" ise shipping'i kullan.
      const billing = billingSameAsShipping
        ? shippingData
        : billingData ?? shippingData;
      const billingAddressLine = `${billing.neighborhood} ${billing.address_line}`.trim();
      const shippingAddressLine = `${shippingData.neighborhood} ${shippingData.address_line}`.trim();

      const orderRes = await api.post<OrderPayload | { order: OrderPayload }>(
        "/orders",
        {
          cart_id: cartId,
          shipping_first_name: shippingData.first_name,
          shipping_last_name: shippingData.last_name,
          shipping_phone: shippingData.phone,
          shipping_city: shippingData.city,
          shipping_district: shippingData.district,
          shipping_address: shippingAddressLine,
          shipping_postal_code: shippingData.postal_code,
          billing_first_name: billing.first_name,
          billing_last_name: billing.last_name,
          billing_phone: billing.phone,
          billing_city: billing.city,
          billing_district: billing.district,
          billing_address: billingAddressLine,
          invoice_type: "individual",
          payment_method: "credit_card",
          customer_note: "",
          installment_count: 1,
          shipping_method: selectedShipping,
        }
      );

      const rawOrder = orderRes.data as OrderPayload | { order?: OrderPayload } | undefined;
      const order =
        rawOrder && "order" in rawOrder ? rawOrder.order : (rawOrder as OrderPayload | undefined);

      if (order?.id) {
        await api.post("/payments/start", {
          order_id: order.id,
          ...paymentData,
          installment_count: 1,
        });
        router.push(`/odeme/basarili?order=${order.order_number}`);
      } else {
        throw new Error("Sipariş oluşturulamadı");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      console.error("[checkout] sipariş/ödeme hatası:", err);
      router.push(`/odeme/basarisiz?reason=${encodeURIComponent(msg)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <main className="flex-1">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] min-h-screen">
          {/* Left — scrollable flow */}
          <div className="px-6 md:px-12 xl:px-20 py-10 bg-white border-r border-border">
            {/* Brand */}
            <Link
              href="/"
              aria-label={siteName}
              className="inline-block mb-10 hover:opacity-80 transition"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="h-10 md:h-12 w-auto object-contain"
                />
              ) : (
                <span className="font-display text-2xl md:text-3xl text-text-primary">
                  {siteName}
                </span>
              )}
            </Link>

            {/* Breadcrumb steps */}
            <nav className="flex items-center gap-2 text-sm mb-8">
              <button
                onClick={() => router.back()}
                className="text-text-secondary hover:text-primary transition"
              >
                Sepet
              </button>
              <Chevron />
              {[
                { key: "address", label: "Adres" },
                { key: "shipping", label: "Kargo" },
                { key: "payment", label: "Ödeme" },
              ].map((s, i, arr) => {
                const active = step === (s.key as Step);
                const done =
                  (step === "shipping" && s.key === "address") ||
                  (step === "payment" && s.key !== "payment");
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (s.key === "address") setStep("address");
                        if (s.key === "shipping" && shippingData)
                          setStep("shipping");
                      }}
                      disabled={!done && !active}
                      className={cn(
                        "transition",
                        active
                          ? "text-text-primary font-semibold underline underline-offset-[6px] decoration-2 decoration-primary"
                          : done
                            ? "text-text-secondary hover:text-primary"
                            : "text-text-secondary/60 cursor-not-allowed"
                      )}
                    >
                      {s.label}
                    </button>
                    {i < arr.length - 1 && <Chevron />}
                  </div>
                );
              })}
            </nav>

            {/* STEP 1 — Address */}
            {step === "address" && (
              <section>
                {/* İletişim */}
                <div className="flex items-baseline justify-between mb-4">
                  <h1 className="font-display text-[28px] md:text-[32px] text-text-primary">
                    İletişim
                  </h1>
                  {!user && (
                    <Link
                      href="/giris-yap?redirect=/odeme"
                      className="text-sm text-primary hover:underline"
                    >
                      Giriş yap
                    </Link>
                  )}
                </div>

                <div className="relative h-14 rounded-xl border border-text-primary bg-white mb-10">
                  <label className="absolute left-4 top-2 text-[11px] uppercase tracking-wide text-text-secondary pointer-events-none">
                    E-mail adresiniz
                  </label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    className="absolute inset-0 bg-transparent pl-4 pr-14 pt-6 pb-2 rounded-xl text-sm text-text-primary focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-text-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0116 0" strokeLinecap="round" />
                    </svg>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>

                {/* Kargo adresi */}
                <h2 className="font-display text-[22px] md:text-[26px] text-text-primary mb-4">
                  Kargo adresi
                </h2>

                {savedAddresses.length > 0 && !showNewAddress && (
                  <div className="space-y-3 mb-4">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                          selectedAddressId === addr.id
                            ? "border-text-primary bg-bg-primary/40"
                            : "border-border hover:border-text-primary/40"
                        )}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleAddressSelect(addr)}
                          className="accent-text-primary mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-text-primary">
                            {addr.title}
                          </span>
                          <p className="text-sm text-text-secondary mt-1">
                            {addr.first_name} {addr.last_name} — {addr.phone}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {addr.address_line}, {addr.district}/{addr.city}
                          </p>
                        </div>
                      </label>
                    ))}

                    <button
                      onClick={() => setShowNewAddress(true)}
                      className="text-sm text-text-primary underline hover:text-primary transition"
                    >
                      + Yeni adres ekle
                    </button>

                    {/* Fatura adresi */}
                    <div className="mt-8 pt-6 border-t border-border">
                      <h2 className="font-display text-[22px] md:text-[26px] text-text-primary mb-4">
                        Fatura adresi
                      </h2>

                      <label className="flex items-center gap-2 cursor-pointer select-none mb-4">
                        <input
                          type="checkbox"
                          checked={billingSameAsShipping}
                          onChange={(e) => {
                            setBillingSameAsShipping(e.target.checked);
                            if (e.target.checked) {
                              setSelectedBillingAddressId(null);
                              setBillingData(null);
                              setShowNewBillingAddress(false);
                            }
                          }}
                          className="w-4 h-4 accent-text-primary"
                        />
                        <span className="text-sm text-text-primary">
                          Kargo adresi ile aynı
                        </span>
                      </label>

                      {!billingSameAsShipping && !showNewBillingAddress && (
                        <div className="space-y-3">
                          {savedAddresses.map((addr) => (
                            <label
                              key={addr.id}
                              className={cn(
                                "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                                selectedBillingAddressId === addr.id
                                  ? "border-text-primary bg-bg-primary/40"
                                  : "border-border hover:border-text-primary/40"
                              )}
                            >
                              <input
                                type="radio"
                                name="billing_address"
                                checked={selectedBillingAddressId === addr.id}
                                onChange={() => handleBillingAddressSelect(addr)}
                                className="accent-text-primary mt-0.5"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-semibold text-text-primary">
                                  {addr.title}
                                </span>
                                <p className="text-sm text-text-secondary mt-1">
                                  {addr.first_name} {addr.last_name} — {addr.phone}
                                </p>
                                <p className="text-sm text-text-secondary">
                                  {addr.address_line}, {addr.district}/{addr.city}
                                </p>
                              </div>
                            </label>
                          ))}

                          <button
                            onClick={() => setShowNewBillingAddress(true)}
                            className="text-sm text-text-primary underline hover:text-primary transition"
                          >
                            + Yeni fatura adresi ekle
                          </button>
                        </div>
                      )}

                      {!billingSameAsShipping && showNewBillingAddress && (
                        <div className="space-y-3">
                          <button
                            onClick={() => setShowNewBillingAddress(false)}
                            className="text-sm text-text-secondary hover:text-text-primary mb-2 transition"
                          >
                            ← Kayıtlı fatura adreslerine dön
                          </button>
                          <AddressForm
                            onSubmit={async (d) => {
                              const { save_info, ...billing } = d;
                              // Bu ekrandan eklenen fatura adresi her durumda kaydedilir.
                              void save_info;
                              try {
                                const res = await api.post<Address | { address: Address }>("/addresses", {
                                  title: billing.title || "Fatura",
                                  first_name: billing.first_name,
                                  last_name: billing.last_name,
                                  phone: billing.phone,
                                  city: billing.city,
                                  district: billing.district,
                                  neighborhood: billing.neighborhood,
                                  address_line: billing.address_line,
                                  postal_code: billing.postal_code,
                                  is_default: false,
                                });
                                const rawAddr = res.data as Address | { address?: Address } | undefined;
                                const created =
                                  rawAddr && "address" in rawAddr ? rawAddr.address : (rawAddr as Address | undefined);

                                // Listeyi yenile
                                const refresh = await api
                                  .get<Address[]>("/addresses")
                                  .catch(() => ({ data: [] }));
                                const list = Array.isArray(refresh.data) ? refresh.data : [];
                                setSavedAddresses(list);

                                // Yeni eklenen adresi seç
                                const match = created ? list.find((a) => a.id === created.id) : undefined;
                                if (match) {
                                  handleBillingAddressSelect(match);
                                } else {
                                  setBillingData(billing);
                                }
                                setShowNewBillingAddress(false);
                              } catch {
                                // Kaydedilemese bile adresi local olarak kullan
                                setBillingData(billing);
                                setSelectedBillingAddressId(null);
                                setShowNewBillingAddress(false);
                              }
                            }}
                            defaultValues={
                              user
                                ? {
                                    first_name: user.first_name,
                                    last_name: user.last_name,
                                    phone: user.phone,
                                  }
                                : undefined
                            }
                            submitLabel="Adresi Kaydet"
                            onBack={() => setShowNewBillingAddress(false)}
                            backLabel="Vazgeç"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-6">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition"
                      >
                        <ChevronLeft /> Sepete geri dön
                      </Link>
                      <button
                        onClick={() => {
                          if (!selectedAddressId) return;
                          if (!billingSameAsShipping && !selectedBillingAddressId) return;
                          setStep("shipping");
                        }}
                        className="h-12 px-10 bg-text-primary text-white rounded-xl font-semibold hover:bg-black/90 transition disabled:opacity-50"
                        disabled={
                          !selectedAddressId ||
                          (!billingSameAsShipping && !selectedBillingAddressId)
                        }
                      >
                        Devam Et
                      </button>
                    </div>
                  </div>
                )}

                {(savedAddresses.length === 0 || showNewAddress) && (
                  <>
                    {showNewAddress && (
                      <button
                        onClick={() => setShowNewAddress(false)}
                        className="text-sm text-text-secondary hover:text-text-primary mb-4 transition"
                      >
                        ← Kayıtlı adreslerden seç
                      </button>
                    )}
                    <AddressForm
                      onSubmit={async (d) => {
                        const { save_info, ...shipping } = d;
                        setShippingData(shipping);
                        setSelectedAddressId(null);
                        setShowNewAddress(false);
                        // save_info işaretliyse /addresses'e kaydet — sonraki siparişlerde listede çıkar.
                        if (save_info) {
                          try {
                            await api.post<Address>("/addresses", {
                              title: shipping.title || "Teslimat",
                              first_name: shipping.first_name,
                              last_name: shipping.last_name,
                              phone: shipping.phone,
                              city: shipping.city,
                              district: shipping.district,
                              neighborhood: shipping.neighborhood,
                              address_line: shipping.address_line,
                              postal_code: shipping.postal_code,
                              is_default: savedAddresses.length === 0,
                            });
                            // Listeyi yenile ki checkout'ta ileride gelse seçilebilir olsun.
                            const refresh = await api
                              .get<Address[]>("/addresses")
                              .catch(() => ({ data: [] }));
                            const list = Array.isArray(refresh.data) ? refresh.data : [];
                            setSavedAddresses(list);
                          } catch {
                            // Kaydedilemedi — siparişe devam et, kullanıcı sonradan ekler.
                          }
                        }
                        setStep("shipping");
                      }}
                      defaultValues={
                        user
                          ? {
                              first_name: user.first_name,
                              last_name: user.last_name,
                              phone: user.phone,
                            }
                          : undefined
                      }
                      submitLabel="Devam Et"
                      backLabel="Sepete geri dön"
                      onBack={() => router.push("/")}
                    />
                  </>
                )}
              </section>
            )}

            {/* STEP 2 — Shipping */}
            {step === "shipping" && (
              <section>
                <h1 className="font-display text-2xl md:text-3xl text-text-primary mb-6">
                  Kargo seçimi
                </h1>

                {shippingData && (
                  <div className="bg-bg-primary rounded-xl p-4 mb-6 flex items-start gap-3 text-sm">
                    <span className="text-[10px] uppercase tracking-widest text-text-secondary shrink-0 mt-0.5">
                      Teslimat
                    </span>
                    <div className="flex-1 text-text-primary">
                      {shippingData.first_name} {shippingData.last_name},{" "}
                      {shippingData.address_line}, {shippingData.district}/
                      {shippingData.city}
                    </div>
                    <button
                      onClick={() => setStep("address")}
                      className="text-xs text-primary hover:underline"
                    >
                      Değiştir
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {shippingMethods.map((m) => (
                    <label
                      key={m.id}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition",
                        selectedShipping === m.id
                          ? "border-primary bg-primary-soft/40"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedShipping === m.id}
                        onChange={() => setSelectedShipping(m.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-text-primary">
                          {m.label}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {m.desc} • {m.duration}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-text-primary">
                        {m.price === 0 ? "Ücretsiz" : formatPrice(m.price)}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={() => setStep("address")}
                    className="text-sm text-text-secondary hover:text-primary inline-flex items-center gap-1 transition"
                  >
                    <ChevronLeft /> Adrese geri dön
                  </button>
                  <button
                    onClick={() => setStep("payment")}
                    className="h-11 px-8 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition"
                  >
                    Ödemeye Geç
                  </button>
                </div>
              </section>
            )}

            {/* STEP 3 — Payment */}
            {step === "payment" && (
              <section>
                <h1 className="font-display text-2xl md:text-3xl text-text-primary mb-6">
                  Ödeme bilgileri
                </h1>

                {shippingData && (
                  <div className="bg-bg-primary rounded-xl p-4 mb-3 flex items-start gap-3 text-sm">
                    <span className="text-[10px] uppercase tracking-widest text-text-secondary shrink-0 mt-0.5">
                      Teslimat
                    </span>
                    <div className="flex-1 text-text-primary">
                      {shippingData.first_name} {shippingData.last_name},{" "}
                      {shippingData.district}/{shippingData.city}
                    </div>
                    <button
                      onClick={() => setStep("address")}
                      className="text-xs text-primary hover:underline"
                    >
                      Değiştir
                    </button>
                  </div>
                )}

                <div className="bg-bg-primary rounded-xl p-4 mb-6 flex items-start gap-3 text-sm">
                  <span className="text-[10px] uppercase tracking-widest text-text-secondary shrink-0 mt-0.5">
                    Kargo
                  </span>
                  <div className="flex-1 text-text-primary">
                    {shippingMethods.find((s) => s.id === selectedShipping)?.label}
                  </div>
                  <button
                    onClick={() => setStep("shipping")}
                    className="text-xs text-primary hover:underline"
                  >
                    Değiştir
                  </button>
                </div>

                <PaymentForm
                  onSubmit={handlePaymentSubmit}
                  savedCards={savedCards}
                  isSubmitting={isSubmitting}
                />

                <div className="mt-6">
                  <button
                    onClick={() => setStep("shipping")}
                    className="text-sm text-text-secondary hover:text-primary inline-flex items-center gap-1 transition"
                  >
                    <ChevronLeft /> Kargoya geri dön
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Right — sticky summary */}
          <aside className="bg-bg-primary/60 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
            <div className="px-6 md:px-10 py-10 max-w-[520px] space-y-6">
              {/* Items */}
              <div className="space-y-5">
                {items.map((item) => {
                  const img =
                    item.product?.images?.find((i) => i.is_primary)?.image_url ??
                    item.product?.images?.[0]?.image_url ??
                    "/placeholder-product.png";
                  const price =
                    item.variant?.price ?? item.product?.price ?? 0;
                  return (
                    <div key={item.id} className="flex items-start gap-4">
                      {/* Larger product image */}
                      <div className="relative w-20 h-20 rounded-xl bg-white border border-border shrink-0 overflow-hidden shadow-sm">
                        <Image
                          src={img}
                          alt={item.product?.name ?? ""}
                          fill
                          sizes="80px"
                          className="object-contain p-2"
                        />
                        <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-text-primary text-white text-[10px] font-bold flex items-center justify-center shadow">
                          {item.quantity}
                        </span>
                      </div>

                      {/* Name + qty controls stacked */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-text-primary font-semibold leading-snug break-words">
                            {item.product?.name}
                          </p>
                          <p className="font-semibold text-sm text-text-primary price shrink-0">
                            {formatPrice(price * item.quantity)}
                          </p>
                        </div>
                        {item.variant?.name && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {item.variant.name}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="inline-flex items-center border border-border rounded-lg overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                item.quantity > 1 &&
                                updateItem(item.id, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-primary disabled:opacity-40"
                              aria-label="Azalt"
                            >
                              −
                            </button>
                            <span className="w-8 h-7 flex items-center justify-center text-xs font-medium border-x border-border">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(item.id, item.quantity + 1)
                              }
                              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-primary"
                              aria-label="Artır"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-text-secondary hover:text-accent-rose transition"
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon */}
              <div>
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                    <span>
                      <strong>{couponApplied}</strong> uygulandı (
                      {formatPrice(couponDiscount)})
                    </span>
                    <button
                      onClick={() => {
                        setCouponApplied("");
                        setCouponDiscount(0);
                        setCouponCode("");
                      }}
                      className="text-emerald-600 hover:text-emerald-800"
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="İndirim kodu veya hediye kartı"
                      className="flex-1 h-12 px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-text-primary transition"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-5 h-12 rounded-xl bg-bg-primary border border-border text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-text-primary transition disabled:opacity-50"
                    >
                      {couponLoading ? "…" : "Uygula"}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-[11px] text-accent-rose mt-1">
                    {couponError}
                  </p>
                )}
              </div>

              {/* Totals — flat rows */}
              <div className="space-y-2.5 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-text-primary">Alt toplam</span>
                  <span className="text-text-primary price">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-text-secondary">İndirim</span>
                    <span className="text-emerald-600 price">
                      −{formatPrice(couponDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-text-primary inline-flex items-center gap-1">
                    Kargo
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-text-secondary/50 text-[10px] text-text-secondary cursor-help" title="Kargo ücreti ödeme bölümünde belirlenir.">
                      ?
                    </span>
                  </span>
                  <span className="text-text-primary price">
                    {shippingCost === 0
                      ? "Ücretsiz"
                      : formatPrice(shippingCost)}
                  </span>
                </div>
              </div>

              {/* Toplam */}
              <div className="flex items-baseline justify-between pt-2">
                <p className="font-display text-2xl text-text-primary">
                  Toplam
                </p>
                <p className="font-display text-2xl text-text-primary price">
                  {formatPrice(total)}
                </p>
              </div>
              <p className="text-[12px] text-text-secondary -mt-4">
                {Math.round(total * 0.18 * 100) / 100}{" "}
                {total >= 0 ? "TL" : ""} KDV dahil
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary/60">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
