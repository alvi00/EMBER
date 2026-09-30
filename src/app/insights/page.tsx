import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { T } from "@/components/ember/T";
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
      <PageHeader title={<T k="page.insights.title" />} description={<T k="page.insights.lead" />} />
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
