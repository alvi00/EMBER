import { z } from "zod";
import { answerQuestion } from "@/lib/ai/answer";
import { flaggedSentences, segmentAnswer, usedAliases } from "@/lib/ai/citations";
import { MissionIdSchema } from "@/lib/schema";
import { providerStatus } from "@/lib/ai/provider";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const BodySchema = z.object({
  question: z.string().trim().min(3, "Ask a longer question.").max(500, "Keep questions under 500 characters."),
  mission: MissionIdSchema.default("lunar"),
  experimentId: z.string().max(80).optional(),
});

/**
 * POST /api/ask → newline-delimited JSON stream:
 *   {"type":"meta", ...AskMeta}   aliases, mode (ai | offline-precomputed | offline-retrieval | refusal), confidence
 *   {"type":"delta","text":"…"}   answer text as it streams ([[S#]] citation markers included)
 *   {"type":"done","invalid":[],"flagged":[],"used":[]}  citation validation of the full answer
 * Keys stay on the server; the client only ever sees answer text and chunk ids.
 */
export async function POST(request: Request) {
  // The limiter protects the provider quota, so it only applies when a model is connected.
  const limit = providerStatus().available ? rateLimit(`ask:${clientKey(request)}`) : { ok: true, retryAfter: 0 };
  if (!limit.ok) {
    return Response.json({ error: "Too many questions at once. Try again shortly." }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });
  }
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request.";
    return Response.json({ error: message ?? "Invalid request." }, { status: 400 });
  }

  const forceOffline = new URL(request.url).searchParams.get("offline") === "1";
  const { meta, stream } = await answerQuestion(body.question, body.mission, { experimentId: body.experimentId, forceOffline });
  const encoder = new TextEncoder();
  const line = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);

  // Set when the client disconnects (navigated away, new question): stop reading the model stream and stop writing.
  let cancelled = false;
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        if (!cancelled) controller.enqueue(line(obj));
      };
      send({ type: "meta", ...meta });
      let full = "";
      try {
        for await (const text of stream) {
          if (cancelled) break;
          full += text;
          send({ type: "delta", text });
        }
        const { invalid } = segmentAnswer(full, meta.aliases);
        send({ type: "done", invalid, flagged: flaggedSentences(full, meta.aliases), used: usedAliases(full, meta.aliases) });
      } catch (err) {
        if (!cancelled) {
          console.warn("EMBER ask: stream interrupted.", (err as Error).message);
          send({ type: "error", message: "The answer stream was interrupted. Try asking again." });
        }
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(readable, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}
