import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Explorer } from "@/components/explorer/Explorer";
import { SkeletonLines } from "@/components/ember/states";
import { experiments, findings, measurements } from "@/lib/data";
import { FUEL_GROUPS, facilityGroupOf, type ExplorerRow } from "@/lib/explorer";
import { tidy } from "@/lib/text";

// Rendered per request so URL state (?mission=, filters) is server-rendered instead of bailing out to the client.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experiments",
  description:
    "Every NASA microgravity combustion investigation in the EMBER dataset, filterable by category, platform, fuel, facility, years and test conditions.",
};

function rows(): ExplorerRow[] {
  return experiments.map((e) => {
    const fuelsText = [...e.fuels, e.summaryPlain].join(" ");
    const fs = findings.filter((f) => f.experimentId === e.id);
    return {
      id: e.id,
      acronym: tidy(e.acronym),
      fullName: tidy(e.fullName),
      platform: e.platform,
      facility: e.facility,
      category: e.category,
      start: e.years.start,
      end: e.years.end ?? e.years.start,
      fuels: e.fuels,
      fuelGroups: FUEL_GROUPS.filter((g) => g.test.test(fuelsText) || (g.id === "liquid" && e.category.includes("droplet"))).map((g) => g.id),
      facilityGroup: facilityGroupOf(e),
      o2: e.conditions.o2Percent,
      pressure: e.conditions.pressureKpa,
      flow: e.conditions.flowCmS,
      summary: e.summaryPlain,
      objectives: e.objectives,
      hasRawData: e.hasRawData,
      verified: e.verified,
      kind: e.kind,
      findings: fs.length,
      verifiedFindings: fs.filter((f) => f.status === "verified").length,
      testPoints: measurements.filter((m) => m.experimentId === e.id).length,
      sources: e.sourceIds.length,
    };
  });
}

function bounds(list: ExplorerRow[]) {
  const span = (vals: number[], pad = 0): [number, number] => [Math.floor(Math.min(...vals) - pad), Math.ceil(Math.max(...vals) + pad)];
  return {
    yr: span(list.flatMap((r) => [r.start, r.end])),
    o2: span(list.flatMap((r) => (r.o2 ? [r.o2.min, r.o2.max] : []))),
    p: span(list.flatMap((r) => (r.pressure ? [r.pressure.min, r.pressure.max] : []))),
    flow: span(list.flatMap((r) => (r.flow ? [r.flow.min, r.flow.max] : []))),
  };
}

export default function ExperimentsPage() {
  const list = rows();
  return (
    <>
      <PageHeader
        title="Experiments"
        description={`${list.length} NASA investigations, from droplets on the ISS to metre-long fires inside Cygnus. Search reads their source documents too.`}
      />
      <Suspense
        fallback={
          <div className="container-ember">
            <SkeletonLines lines={6} />
          </div>
        }
      >
        <Explorer rows={list} bounds={bounds(list)} />
      </Suspense>
    </>
  );
}
