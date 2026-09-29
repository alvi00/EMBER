import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Experiments",
  description: "Every NASA microgravity combustion investigation in the dataset, filterable by fuel, platform and test conditions.",
};

export default function Page() {
  return <PageHeader eyebrow="Explorer" title="Experiment explorer" description="Every NASA microgravity combustion investigation in the dataset, filterable by fuel, platform and test conditions." />;
}
