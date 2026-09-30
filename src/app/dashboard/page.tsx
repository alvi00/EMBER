import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { MissionControl } from "@/components/dashboard/MissionControl";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { datasetStats, findings } from "@/lib/data";
import { coverageCells, timelineRows, unplacedMeasurements } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Mission Control",
  description:
    "The state of microgravity fire-safety evidence for your mission: top-ranked insights, evidence coverage, investigations and an evidence digest.",
};

export default function DashboardPage() {
  const stats = datasetStats();
  return (
    <>
      <PageHeader
        title="Mission Control"
        description="The state of NASA fire-safety evidence for one mission at a time, every number traceable to a source."
      />
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
        />
      </Suspense>
    </>
  );
}
