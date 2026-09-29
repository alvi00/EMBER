"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.warn("EMBER route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="container-ember flex min-h-[60vh] flex-col items-start justify-center py-24" role="alert">
      <p className="eyebrow">Something flickered out</p>
      <h1 className="mt-4 font-display text-5xl leading-tight">This view failed to load.</h1>
      <p className="mt-4 max-w-lg text-ink-muted">
        The evidence is still safe. Try again, or head back to Mission Control.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas"
        >
          Try again
        </button>
        <Link href="/dashboard" className="rounded-full border border-line-strong px-5 py-2.5 text-sm text-ink">
          Mission Control
        </Link>
      </div>
    </section>
  );
}
