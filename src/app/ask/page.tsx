import type { Metadata } from "next";
import { Suspense } from "react";
import { AskClient } from "@/components/ask/AskClient";
import { PageHeader } from "@/components/shell/PageHeader";
import { SkeletonLines } from "@/components/ember/states";
import { providerStatus } from "@/lib/ai/provider";

// Per request: reads ?q= and ?mission=, and reports whether an AI provider is configured (never the key itself).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ask the Flame",
  description: "Questions answered only from NASA microgravity combustion records, with a citation after every claim and an honest refusal when the data is silent.",
};

export default function AskPage() {
  const { available, provider, modelId } = providerStatus();
  return (
    <>
      <PageHeader
        eyebrow="Evidence copilot"
        title="Ask the Flame"
        description="Questions answered only from NASA microgravity combustion records. Every claim cites its passage, and when the data is silent EMBER says so."
      />
      <Suspense
        fallback={
          <div className="container-ember">
            <SkeletonLines lines={4} className="max-w-3xl" />
          </div>
        }
      >
        <AskClient ai={{ available, provider, modelId }} />
      </Suspense>
    </>
  );
}
