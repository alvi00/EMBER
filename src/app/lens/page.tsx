import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { LensView } from "@/components/lens/LensView";
import { findings, measurements } from "@/lib/data";
import type { Measurement } from "@/lib/schema";

// Rendered per request so the cabin in the URL is server-rendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Habitat Risk Lens",
  description:
    "How close your cabin conditions are to conditions NASA actually tested: coverage verdict, nearest test points, flammability map and evidence gaps. Research exploration only.",
};

// The Lens reads conditions, outcome and provenance only; notes and secondary measurements stay on the server, which
// keeps the serialised page payload small.
const lensMeasurements: Measurement[] = measurements.map((m) => ({
  id: m.id,
  experimentId: m.experimentId,
  testId: m.testId,
  fuel: m.fuel,
  fuelFamily: m.fuelFamily,
  geometry: m.geometry,
  o2Percent: m.o2Percent,
  pressureKpa: m.pressureKpa,
  flowCmS: m.flowCmS,
  gravityG: m.gravityG,
  outcome: m.outcome,
  rawOutcome: m.rawOutcome,
  sourceId: m.sourceId,
  page: m.page,
}));

export default function LensPage() {
  return (
    <>
      <PageHeader
        title="Habitat Risk Lens"
        description="Set your cabin's gravity, oxygen, pressure and airflow. The Lens shows which NASA tests are closest, and where the evidence runs out."
      />
      <LensView measurements={lensMeasurements} findings={findings} />
    </>
  );
}
