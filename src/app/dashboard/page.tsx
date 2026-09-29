import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "The state of microgravity fire-safety evidence for your chosen mission, at a glance.",
};

export default function Page() {
  return <PageHeader eyebrow="Dashboard" title="Mission Control" description="The state of microgravity fire-safety evidence for your chosen mission, at a glance." />;
}
