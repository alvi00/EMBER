import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { datasetStats } from "@/lib/data";

export const alt = "EMBER: On Earth, fire rises. In space, it has nowhere to go. NASA microgravity fire-safety evidence, ranked for your mission.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card. Counts come from the processed dataset at build time. Instrument Serif is bundled under the OFL. */
export default async function OpengraphImage() {
  // Custom fonts replace next/og's default, so Geist (shipped with next/og) is loaded explicitly too.
  const [serif, serifItalic, sans] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/InstrumentSerif-Italic.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Geist-Regular.ttf")),
  ]);
  const s = datasetStats();
  const stats = [
    { value: s.investigations, label: "investigations" },
    { value: s.findings, label: "findings" },
    { value: s.testPoints, label: "test points" },
    { value: s.sources, label: "NASA sources" },
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#05060A",
          color: "#E8EAF0",
          padding: "64px 72px",
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: -40,
            top: 20,
            width: 600,
            height: 600,
            background:
              "radial-gradient(circle closest-side at 50% 55%, rgba(255,209,102,0.95) 0%, rgba(255,122,24,0.55) 20%, rgba(123,97,255,0.32) 46%, rgba(76,201,240,0.08) 70%, rgba(5,6,10,0) 100%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{ display: "flex", width: 40,
                height: 40,
                borderRadius: 9999,
                border: "3px solid #7B61FF",
                background: "radial-gradient(circle at 50% 54%, #FFD166 0%, rgba(123,97,255,0.9) 40%, rgba(76,201,240,0) 100%)",
              }}
            />
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 8 }}>EMBER</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 74, lineHeight: 1.02, letterSpacing: -1.5 }}>On Earth, fire rises.</div>
            <div style={{ display: "flex", fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 74, lineHeight: 1.08, color: "#A594FF" }}>
              In space, it has nowhere to go.
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 26, color: "#A7ADBD", lineHeight: 1.4 }}>
              NASA microgravity fire-safety evidence, ranked for your mission.
            </div>
          </div>
          <div style={{ display: "flex", gap: 44 }}>
            {stats.map((x) => (
              <div key={x.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 40, color: "#E8EAF0" }}>{x.value}</div>
                <div style={{ display: "flex", fontSize: 18, color: "#7A8094" }}>{x.label}</div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "flex-end", marginLeft: "auto", fontSize: 16, color: "#7A8094" }}>
              Not an official NASA product
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: sans, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: serif, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: serifItalic, style: "italic", weight: 400 },
      ],
    },
  );
}
