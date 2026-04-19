"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-border shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-rose">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl text-text-primary mb-2">
          Bir şeyler ters gitti
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Beklenmedik bir hata oluştu. Sorun devam ederse bize bildirin.
        </p>
        {error.digest && (
          <p className="text-[10px] text-text-secondary/60 font-mono mb-4">
            Hata kodu: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 h-11 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition"
          >
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="flex-1 h-11 inline-flex items-center justify-center rounded-xl border border-border text-text-primary font-medium hover:border-primary hover:text-primary transition"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
