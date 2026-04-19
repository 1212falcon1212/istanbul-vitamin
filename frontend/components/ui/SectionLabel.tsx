import { cn } from "@/lib/utils";

interface SectionLabelProps {
  /** Zero-padded section number, e.g. "001" */
  number: string;
  /** Section title in uppercase, e.g. "KATEGORİ" */
  title: string;
  className?: string;
}

/**
 * Editorial section label rendered as:
 *   N° 001 — BÖLÜM ADI
 */
export default function SectionLabel({ number: _number, title, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-[10px] uppercase tracking-[0.2em] text-text-secondary font-body font-medium select-none",
        className
      )}
    >
      {title}
    </p>
  );
}
