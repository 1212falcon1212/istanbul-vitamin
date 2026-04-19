"use client";

import { useState, type FormEvent } from "react";
import type { SavedCard } from "@/types";

interface PaymentFormData {
  card_number: string;
  expiry: string;
  cvv: string;
  holder_name: string;
  save_card: boolean;
  saved_card_id?: number;
}

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  savedCards?: SavedCard[];
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
  savedCards,
  isSubmitting = false,
}: PaymentFormProps) {
  const [selectedSavedCard, setSelectedSavedCard] = useState<number | null>(
    null
  );
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    if (selectedSavedCard) return true;

    const cleanNumber = cardNumber.replace(/\s/g, "");
    const allEmpty =
      cleanNumber.length === 0 &&
      expiry.length === 0 &&
      cvv.length === 0 &&
      holderName.trim().length === 0;

    // Dev mode: tüm alanlar boşsa ödeme bilgisi opsiyonel (backend bypass eder).
    if (allEmpty) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    if (cleanNumber.length < 16) newErrors.card_number = "Kart numarası 16 haneli olmalı";
    if (expiry.length < 5) newErrors.expiry = "Geçerli bir tarih giriniz";
    if (cvv.length < 3) newErrors.cvv = "CVV en az 3 haneli olmalı";
    if (!holderName.trim()) newErrors.holder_name = "Kart üzerindeki isim zorunlu";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (selectedSavedCard) {
      onSubmit({
        card_number: "",
        expiry: "",
        cvv: "",
        holder_name: "",
        save_card: false,
        saved_card_id: selectedSavedCard,
      });
    } else {
      onSubmit({
        card_number: cardNumber.replace(/\s/g, ""),
        expiry,
        cvv,
        holder_name: holderName,
        save_card: saveCard,
      });
    }
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

      {/* Saved cards */}
      {savedCards && savedCards.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-text-primary">
            Kayitli Kartlar
          </h4>
          {savedCards.map((card) => (
            <label
              key={card.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedSavedCard === card.id
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="saved_card"
                checked={selectedSavedCard === card.id}
                onChange={() => setSelectedSavedCard(card.id)}
                className="accent-primary"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary">
                  {card.card_brand || "Kart"} **** {card.last_four}
                </span>
                {card.card_label && (
                  <span className="ml-2 text-xs text-text-secondary">
                    ({card.card_label})
                  </span>
                )}
              </div>
              {card.is_default && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Varsayilan
                </span>
              )}
            </label>
          ))}

          <button
            type="button"
            onClick={() => setSelectedSavedCard(null)}
            className={`text-sm transition-colors ${
              selectedSavedCard === null
                ? "text-primary font-medium"
                : "text-text-secondary hover:text-primary"
            }`}
          >
            + Yeni kart ile ode
          </button>
        </div>
      )}

      {/* New card form */}
      {selectedSavedCard === null && (
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

          {/* Save card */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            <span className="text-sm text-text-secondary">
              Kartimi kaydet
            </span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-primary text-white rounded-xl font-medium text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Isleniyor..." : "Siparisi Tamamla"}
      </button>
    </form>
  );
}
