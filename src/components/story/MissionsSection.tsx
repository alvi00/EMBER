import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BorderBeam } from "@/components/magicui/border-beam";
import type { Mission } from "@/lib/missions";
import { cn } from "@/lib/utils";
import { SplitHeading } from "@/components/story/SplitHeading";
import { MissionBriefing } from "@/components/story/MissionBriefing";

export type MissionCard = Mission & { relevantFindings: number };

/**
 * "Pick your mission": five scenario cards → /insights?mission=… (Lunar is the featured tile). Each card can also read
 * its mission briefing aloud.
 */
export function MissionsSection({ missions }: { missions: MissionCard[] }) {
  const featured = missions.find((m) => m.id === "lunar") ?? missions[0];
  const rest = missions.filter((m) => m.id !== featured.id);
  return (
    <section aria-labelledby="missions-title" className="py-24 md:py-32">
      <div className="container-ember">
        <SplitHeading
          id="missions-title"
          className="font-display text-ink max-w-[18ch] text-5xl leading-[1.03] md:text-6xl"
        >
          Pick your mission.
        </SplitHeading>
        <p className="text-ink-muted mt-5 max-w-[50ch] text-lg leading-relaxed">
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
    // The card is one big link (a stretched link on the title) with the briefing button layered above it, since a
    // button cannot sit inside a link.
    <div
      className={cn(
        "group border-line bg-elev-1 has-[a:focus-visible]:outline-flame-micro relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-[border-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-white/20 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2",
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
          <p className="text-ink-muted tabular font-mono text-xs">{mission.gravityLabel}</p>
          <h3 className={cn("text-ink mt-2", featured ? "font-display text-5xl md:text-6xl" : "text-xl font-medium")}>
            <Link
              href={`/insights?mission=${mission.id}`}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {mission.label}
            </Link>
          </h3>
        </div>
        <span
          aria-hidden
          className="text-ink flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          <ArrowUpRight className="size-4" strokeWidth={1.5} />
        </span>
      </div>
      <p className={cn("text-ink-muted mt-3", featured ? "max-w-[36ch] text-base" : "text-sm")}>
        {mission.description}
      </p>
      <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm">
        <div>
          <dt className="text-ink-muted text-xs">Relevant findings</dt>
          <dd className="text-ink tabular font-mono">{mission.relevantFindings}</dd>
        </div>
        <div>
          <dt className="text-ink-muted text-xs">Cabin {cabin.sourced ? "(NASA source)" : "(assumed)"}</dt>
          <dd className="text-ink tabular font-mono">
            {cabin.pressureKpa} kPa · {cabin.o2Percent}% O2
          </dd>
        </div>
      </dl>
      <MissionBriefing missionId={mission.id} label={mission.label} />
    </div>
  );
}
