import { generateDigest } from "@/lib/ai/digest";
import { precomputedDigest } from "@/lib/ai/precomputed";
import { MissionIdSchema } from "@/lib/schema";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/summarize?mission=<id>[&fresh=1] → the Mission Control evidence digest.
 * Default: the precomputed digest (instant, works offline). `fresh=1` asks the configured model for a new one and
 * falls back to the precomputed digest if no provider is configured or the call fails.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mission = MissionIdSchema.safeParse(url.searchParams.get("mission") ?? "lunar");
  if (!mission.success) return Response.json({ error: "Unknown mission." }, { status: 400 });
  const saved = precomputedDigest(mission.data);

  if (url.searchParams.get("fresh") === "1") {
    const limit = rateLimit(`summarize:${clientKey(request)}`, 6);
    if (!limit.ok) {
      return Response.json({ error: "Too many digest requests. Try again shortly." }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });
    }
    try {
      const live = await generateDigest(mission.data);
      if (live) {
        return Response.json(
          { mode: "ai", text: live.text, aliases: live.aliases, generatedBy: live.generatedBy, generatedAt: new Date().toISOString() },
          { headers: { "cache-control": "no-store" } },
        );
      }
    } catch (err) {
      console.warn("EMBER summarize: model call failed, serving the saved digest.", (err as Error).message);
    }
  }

  if (!saved) return Response.json({ mode: "none" }, { headers: { "cache-control": "no-store" } });
  const savedAliases = Object.fromEntries(saved.citations.map((c, i) => [`S${i + 1}`, c]));
  return Response.json(
    { mode: "precomputed", text: saved.answer, aliases: savedAliases, generatedBy: saved.generatedBy, generatedAt: saved.generatedAt },
    { headers: { "cache-control": "no-store" } },
  );
}
