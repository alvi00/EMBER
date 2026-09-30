"use client";

import { useEffect, useId, useState } from "react";
import { describeGravity, flameState, GRAVITY_PRESETS } from "@/components/three/flame-state";
import { cn } from "@/lib/utils";

/**
 * A real <input type="range">. Presets are spaced evenly along the track (Space, Moon, Mars, Earth) with a
 * piecewise-linear mapping, because 0.17 g and 0.38 g would otherwise crowd the left edge.
 */
const STOPS = GRAVITY_PRESETS.map((p, i) => ({ ...p, t: i / (GRAVITY_PRESETS.length - 1) }));

function tToG(t: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1];
    const b = STOPS[i];
    if (t <= b.t) return a.g + ((t - a.t) / (b.t - a.t)) * (b.g - a.g);
  }
  return 1;
}

function gToT(g: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1];
    const b = STOPS[i];
    if (g <= b.g) return a.t + ((g - a.g) / (b.g - a.g)) * (b.t - a.t);
  }
  return 1;
}

export function GravitySlider({ className }: { className?: string }) {
  const id = useId();
  const [t, setT] = useState(() => gToT(flameState.target));

  useEffect(() => flameState.subscribe((g) => setT(gToT(g))), []);

  const g = tToG(t);
  const set = (next: number) => {
    setT(next);
    flameState.setTarget(tToG(next));
  };

  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs text-ink-muted">
          Gravity
        </label>
        <output htmlFor={id} className="font-mono text-xs text-ink tabular" aria-live="polite">
          {describeGravity(g)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={t}
        onChange={(e) => set(Number(e.target.value))}
        aria-valuetext={describeGravity(g)}
        className="gravity-range mt-2 w-full"
      />
      <div className="relative mt-1 h-7">
        {STOPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => set(s.t)}
            aria-label={`Set gravity to ${s.label}, ${s.g === 0 ? "0 g" : `${s.g.toFixed(2)} g`}`}
            className={cn(
              "absolute top-0 -translate-x-1/2 rounded-full px-2 py-1 text-2xs transition-colors",
              Math.abs(s.t - t) < 0.02 ? "text-ink" : "text-ink-muted hover:text-ink",
              s.t === 0 && "translate-x-0",
              s.t === 1 && "-translate-x-full",
            )}
            style={{ left: `${s.t * 100}%` }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
