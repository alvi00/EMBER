import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Ask the Flame",
  description: "Ask questions answered only from the NASA evidence base, with citations.",
};

export default function Page() {
  return <PageHeader eyebrow="Copilot" title="Ask the Flame" description="Ask questions answered only from the NASA evidence base, with citations." />;
}
