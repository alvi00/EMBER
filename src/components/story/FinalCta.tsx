import { BookOpen } from "lucide-react";
import { CtaLink } from "@/components/ember/CtaLink";

export function FinalCta({ findings, sources }: { findings: number; sources: number }) {
  return (
    <section aria-labelledby="final-cta" className="py-24 md:py-32">
      <div className="container-ember">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-elev-1 px-6 py-16 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] md:px-16 md:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(76,201,240,0.16),rgba(123,97,255,0.08),transparent)]"
          />
          <h2 id="final-cta" className="relative max-w-[20ch] font-display text-5xl leading-[1.03] text-ink md:text-7xl">
            {findings} findings. {sources} NASA sources. <em className="text-flame-gradient pr-1 pb-1">One mission at a time.</em>
          </h2>
          <p className="relative mt-6 max-w-[48ch] text-lg text-ink-muted">
            Every insight links back to the NASA record it came from.
          </p>
          <div className="relative mt-10 flex flex-wrap gap-3">
            <CtaLink href="/dashboard">Open Mission Control</CtaLink>
            <CtaLink href="/methods" variant="ghost" icon={BookOpen}>
              Read the methods
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
