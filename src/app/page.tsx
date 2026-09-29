import Link from "next/link";
import { site } from "@/content/site";

export default function Home() {
  return (
    <section className="container-ember flex min-h-[70vh] flex-col justify-center py-24">
      <p className="eyebrow">{site.challenge}</p>
      <h1 className="mt-4 max-w-4xl font-display text-6xl leading-[0.98] tracking-tight md:text-7xl">
        On Earth, fire rises. <em className="text-flame-gradient">In space, it has nowhere to go.</em>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-ink-muted">{site.tagline}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas">
          Open Mission Control
        </Link>
        <Link href="/ask" className="rounded-full border border-line-strong px-5 py-2.5 text-sm text-ink">
          Ask the Flame
        </Link>
      </div>
    </section>
  );
}
