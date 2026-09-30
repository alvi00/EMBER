import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { T } from "@/components/ember/T";
import { MissionControl } from "@/components/dashboard/MissionControl";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { datasetStats, findings } from "@/lib/data";
import { coverageCells, timelineRows, unplacedMeasurements } from "@/lib/dashboard";
import { precomputedDigests } from "@/lib/ai/precomputed";
import { providerStatus } from "@/lib/ai/provider";

// Rendered per request so URL state (?mission=, filters) is server-rendered instead of bailing out to the client.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mission Control",
  description:
    "The state of microgravity fire-safety evidence for your mission: top-ranked insights, evidence coverage, investigations and an evidence digest.",
};

export default function DashboardPage() {
  const stats = datasetStats();
  return (
    <>
      <PageHeader title={<T k="page.dashboard.title" />} description={<T k="page.dashboard.lead" />} />
      <Suspense fallback={<DashboardSkeleton />}>
        <MissionControl
          findings={findings}
          timeline={timelineRows()}
          coverage={coverageCells()}
          unplaced={unplacedMeasurements()}
          stats={{
            investigations: stats.investigations,
            flight: stats.flightInvestigations,
            ground: stats.groundInvestigations,
            sources: stats.sources,
            testPoints: stats.testPoints,
          }}
          digests={precomputedDigests()}
          aiAvailable={providerStatus().available}
        />
      </Suspense>
    </>
  );
}
