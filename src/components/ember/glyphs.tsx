/**
 * Custom EMBER glyphs (project.md §6.7): droplet flame, solid-sheet flame, gas-jet flame, smoke, suppression.
 * 24×24, 1.5px stroke, currentColor, so they sit alongside lucide icons at the same weight.
 */
type GlyphProps = React.SVGProps<SVGSVGElement> & { title?: string };

function Glyph({ title, children, ...props }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** A fuel droplet wrapped in a spherical microgravity flame. */
export function DropletFlameGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="8.25" strokeDasharray="2.2 2.2" />
      <circle cx="12" cy="12" r="5.25" />
      <path d="M12 9.2c1.2 1.4 1.8 2.3 1.8 3.1a1.8 1.8 0 0 1-3.6 0c0-.8.6-1.7 1.8-3.1Z" />
    </Glyph>
  );
}

/** A thin solid sheet with a flame front creeping along it. */
export function SheetFlameGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 18.5h17" />
      <path d="M3.5 15.5h9" strokeOpacity="0.55" />
      <path d="M12.5 15.5c0-3.2 2.1-4.6 2.6-7.5 1.6 1.5 3.4 3.8 3.4 5.9a3 3 0 0 1-3 3" />
      <path d="M15.2 15.9c-.9-.4-1.2-1.3-.9-2.3.4.5 1 .8 1.5.8" />
    </Glyph>
  );
}

/** A gas jet from a nozzle with a lifted diffusion flame. */
export function GasJetFlameGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M10 21v-4h4v4" />
      <path d="M12 15c-2.6-1.6-3.4-3.9-2.6-6.4.6-1.8 1.9-3.3 2.6-5.6.7 2.3 2 3.8 2.6 5.6.8 2.5 0 4.8-2.6 6.4Z" />
      <path d="M12 12.4c-.9-.6-1.1-1.5-.8-2.4.2-.6.5-1 .8-1.6.3.6.6 1 .8 1.6.3.9.1 1.8-.8 2.4Z" />
    </Glyph>
  );
}

/** Smoke drifting from a smouldering source. */
export function SmokeGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5 20.5h14" />
      <path d="M9 17.5c-1.8-1.3-1.8-3.2 0-4.5s1.8-3.2 0-4.5" />
      <path d="M13 17.5c-1.8-1.3-1.8-3.2 0-4.5s1.8-3.2 0-4.5S11.2 5.3 13 4" />
      <path d="M17 17.5c-1.4-1-1.4-2.5 0-3.5" />
    </Glyph>
  );
}

/** Suppression: a flame crossed by an inert-gas stream. */
export function SuppressionGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M11 20c-3 0-5-2.1-5-4.8 0-2.8 2.2-4.5 3.4-7.7 1.9 1.6 3.6 3.9 3.6 6.4" strokeOpacity="0.6" />
      <path d="M3.5 6.5h8" />
      <path d="M3.5 10h11" />
      <path d="M13.5 13.5h7" />
      <path d="M15.5 17h5" />
    </Glyph>
  );
}
