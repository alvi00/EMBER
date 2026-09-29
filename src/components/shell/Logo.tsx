import { cn } from "@/lib/utils";

/** EMBER wordmark: a near-spherical microgravity flame glyph + name. Not a NASA mark. */
export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="ember-glyph-core" cx="50%" cy="54%" r="50%">
          <stop offset="0%" stopColor="#FFD166" />
          <stop offset="38%" stopColor="#7B61FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4CC9F0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ember-glyph-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4CC9F0" />
          <stop offset="55%" stopColor="#7B61FF" />
          <stop offset="100%" stopColor="#FF7A18" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#ember-glyph-core)" />
      <circle cx="16" cy="16" r="13" fill="none" stroke="url(#ember-glyph-ring)" strokeWidth="1.5" />
      <circle cx="16" cy="17" r="3.2" fill="#E8EAF0" opacity="0.9" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoGlyph />
      <span className="font-mono text-sm font-medium tracking-[0.28em] text-ink">EMBER</span>
    </span>
  );
}
