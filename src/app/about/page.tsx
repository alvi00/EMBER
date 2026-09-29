import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "About",
  description: "Who built EMBER, for which challenge, and what it is not.",
};

export default function Page() {
  return <PageHeader eyebrow="About" title="About EMBER" description="Who built EMBER, for which challenge, and what it is not." />;
}
