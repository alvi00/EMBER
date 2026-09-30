"use client";

import { lazy, Suspense } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-client-flags";
import { cn } from "@/lib/utils";

// Fetched on the client only when motion is allowed, so the animation library stays out of the first load.
const NumberTicker = lazy(() =>
  import("@/components/magicui/number-ticker").then((m) => ({ default: m.NumberTicker })),
);

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
  // True on the server and during hydration: the final number renders first, the count-up starts only on the client.
  const reduce = usePrefersReducedMotion(true);
  const formatted = Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
  const plain = <span className={cn("inline-block tabular-nums", className)}>{formatted}</span>;

  if (reduce) return plain;
  return (
    <Suspense fallback={plain}>
      <span className="sr-only">{formatted}</span>
      <NumberTicker
        aria-hidden
        value={value}
        decimalPlaces={decimalPlaces}
        className={cn("tracking-normal", className)}
      />
    </Suspense>
  );
}
