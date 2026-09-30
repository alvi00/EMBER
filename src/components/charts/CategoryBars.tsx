"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORY_META } from "@/components/ember/badges";
import type { FindingCategory } from "@/lib/schema";

export type CategoryDatum = { category: FindingCategory; count: number; total: number };

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: CategoryDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-line-strong bg-elev-3 px-3 py-2 text-xs text-ink shadow-lg">
      <p className="font-medium">{CATEGORY_META[d.category].label}</p>
      <p className="mt-1 font-mono text-ink-muted tabular">
        {d.count} relevant of {d.total} findings
      </p>
    </div>
  );
}

/** Findings by category (one series → one colour). Counts findings the mission rates ≥ 2 of 3 for relevance. */
export function CategoryBars({ data }: { data: CategoryDatum[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count || b.total - a.total);
  const height = rows.length * 30 + 8;
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Findings by category for the selected mission">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="category"
              width={128}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickFormatter={(c: FindingCategory) => CATEGORY_META[c].label}
            />
            <Tooltip content={<TooltipBody />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="count" fill="var(--viz-micro)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="count" position="right" style={{ fill: "var(--text)", fontSize: 12, fontFamily: "var(--font-geist-mono)" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Findings by category</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Relevant findings</th>
            <th>All findings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <td>{CATEGORY_META[r.category].label}</td>
              <td>{r.count}</td>
              <td>{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
