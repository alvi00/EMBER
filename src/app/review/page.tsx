import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { assertDevOnly } from "@/lib/dev-only";

export const metadata: Metadata = {
  title: "Finding review",
  robots: { index: false, follow: false },
};

export default function Page() {
  assertDevOnly();
  return <PageHeader eyebrow="Dev only" title="Finding review" />;
}
