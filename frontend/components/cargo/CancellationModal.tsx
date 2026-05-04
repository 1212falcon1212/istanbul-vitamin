"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CancellationType } from "@/types";

const REASONS: { value: string; label: string }[] = [
  { value: "wrong_item", label: "Yanlış ürün geldi" },
  { value: "damaged", label: "Hasarlı / kusurlu ürün" },
  { value: "size_color", label: "Beden / renk uyuşmazlığı" },
  { value: "no_longer_needed", label: "Vazgeçtim" },
  { value: "late_delivery", label: "Geç teslim" },
  { value: "other", label: "Diğer" },
];

type Props = {
  orderId: number;
  type: CancellationType;
  onClose: () => void;
  onSuccess: () => void;
};

/**
 * Müşteri-tarafı iptal/iade modal'ı.
 * type=cancel  → "Siparişi İptal Et" başlığı
 * type=return  → "İade Talebi" başlığı
 *
 * pending durumda otomatik onay; shipped/delivered için admin onayı bekler.
 */
export default function CancellationModal({
  orderId,
  type,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isCancel = type === "cancel";

  async function submit() {
    if (!reason) {
      setError("Lütfen bir sebep seçin.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/orders/${orderId}/cancellation`, {
        type,
        reason,
        note,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display text-lg text-text-primary">
            {isCancel ? "Siparişi İptal Et" : "İade Talebi"}
          </h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Kapat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-text-secondary">
            {isCancel
              ? "Talebinizi onayladığımızda, ödediğiniz tutar kullanmış olduğunuz karta iade edilir."
              : "İade talebiniz onaylandığında size iade kargo bilgisi iletilir; ürün depomuza ulaştığında bedeli iade edilir."}
          </p>

          <div>
            <label className="block text-xs uppercase tracking-wider text-text-secondary mb-2">
              Sebep
            </label>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                    reason === r.value
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:bg-bg-primary"
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-text-secondary mb-2">
              Açıklama (opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Detay verirseniz daha hızlı sonuçlandırırız."
              className="w-full rounded-lg border border-border bg-white text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors px-3 py-2 leading-relaxed resize-y"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 p-2.5 text-xs">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={submit}
            disabled={submitting || !reason}
            className="flex-1 h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting ? "Gönderiliyor…" : "Talebi Gönder"}
          </button>
        </footer>
      </div>
    </div>
  );
}
