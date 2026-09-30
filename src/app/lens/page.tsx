import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { LensView } from "@/components/lens/LensView";
import { SkeletonLines } from "@/components/ember/states";
import { findings, measurements } from "@/lib/data";

// Rendered per request so the cabin in the URL is server-rendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Habitat Risk Lens",
  description:
    "How close your cabin conditions are to conditions NASA actually tested: coverage verdict, nearest test points, flammability map and evidence gaps. Research exploration only.",
};

export default function LensPage() {
  return (
    <>
      <PageHeader
        title="Habitat Risk Lens"
        description="Set your cabin's gravity, oxygen, pressure and airflow. The Lens shows which NASA tests are closest, and where the evidence runs out."
      />
      <Suspense
        fallback={
          <div className="container-ember">
            <SkeletonLines lines={6} />
          </div>
        }
      >
        <LensView measurements={measurements} findings={findings} />
      </Suspense>
    </>
  );
}
