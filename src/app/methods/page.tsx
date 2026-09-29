import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Methods",
  description: "Data sources, extraction and verification protocol, scoring, coverage and limitations.",
};

export default function Page() {
  return <PageHeader eyebrow="Methods" title="Methods & sources" description="Data sources, extraction and verification protocol, scoring, coverage and limitations." />;
}
