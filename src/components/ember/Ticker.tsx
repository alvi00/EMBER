"use client";

import { useIsClient } from "@/hooks/use-client-flags";
import { useReducedMotion } from "motion/react";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { cn } from "@/lib/utils";

/**
 * KPI number. Server-renders the real value (no-JS, crawlers, screenshots see the data), then — only when motion
 * is allowed — hands over to Magic UI's NumberTicker, which counts up once on first view.
 */
export function Ticker({
  value,
  decimalPlaces = 0,
  className,
}: {
  value: number;
  decimalPlaces?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // Server and hydration render the final number; the count-up starts only on the client.
  const mounted = useIsClient();
  const formatted = Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);

  if (!mounted || reduce) {
    return <span className={cn("inline-block tabular-nums", className)}>{formatted}</span>;
  }
  return (
    <>
      <span className="sr-only">{formatted}</span>
      <NumberTicker aria-hidden value={value} decimalPlaces={decimalPlaces} className={cn("tracking-normal", className)} />
    </>
  );
}
