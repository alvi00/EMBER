import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Habitat Risk Lens",
  description: "How close your cabin conditions are to conditions NASA has actually tested.",
};

export default function Page() {
  return <PageHeader eyebrow="Risk Lens" title="Habitat Risk Lens" description="How close your cabin conditions are to conditions NASA has actually tested." />;
}
