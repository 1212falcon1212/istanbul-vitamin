import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-border shadow-xl p-10 text-center">
        <p className="font-display text-7xl text-primary/40 mb-2">404</p>
        <h1 className="font-display text-2xl text-text-primary mb-2">
          Sayfa bulunamadı
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 h-11 inline-flex items-center justify-center rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition"
          >
            Ana Sayfa
          </Link>
          <Link
            href="/magaza"
            className="flex-1 h-11 inline-flex items-center justify-center rounded-xl border border-border text-text-primary font-medium hover:border-primary hover:text-primary transition"
          >
            Alışverişe Başla
          </Link>
        </div>
      </div>
    </div>
  );
}
