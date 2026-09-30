import { z } from "zod";
import { generateDigest } from "@/lib/ai/digest";
import { precomputedDigest } from "@/lib/ai/precomputed";
import { MissionIdSchema, type MissionId } from "@/lib/schema";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rejectCrossSite } from "@/lib/same-origin";

export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store" };

function saved(mission: MissionId) {
  const d = precomputedDigest(mission);
  if (!d) return Response.json({ mode: "none" }, { headers: NO_STORE });
  const aliases = Object.fromEntries(d.citations.map((c, i) => [`S${i + 1}`, c]));
  return Response.json(
    { mode: "precomputed", text: d.answer, aliases, generatedBy: d.generatedBy, generatedAt: d.generatedAt },
    { headers: NO_STORE },
  );
}

/** GET /api/summarize?mission=<id> → the saved Mission Control digest (instant, works offline). */
export async function GET(request: Request) {
  const mission = MissionIdSchema.safeParse(new URL(request.url).searchParams.get("mission") ?? "lunar");
  if (!mission.success) return Response.json({ error: "Unknown mission." }, { status: 400 });
  return saved(mission.data);
}

/**
 * POST /api/summarize {mission} → a fresh digest from the configured model. POST (not GET) because it spends provider
 * quota: same-origin JSON only, rate-limited, and it falls back to the saved digest if no model answers.
 */
export async function POST(request: Request) {
  const refused = rejectCrossSite(request);
  if (refused) return refused;
  const body = z.object({ mission: MissionIdSchema }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Unknown mission." }, { status: 400 });
  const limit = rateLimit(`summarize:${clientKey(request)}`, 6);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many digest requests. Try again shortly." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }
  try {
    const live = await generateDigest(body.data.mission);
    if (live) {
      return Response.json(
        {
          mode: "ai",
          text: live.text,
          aliases: live.aliases,
          generatedBy: live.generatedBy,
          generatedAt: new Date().toISOString(),
        },
        { headers: NO_STORE },
      );
    }
  } catch (err) {
    console.warn("EMBER summarize: model call failed, serving the saved digest.", (err as Error).message);
  }
  return saved(body.data.mission);
}
