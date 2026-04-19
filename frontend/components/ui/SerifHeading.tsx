import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

type HeadingSize = "sm" | "md" | "lg" | "xl";

interface SerifHeadingProps {
  children: ReactNode;
  size?: HeadingSize;
  /** Render as a different HTML element. Defaults to "h2". */
  as?: ElementType;
  className?: string;
}

const sizeClasses: Record<HeadingSize, string> = {
  sm: "text-2xl md:text-3xl",
  md: "text-3xl md:text-4xl",
  lg: "text-4xl md:text-5xl",
  xl: "text-5xl md:text-6xl",
};

/**
 * Mixed serif heading.
 *
 * Wrap a word or phrase in <em> to render it in italic DM Serif Display
 * with the accent (primary) colour:
 *
 *   <SerifHeading>Cilt için <em>sessiz devrim.</em></SerifHeading>
 */
export default function SerifHeading({
  children,
  size = "lg",
  as: Tag = "h2",
  className,
}: SerifHeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display leading-tight text-text-primary [&_em]:not-italic [&_em]:italic [&_em]:text-primary",
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Tag>
  );
}
