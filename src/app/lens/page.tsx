import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { T } from "@/components/ember/T";
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
      <PageHeader title={<T k="page.lens.title" />} description={<T k="page.lens.lead" />} />
      <LensView measurements={lensMeasurements} findings={findings} />
    </>
  );
}
