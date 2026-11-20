import Spinner from "@/components/ui/Spinner";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" className="size-14" />
        <p className="text-sm text-text-secondary">Yükleniyor…</p>
      </div>
    </div>
  );
}
