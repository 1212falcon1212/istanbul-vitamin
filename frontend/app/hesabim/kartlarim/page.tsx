"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import type { SavedCard } from "@/types";

function getCardBrandIcon(brand: string | undefined): string {
  switch (brand?.toLowerCase()) {
    case "visa":
      return "VISA";
    case "mastercard":
    case "master":
      return "MC";
    case "amex":
      return "AMEX";
    case "troy":
      return "TROY";
    default:
      return "KART";
  }
}

export default function KartlarimPage() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SavedCard[]>("/saved-cards");
      setCards(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Kartlar yuklenirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await api.delete(`/saved-cards/${id}`);
      setDeleteConfirmId(null);
      await fetchCards();
    } catch {
      setError("Kart silinirken bir hata olustu.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-text-primary">Kartlarim</h1>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 shrink-0 mt-0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <p className="text-sm text-blue-700">
          Kartlariniz guvenli sekilde PayTR tarafindan saklanmaktadir.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="bg-card-bg rounded-2xl border border-border p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-16 h-16 mx-auto text-border mb-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <p className="text-text-secondary text-lg">
            Kayitli kartiniz bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className={cn(
                "bg-card-bg rounded-2xl border p-5 flex items-center gap-4",
                card.is_default ? "border-primary" : "border-border"
              )}
            >
              {/* Card brand badge */}
              <div className="w-14 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {getCardBrandIcon(card.card_brand)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    **** **** **** {card.last_four}
                  </p>
                  {card.is_default && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary">
                      Varsayilan
                    </span>
                  )}
                </div>
                {card.card_label && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {card.card_label}
                  </p>
                )}
              </div>

              {/* Delete */}
              {deleteConfirmId === card.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-red-600">Silinsin mi?</span>
                  <button
                    onClick={() => handleDelete(card.id)}
                    disabled={deleting}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deleting ? "Siliniyor..." : "Evet"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-xs font-medium text-text-secondary hover:underline"
                  >
                    Hayir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(card.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="Karti sil"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
