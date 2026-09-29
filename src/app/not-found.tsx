import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-ember flex min-h-[60vh] flex-col items-start justify-center py-24">
      <p className="eyebrow">404 · No evidence found</p>
      <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
        This page drifted out of the <em>flame zone</em>.
      </h1>
      <p className="mt-4 max-w-lg text-ink-muted">
        The address may be mistyped, or the record may not exist in the EMBER dataset.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/experiments" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas">
          Browse experiments
        </Link>
        <Link href="/" className="rounded-full border border-line-strong px-5 py-2.5 text-sm text-ink">
          Back to start
        </Link>
      </div>
    </section>
  );
}
