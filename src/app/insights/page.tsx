import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { InsightsView } from "@/components/insights/InsightsView";
import { SkeletonLines } from "@/components/ember/states";
import { findings } from "@/lib/data";

// Rendered per request so ?mission= and ?w= weights are server-rendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights",
  description: "Fire-safety findings ranked by a transparent, adjustable Insight Score for your mission.",
};

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        title="Ranked insights"
        description="Every finding scored by the same visible formula. Move the weights and watch the ranking change; open any source to check it."
      />
      <Suspense
        fallback={
          <div className="container-ember">
            <SkeletonLines lines={6} />
          </div>
        }
      >
        <InsightsView findings={findings} />
      </Suspense>
    </>
  );
}
