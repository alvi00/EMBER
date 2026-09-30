import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the EMBER glyph (a near-spherical microgravity flame) on the canvas colour. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#05060A" }}>
        <div
          style={{
            width: 136,
            height: 136,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "7px solid #7B61FF",
            background: "radial-gradient(circle at 50% 54%, #FFD166 0%, rgba(123,97,255,0.9) 38%, rgba(76,201,240,0) 100%)",
          }}
        >
          <div style={{ width: 34, height: 34, marginTop: 8, borderRadius: 9999, background: "rgba(232,234,240,0.92)" }} />
        </div>
      </div>
    ),
    size,
  );
}
