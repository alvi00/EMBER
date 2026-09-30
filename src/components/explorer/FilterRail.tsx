"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  CATEGORY_LABEL,
  FACILITY_GROUPS,
  FUEL_GROUPS,
  type ExplorerRow,
  type ExplorerState,
} from "@/lib/explorer";
import type { ExperimentCategory } from "@/lib/schema";
import { cn } from "@/lib/utils";

export type Bounds = {
  yr: [number, number];
  o2: [number, number];
  p: [number, number];
  flow: [number, number];
};

function CheckList({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: { id: string; label: string; count: number }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-ink">{legend}</legend>
      <ul className="mt-2 space-y-0.5">
        {options.map((o) => {
          const checked = selected.includes(o.id);
          return (
            <li key={o.id}>
              <label
                className={cn(
                  "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm transition-colors hover:bg-white/[0.04]",
                  o.count === 0 && !checked && "opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(o.id)}
                  className="size-4 rounded border-line-strong accent-[var(--flame-micro)]"
                />
                <span className={cn("flex-1", checked ? "text-ink" : "text-ink-muted")}>{o.label}</span>
                <span className="font-mono text-xs text-ink-faint tabular">{o.count}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function RangeFilter({
  label,
  unit,
  bounds,
  value,
  step,
  onCommit,
}: {
  label: string;
  unit: string;
  bounds: [number, number];
  value?: [number, number];
  step: number;
  onCommit: (v: [number, number] | undefined) => void;
}) {
  const [local, setLocal] = useState<[number, number]>(value ?? bounds);
  // Re-sync when the committed value changes from outside (URL, reset). Keyed by content, not array identity.
  const syncKey = `${value?.join(",") ?? "any"}|${bounds.join(",")}`;
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncedKey !== syncKey) {
    setSyncedKey(syncKey);
    setLocal(value ?? bounds);
  }
  const fmt = (n: number) => (step < 1 ? n.toFixed(1) : String(Math.round(n)));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-ink" id={`rf-${label}`}>
          {label}
        </p>
        <p className="font-mono text-xs text-ink-muted tabular">
          {value ? `${fmt(local[0])}-${fmt(local[1])} ${unit}` : "Any"}
        </p>
      </div>
      <Slider
        className="mt-3"
        min={bounds[0]}
        max={bounds[1]}
        step={step}
        value={local}
        aria-labelledby={`rf-${label}`}
        onValueChange={(v) => setLocal([v[0], v[1]])}
        onValueCommit={(v) => onCommit(v[0] <= bounds[0] && v[1] >= bounds[1] ? undefined : [v[0], v[1]])}
      />
      {value ? (
        <button type="button" onClick={() => onCommit(undefined)} className="mt-1.5 text-[11px] text-flame-micro hover:underline">
          Reset {label.toLowerCase()}
        </button>
      ) : null}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 text-sm hover:bg-white/[0.04]">
      <span className={checked ? "text-ink" : "text-ink-muted"}>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--flame-micro)]"
      />
    </label>
  );
}

export function FilterRail({
  state,
  bounds,
  rows,
  onChange,
}: {
  state: ExplorerState;
  bounds: Bounds;
  rows: ExplorerRow[];
  onChange: (p: Partial<ExplorerState>) => void;
}) {
  const toggle = (key: "cat" | "plat" | "fuel" | "fac", id: string) => {
    const cur = state[key];
    onChange({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  const count = (pred: (r: ExplorerRow) => boolean) => rows.filter(pred).length;
  const platforms = Array.from(new Set(rows.map((r) => r.platform)));

  return (
    <div className="space-y-7">
      <CheckList
        legend="Category"
        options={(Object.keys(CATEGORY_LABEL) as ExperimentCategory[]).map((c) => ({
          id: c,
          label: CATEGORY_LABEL[c],
          count: count((r) => r.category.includes(c)),
        }))}
        selected={state.cat}
        onToggle={(id) => toggle("cat", id)}
      />
      <CheckList
        legend="Platform"
        options={platforms.map((p) => ({ id: p, label: p, count: count((r) => r.platform === p) }))}
        selected={state.plat}
        onToggle={(id) => toggle("plat", id)}
      />
      <CheckList
        legend="Fuel"
        options={FUEL_GROUPS.map((g) => ({ id: g.id, label: g.label, count: count((r) => r.fuelGroups.includes(g.id)) }))}
        selected={state.fuel}
        onToggle={(id) => toggle("fuel", id)}
      />
      <CheckList
        legend="Facility"
        options={FACILITY_GROUPS.map((g) => ({ id: g.id, label: g.label, count: count((r) => r.facilityGroup === g.id) }))}
        selected={state.fac}
        onToggle={(id) => toggle("fac", id)}
      />
      <RangeFilter label="Years" unit="" bounds={bounds.yr} value={state.yr} step={1} onCommit={(v) => onChange({ yr: v })} />
      <RangeFilter label="Oxygen" unit="% O2" bounds={bounds.o2} value={state.o2} step={0.5} onCommit={(v) => onChange({ o2: v })} />
      <RangeFilter label="Pressure" unit="kPa" bounds={bounds.p} value={state.p} step={1} onCommit={(v) => onChange({ p: v })} />
      <RangeFilter label="Flow" unit="cm/s" bounds={bounds.flow} value={state.flow} step={0.5} onCommit={(v) => onChange({ flow: v })} />
      <fieldset className="space-y-0.5">
        <legend className="mb-2 text-xs font-medium text-ink">Evidence</legend>
        <Toggle label="Has raw data in PSI" checked={state.raw} onChange={(v) => onChange({ raw: v })} />
        <Toggle label="Verified records only" checked={state.ver} onChange={(v) => onChange({ ver: v })} />
      </fieldset>
    </div>
  );
}
