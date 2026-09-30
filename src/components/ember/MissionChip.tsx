import { Orbit } from "lucide-react";
import type { Mission } from "@/lib/missions";
import { cn } from "@/lib/utils";

/** Static mission label with gravity, e.g. "Lunar surface 0.17 g". Active state uses the flame-gradient ring. */
export function MissionChip({
  mission,
  active = false,
  className,
}: {
  mission: Mission;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative isolate inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        active ? "border-transparent text-ink" : "border-line-strong text-ink-muted",
        className,
      )}
    >
      {active ? <span aria-hidden className="gradient-ring absolute inset-0 -z-10 rounded-full" /> : null}
      <Orbit className="size-3.5" strokeWidth={1.5} aria-hidden />
      <span>{mission.label}</span>
      <span className="font-mono text-ink-faint tabular">
        {mission.gravityG === 0 ? "0 g" : `${mission.gravityG.toFixed(2)} g`}
      </span>
    </span>
  );
}
