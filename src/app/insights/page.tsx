import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Insights",
  description: "Findings ranked by a transparent, adjustable Insight Score for your mission.",
};

export default function Page() {
  return <PageHeader eyebrow="Insights" title="Ranked insights" description="Findings ranked by a transparent, adjustable Insight Score for your mission." />;
}
