"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-client-flags";
import { cn } from "@/lib/utils";

type NumberTickerType = typeof import("@/components/magicui/number-ticker").NumberTicker;
let tickerModule: Promise<NumberTickerType> | null = null;

/** Magic UI's NumberTicker, fetched once on the client so the animation library stays out of the first load. */
function loadNumberTicker() {
  tickerModule ??= import("@/components/magicui/number-ticker").then((m) => m.NumberTicker);
  return tickerModule;
}

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
  const [NumberTicker, setNumberTicker] = useState<NumberTickerType | null>(null);
  useEffect(() => {
    if (reduce) return;
    let alive = true;
    loadNumberTicker().then((c) => alive && setNumberTicker(() => c));
    return () => {
      alive = false;
    };
  }, [reduce]);
  const formatted = Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);

  if (reduce || !NumberTicker) {
    return <span className={cn("inline-block tabular-nums", className)}>{formatted}</span>;
  }
  return (
    <>
      <span className="sr-only">{formatted}</span>
      <NumberTicker aria-hidden value={value} decimalPlaces={decimalPlaces} className={cn("tracking-normal", className)} />
    </>
  );
}
