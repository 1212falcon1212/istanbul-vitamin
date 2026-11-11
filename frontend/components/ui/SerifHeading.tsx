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
 * Shared display heading.
 *
 * Legacy component name; uses the shared Inter display font. Wrap text in <em>
 * while inheriting the heading colour:
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
        "font-display font-semibold tracking-tight leading-tight text-text-primary [&_em]:not-italic [&_em]:text-inherit",
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Tag>
  );
}
