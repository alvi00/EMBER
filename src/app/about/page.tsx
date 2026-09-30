import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, Users } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { challenge, credits, team, verbs } from "@/content/about";
import { site } from "@/content/site";
import { datasetStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "About",
  description: "EMBER was built for the NASA Space Apps Challenge 2026, Flame in Freefall. The team, the challenge, credits and the disclaimer.",
};

export default function AboutPage() {
  const s = datasetStats();
  return (
    <>
      <PageHeader
        eyebrow={challenge.event}
        title="About EMBER"
        description={`${site.expansion}: an evidence-first way into NASA microgravity combustion research, built for the ${challenge.name} challenge.`}
      />
      <div className="container-ember grid gap-12 pb-24 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-8">
          <section aria-labelledby="challenge">
            <h2 id="challenge" className="eyebrow mb-3">
              The challenge
            </h2>
            <p className="max-w-[68ch] text-lg leading-relaxed text-ink-muted">{challenge.statement}</p>
          </section>

          <section aria-labelledby="answer">
            <h2 id="answer" className="eyebrow mb-4">
              EMBER&apos;s answer
            </h2>
            <ol className="divide-y divide-line border-y border-line">
              {verbs.map((v, i) => (
                <li key={v.verb} className="grid gap-2 py-5 sm:grid-cols-[3rem_9rem_1fr_auto] sm:items-baseline">
                  <span className="font-mono text-xs text-ink-faint">0{i + 1}</span>
                  <span className="font-display text-3xl text-ink">{v.verb}</span>
                  <p className="text-sm leading-relaxed text-ink-muted">{v.what}</p>
                  <Link href={v.href} className="group inline-flex items-center gap-1 text-sm text-flame-micro underline-offset-4 hover:underline">
                    {v.cta}
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px" strokeWidth={1.5} aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-4 max-w-[68ch] text-sm text-ink-muted">
              Built on {s.sources} NASA sources: {s.investigations} investigations, {s.findings} findings and {s.testPoints} test points,
              each traceable to its source. See{" "}
              <Link href="/methods" className="text-flame-micro underline-offset-4 hover:underline">
                Methods
              </Link>{" "}
              for how.
            </p>
          </section>

          <section aria-labelledby="credits">
            <h2 id="credits" className="eyebrow mb-4">
              Credits
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {credits.map((g) => (
                <div key={g.group} className={g.group === "Software" ? "sm:col-span-2" : undefined}>
                  <h3 className="mb-2 text-sm font-medium text-ink">{g.group}</h3>
                  <ul className={g.group === "Software" ? "grid gap-x-8 sm:grid-cols-2" : undefined}>
                    {g.items.map((c) => (
                      <li key={c.name} className="border-b border-line py-2.5">
                        <a href={c.href} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-3">
                          <span>
                            <span className="block text-sm text-ink group-hover:text-flame-micro">{c.name}</span>
                            <span className="block text-xs text-ink-muted">{c.note}</span>
                          </span>
                          <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-ink-faint" strokeWidth={1.5} aria-label="(opens in a new tab)" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section aria-labelledby="team" className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-1.5">
            <div className="rounded-[calc(1.5rem-0.375rem)] border border-line bg-elev-1 p-5">
              <h2 id="team" className="eyebrow mb-4">
                Team
              </h2>
              {team.length ? (
                <ul className="space-y-3">
                  {team.map((m) => (
                    <li key={m.name}>
                      {m.link ? (
                        <a href={m.link} target="_blank" rel="noreferrer" className="text-ink hover:text-flame-micro">
                          {m.name}
                        </a>
                      ) : (
                        <span className="text-ink">{m.name}</span>
                      )}
                      <span className="block text-xs text-ink-muted">{m.role}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex gap-3 rounded-xl border border-dashed border-line-strong p-4">
                  <Users className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
                  <p className="text-sm text-ink-muted">Team names and roles are added here before submission.</p>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="disclaimer" className="rounded-2xl border border-flame-core/25 bg-flame-core/[0.05] p-5">
            <h2 id="disclaimer" className="eyebrow mb-2 text-flame-core">
              Disclaimer
            </h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              {site.disclaimer} EMBER is not affiliated with or endorsed by NASA. NASA names appear only to identify data sources;
              no NASA insignia or logos are used. AI-drafted findings are labelled until a human verifies them.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
