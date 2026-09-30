import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { FindingSchema, type Finding } from "@/lib/schema";
import { rejectCrossSite } from "@/lib/same-origin";

/**
 * DEV ONLY — records a human review decision in data/processed/findings.json.
 * Blocked in production by src/proxy.ts and by the NODE_ENV check below.
 * Claude Code never calls this; only a human reviewer using /review does.
 */
const FINDINGS_PATH = path.join(process.cwd(), "data", "processed", "findings.json");

const BodySchema = z.object({
  id: z.string().min(1),
  action: z.enum(["verify", "edit-verify", "reject", "reset"]),
  reviewer: z.string().trim().min(2, "Enter your name before reviewing"),
  patch: FindingSchema.pick({
    statement: true,
    plainLanguage: true,
    safetyImplication: true,
    category: true,
    severity: true,
    actionability: true,
    evidenceStrength: true,
    confidence: true,
    missionRelevance: true,
  })
    .partial()
    .optional(),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const refused = rejectCrossSite(request);
  if (refused) return refused;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { id, action, reviewer, patch } = parsed.data;
  const findings: Finding[] = JSON.parse(await readFile(FINDINGS_PATH, "utf8"));
  const index = findings.findIndex((f) => f.id === id);
  if (index === -1) return NextResponse.json({ error: `Unknown finding ${id}` }, { status: 404 });

  const current = findings[index];
  let next: Finding;
  if (action === "reset") {
    next = { ...current, status: "ai-draft" };
    delete next.reviewer;
  } else {
    next = {
      ...current,
      ...(action === "edit-verify" ? patch : {}),
      status: action === "reject" ? "rejected" : "verified",
      reviewer,
    };
  }
  const checked = FindingSchema.safeParse(next);
  if (!checked.success) {
    return NextResponse.json({ error: checked.error.issues[0]?.message ?? "Invalid finding" }, { status: 400 });
  }
  findings[index] = checked.data;
  await writeFile(FINDINGS_PATH, JSON.stringify(findings, null, 1) + "\n", "utf8");
  return NextResponse.json({ finding: checked.data });
}
