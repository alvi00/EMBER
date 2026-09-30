import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { CATEGORY_META } from "@/components/ember/badges";
import { findings, getExperiment, getSource } from "@/lib/data";
import { shortSourceLabel } from "@/lib/catalog";
import { truncate } from "@/lib/text";

export const runtime = "nodejs";

const FONT_DIR = join(process.cwd(), "src/assets/fonts");
let fonts: Promise<[Buffer, Buffer]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, "InstrumentSerif-Regular.ttf")),
    readFile(join(FONT_DIR, "Geist-Regular.ttf")),
  ]);
  return fonts;
}

/** Every finding's card is rendered once at build time; unknown ids fall through to a 404 at request time. */
export function generateStaticParams() {
  return findings.map((f) => ({ id: f.id }));
}

/**
 * GET /api/share/<findingId> → a 1200×630 PNG of one insight, for sharing (project.md Phase 11 stretch). The card
 * shows the finding's exact plain-language text, its review status (AI draft or verified) and the NASA source it
 * cites, so the image never travels without its provenance.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/share/[id]">) {
  const { id } = await ctx.params;
  const f = findings.find((x) => x.id === id);
  if (!f) return Response.json({ error: "Unknown finding." }, { status: 404 });
  const [serif, sans] = await loadFonts();
  const exp = getExperiment(f.experimentId);
  const ev = f.evidence[0];
  const src = getSource(ev.sourceId);
  const cite = `${src ? shortSourceLabel(src) : ev.sourceId}${ev.page ? `, p.${ev.page}` : ""}`;
  const verified = f.status === "verified";
  const text = truncate(f.plainLanguage, 220);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#05060A",
        color: "#E8EAF0",
        padding: "60px 72px",
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: -120,
          top: -120,
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle closest-side, rgba(255,209,102,0.35) 0%, rgba(123,97,255,0.18) 45%, rgba(5,6,10,0) 100%)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22 }}>
        <div
          style={{
            display: "flex",
            width: 30,
            height: 30,
            borderRadius: 9999,
            border: "3px solid #7B61FF",
            background:
              "radial-gradient(circle at 50% 54%, #FFD166 0%, rgba(123,97,255,0.9) 40%, rgba(76,201,240,0) 100%)",
          }}
        />
        <div style={{ display: "flex", letterSpacing: 6 }}>EMBER</div>
        <div style={{ display: "flex", marginLeft: 16, color: "#A7ADBD" }}>{CATEGORY_META[f.category].label}</div>
        <div style={{ display: "flex", color: "#A7ADBD" }}>· {exp?.acronym ?? f.experimentId}</div>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Instrument Serif",
          fontSize: 58,
          lineHeight: 1.12,
          letterSpacing: -0.5,
          maxWidth: 1040,
        }}
      >
        {text}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          fontSize: 22,
          color: "#A7ADBD",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", color: "#E8EAF0" }}>Source: {cite}</div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "4px 14px",
              borderRadius: 9999,
              border: `2px solid ${verified ? "rgba(52,199,123,0.6)" : "rgba(165,148,255,0.6)"}`,
              color: verified ? "#34C77B" : "#A594FF",
              fontSize: 20,
            }}
          >
            {verified ? "Human-verified finding" : "AI draft, pending human review"}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 18, color: "#7A8094" }}>
          Research exploration tool · not an official NASA product
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Geist", data: sans, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: serif, style: "normal", weight: 400 },
      ],
      headers: { "cache-control": "public, max-age=3600" },
    },
  );
}
