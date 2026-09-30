"use client";

import { Suspense, useState } from "react";
import { Check, ChevronDown, Orbit } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMission } from "@/hooks/use-mission";
import { MISSIONS } from "@/lib/missions";
import { cn } from "@/lib/utils";

function SwitcherInner({ compact = false }: { compact?: boolean }) {
  const { mission, setMission } = useMission();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative isolate inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs text-ink transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-flame-micro"
      >
        <span aria-hidden className="gradient-ring absolute inset-0 -z-10 rounded-full" />
        <Orbit className="size-3.5 text-flame-micro" strokeWidth={1.5} aria-hidden />
        {/* The accessible name contains the visible text ("Moon" or "Lunar surface"), as WCAG 2.5.3 requires. */}
        <span className="sr-only">Mission: </span>
        <span className={cn(compact && "hidden sm:inline")}>{mission.label}</span>
        <span className={cn(compact && "sm:hidden")}>{compact ? mission.short : null}</span>
        <span className="sr-only">, change mission</span>
        <ChevronDown className="size-3.5 text-ink-muted" strokeWidth={1.5} aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 border-line bg-elev-2 p-1.5">
        <p className="px-2.5 pt-1.5 pb-2 text-xs text-ink-muted">Rank and interpret evidence for</p>
        <ul role="listbox" aria-label="Mission" className="space-y-0.5">
          {MISSIONS.map((m) => {
            const selected = m.id === mission.id;
            return (
              <li key={m.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setMission(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    selected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="flex-1">
                    <span className="block text-sm text-ink">{m.label}</span>
                    <span className="block font-mono text-2xs text-ink-muted">{m.gravityLabel}</span>
                  </span>
                  {selected ? <Check className="size-4 text-flame-micro" strokeWidth={1.5} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Mission chip in the header. The choice lives in `?mission=` so every view is shareable. */
export function MissionSwitcher({ compact = false }: { compact?: boolean }) {
  return (
    <Suspense fallback={<span className="inline-block h-9 w-32 animate-pulse rounded-full bg-elev-2" aria-hidden />}>
      <SwitcherInner compact={compact} />
    </Suspense>
  );
}
