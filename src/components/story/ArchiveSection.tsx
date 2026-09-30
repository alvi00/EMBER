import { Marquee } from "@/components/magicui/marquee";
import { Ticker } from "@/components/ember/Ticker";
import { Reveal } from "@/components/ember/Reveal";
import { SplitHeading } from "@/components/story/SplitHeading";

type Stat = { value: number; label: string; note: string };

/** "The archive problem": acronyms marquee + counts computed from data/processed. */
export function ArchiveSection({ acronyms, stats, span }: { acronyms: string[]; stats: Stat[]; span: string }) {
  return (
    <section aria-labelledby="archive-title" className="relative py-24 md:py-32">
      <div className="container-ember">
        <SplitHeading id="archive-title" className="max-w-[18ch] font-display text-5xl leading-[1.03] text-ink md:text-6xl">
          Decades of experiments, scattered across archives.
        </SplitHeading>
        <Reveal>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-muted">
            Results sit in PSI datasets, NTRS reports and conference slides from {span}. EMBER pulls them into one
            evidence base.
          </p>
        </Reveal>
      </div>

      <div className="relative mt-14 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <Marquee pauseOnHover className="[--duration:55s] [--gap:0.75rem]" aria-label="Investigations in the dataset">
          {acronyms.map((a) => (
            <span
              key={a}
              className="rounded-full border border-line-strong bg-white/[0.02] px-4 py-2 font-mono text-sm whitespace-nowrap text-ink-muted"
            >
              {a}
            </span>
          ))}
        </Marquee>
      </div>

      <div className="container-ember mt-14">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className="bg-canvas p-6 md:p-8">
              <dt className="text-sm text-ink-muted">{s.label}</dt>
              <dd className="mt-3">
                <Ticker
                  value={s.value}
                  className={
                    i === 0
                      ? "font-display text-6xl text-flame-core md:text-7xl"
                      : "font-display text-6xl text-ink md:text-7xl"
                  }
                />
                <span className="mt-2 block text-xs leading-relaxed text-ink-muted">{s.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
