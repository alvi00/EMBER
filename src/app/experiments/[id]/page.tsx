import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";

export async function generateMetadata(props: PageProps<"/experiments/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: id.toUpperCase() };
}

export default async function Page(props: PageProps<"/experiments/[id]">) {
  const { id } = await props.params;
  return <PageHeader eyebrow="Experiment" title={id.toUpperCase()} />;
}
