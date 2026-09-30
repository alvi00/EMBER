import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BorderBeam } from "@/components/magicui/border-beam";
import type { Mission } from "@/lib/missions";
import { cn } from "@/lib/utils";
import { SplitHeading } from "@/components/story/SplitHeading";

export type MissionCard = Mission & { relevantFindings: number };

/** "Pick your mission": five cards → /insights?mission=… (Lunar is the featured tile). */
export function MissionsSection({ missions }: { missions: MissionCard[] }) {
  const featured = missions.find((m) => m.id === "lunar") ?? missions[0];
  const rest = missions.filter((m) => m.id !== featured.id);
  return (
    <section aria-labelledby="missions-title" className="py-24 md:py-32">
      <div className="container-ember">
        <SplitHeading id="missions-title" className="max-w-[18ch] font-display text-5xl leading-[1.03] text-ink md:text-6xl">
          Pick your mission.
        </SplitHeading>
        <p className="mt-5 max-w-[50ch] text-lg leading-relaxed text-ink-muted">
          The same finding matters differently in orbit, on the Moon and on Mars. EMBER re-ranks the evidence for each.
        </p>

        <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
          <li className="md:col-span-2 md:row-span-2">
            <MissionLink mission={featured} featured />
          </li>
          {rest.map((m) => (
            <li key={m.id}>
              <MissionLink mission={m} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MissionLink({ mission, featured = false }: { mission: MissionCard; featured?: boolean }) {
  const cabin = mission.cabin;
  return (
    <Link
      href={`/insights?mission=${mission.id}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-line bg-elev-1 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-[border-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-white/20",
        featured ? "min-h-[22rem] md:p-9" : "min-h-[12rem]",
      )}
    >
      {featured ? (
        <>
          <BorderBeam size={120} duration={9} colorFrom="#4CC9F0" colorTo="#7B61FF" />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-[radial-gradient(closest-side,rgba(255,122,24,0.18),rgba(123,97,255,0.1),transparent)]"
          />
        </>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-ink-muted tabular">{mission.gravityLabel}</p>
          <h3 className={cn("mt-2 text-ink", featured ? "font-display text-5xl md:text-6xl" : "text-xl font-medium")}>
            {mission.label}
          </h3>
        </div>
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-ink transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          <ArrowUpRight className="size-4" strokeWidth={1.5} />
        </span>
      </div>
      <p className={cn("mt-3 text-ink-muted", featured ? "max-w-[36ch] text-base" : "text-sm")}>{mission.description}</p>
      <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm">
        <div>
          <dt className="text-xs text-ink-muted">Relevant findings</dt>
          <dd className="font-mono text-ink tabular">{mission.relevantFindings}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Cabin {cabin.sourced ? "(NASA source)" : "(assumed)"}</dt>
          <dd className="font-mono text-ink tabular">
            {cabin.pressureKpa} kPa · {cabin.o2Percent}% O2
          </dd>
        </div>
      </dl>
    </Link>
  );
}
