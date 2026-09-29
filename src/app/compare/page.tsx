import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Compare",
  description: "Put two or three investigations side by side.",
};

export default function Page() {
  return <PageHeader eyebrow="Compare" title="Compare experiments" description="Put two or three investigations side by side." />;
}
