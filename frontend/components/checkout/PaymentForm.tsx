"use client";

import { useState, type FormEvent } from "react";

interface PaymentFormData {
  card_number: string;
  expiry: string;
  cvv: string;
  holder_name: string;
}

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  isSubmitting?: boolean;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export default function PaymentForm({
  onSubmit,
  isSubmitting = false,
}: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {

    const cleanNumber = cardNumber.replace(/\s/g, "");
    const allEmpty =
      cleanNumber.length === 0 &&
      expiry.length === 0 &&
      cvv.length === 0 &&
      holderName.trim().length === 0;

    // Dev mode: tüm alanlar boşsa ödeme bilgisi opsiyonel (backend bypass eder).
    if (allEmpty && process.env.NEXT_PUBLIC_PAYMENT_DEV_MODE === "true") {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    if (cleanNumber.length < 16) newErrors.card_number = "Kart numarası 16 haneli olmalı";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) newErrors.expiry = "Geçerli bir tarih giriniz";
    if (cvv.length < 3) newErrors.cvv = "CVV en az 3 haneli olmalı";
    if (!holderName.trim()) newErrors.holder_name = "Kart üzerindeki isim zorunlu";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({card_number:cardNumber.replace(/\s/g,""), expiry, cvv, holder_name:holderName});
  }

  const inputClass =
    "w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Dev mode notice — prod'da gizlenir */}
      {process.env.NEXT_PUBLIC_PAYMENT_DEV_MODE === "true" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <strong>Geliştirme modu:</strong> Kart bilgisi girmeden "Siparişi Tamamla"ya basabilirsin. Gerçek tahsilat yapılmaz.
        </div>
      )}

        <div className="space-y-4">
          {/* Card number */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Kart Numarasi
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="XXXX XXXX XXXX XXXX"
              maxLength={19}
              className={inputClass}
            />
            {errors.card_number && (
              <p className={errorClass}>{errors.card_number}</p>
            )}
          </div>

          {/* Expiry & CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Son Kullanma
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="AA/YY"
                maxLength={5}
                className={inputClass}
              />
              {errors.expiry && (
                <p className={errorClass}>{errors.expiry}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                CVV
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={cvv}
                onChange={(e) =>
                  setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="***"
                maxLength={4}
                className={inputClass}
              />
              {errors.cvv && <p className={errorClass}>{errors.cvv}</p>}
            </div>
          </div>

          {/* Holder name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Kart Uzerindeki Isim
            </label>
            <input
              type="text"
              value={holderName}
              onChange={(e) =>
                setHolderName(e.target.value.toUpperCase())
              }
              placeholder="AD SOYAD"
              className={inputClass}
            />
            {errors.holder_name && (
              <p className={errorClass}>{errors.holder_name}</p>
            )}
          </div>

        </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-primary text-white rounded-xl font-medium text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "İşleniyor…" : "3D Secure ile öde"}
      </button>
    </form>
  );
}
