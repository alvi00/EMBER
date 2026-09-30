import "server-only";
import type { LanguageModel } from "ai";

/**
 * Provider switch (project.md §10.1). `AI_PROVIDER` + the matching key in `.env.local` select the model; `AI_MODEL`
 * optionally overrides the default model id. Keys are read on the server only and never sent to the client.
 * No provider or no key → null → OFFLINE mode (precomputed answers / retrieval-only results).
 */
export type ProviderId = "google" | "groq" | "openai" | "anthropic";

const DEFAULT_MODEL: Record<ProviderId, string> = {
  groq: "openai/gpt-oss-120b",
  google: "gemini-2.5-flash",
  openai: "gpt-5-mini",
  anthropic: "claude-sonnet-5-5",
};

const KEY_ENV: Record<ProviderId, string> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  groq: "GROQ_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

export type ResolvedModel = { model: LanguageModel; provider: ProviderId; modelId: string };

export function providerStatus(): { provider: ProviderId | null; modelId: string | null; available: boolean } {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase() as ProviderId;
  if (!provider || !(provider in KEY_ENV)) return { provider: null, modelId: null, available: false };
  const key = process.env[KEY_ENV[provider]]?.trim();
  const modelId = process.env.AI_MODEL?.trim() || DEFAULT_MODEL[provider];
  return { provider, modelId, available: Boolean(key) };
}

export async function getModel(): Promise<ResolvedModel | null> {
  const { provider, modelId, available } = providerStatus();
  if (!provider || !modelId || !available) return null;
  const apiKey = process.env[KEY_ENV[provider]]!.trim();
  switch (provider) {
    case "groq": {
      const { createGroq } = await import("@ai-sdk/groq");
      return { model: createGroq({ apiKey })(modelId), provider, modelId };
    }
    case "google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      return { model: createGoogleGenerativeAI({ apiKey })(modelId), provider, modelId };
    }
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      return { model: createOpenAI({ apiKey })(modelId), provider, modelId };
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      return { model: createAnthropic({ apiKey })(modelId), provider, modelId };
    }
  }
}

/** Provider-specific options: keep reasoning short on Groq's gpt-oss models so answers stream quickly. */
export function providerOptions(provider: ProviderId, modelId: string) {
  if (provider === "groq" && modelId.includes("gpt-oss")) return { groq: { reasoningEffort: "low" } };
  return undefined;
}
