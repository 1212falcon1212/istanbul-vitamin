import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
} as const;

export default function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span role="status" aria-label="Yükleniyor" className={cn("inline-flex shrink-0", sizeMap[size], className)}>
      <img src="/icons/brand-mark.png" alt="" className="size-full object-contain motion-safe:animate-pulse" />
    </span>
  );
}
