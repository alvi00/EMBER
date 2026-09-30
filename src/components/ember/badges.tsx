import {
  BadgeCheck,
  Flame,
  Layers,
  Maximize2,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  Sparkle,
  XCircle,
  Zap,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { DropletFlameGlyph, SheetFlameGlyph, SmokeGlyph, SuppressionGlyph } from "@/components/ember/glyphs";
import type { Finding, FindingCategory } from "@/lib/schema";
import { cn } from "@/lib/utils";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>;

const chip = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs leading-5 whitespace-nowrap";

/** Verified vs AI draft — status is always shown in words plus an icon (never colour alone). */
export function StatusBadge({ status, reviewer, className }: { status: Finding["status"]; reviewer?: string; className?: string }) {
  if (status === "verified") {
    return (
      <span className={cn(chip, "border-ok/35 bg-ok/10 text-ok", className)} title={reviewer ? `Verified by ${reviewer}` : "Verified by a human reviewer"}>
        <BadgeCheck className="size-3.5" strokeWidth={1.75} aria-hidden />
        Verified
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className={cn(chip, "border-danger/35 bg-danger/10 text-danger", className)}>
        <XCircle className="size-3.5" strokeWidth={1.75} aria-hidden />
        Rejected
      </span>
    );
  }
  return (
    <span
      className={cn(chip, "border-flame-violet/40 bg-flame-violet/10 text-flame-violet-text", className)}
      title="Drafted from the source text by AI. Pending human review."
    >
      <Sparkle className="size-3.5" strokeWidth={1.75} aria-hidden />
      AI draft, pending review
    </span>
  );
}

const CONFIDENCE: Record<Finding["confidence"], { label: string; icon: IconType; cls: string }> = {
  high: { label: "High confidence", icon: ShieldCheck, cls: "border-flame-micro/35 text-flame-micro" },
  medium: { label: "Medium confidence", icon: ShieldHalf, cls: "border-flame-core/35 text-flame-core" },
  low: { label: "Low confidence", icon: ShieldAlert, cls: "border-line-strong text-ink-muted" },
};

export function ConfidenceBadge({ confidence, className }: { confidence: Finding["confidence"]; className?: string }) {
  const c = CONFIDENCE[confidence];
  const Icon = c.icon;
  return (
    <span className={cn(chip, c.cls, className)}>
      <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
      {c.label}
    </span>
  );
}

/** Severity 1–5 as five ticks + number, tinted from amber to red. */
export function SeverityMeter({ value, className, label = "Severity" }: { value: number; className?: string; label?: string }) {
  const tone = value >= 5 ? "bg-danger" : value >= 4 ? "bg-flame-earth" : value >= 3 ? "bg-flame-core" : "bg-ink-faint";
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-ink-muted", className)}>
      <span className="sr-only">
        {label} {value} of 5
      </span>
      <span aria-hidden className="font-mono tabular">
        {label} {value}/5
      </span>
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-2.5 w-1.5 rounded-[2px]", i <= value ? tone : "bg-elev-3")} />
        ))}
      </span>
    </span>
  );
}

export const CATEGORY_META: Record<FindingCategory, { label: string; icon: IconType }> = {
  ignition: { label: "Ignition", icon: Zap },
  "flame-spread": { label: "Flame spread", icon: SheetFlameGlyph as IconType },
  extinction: { label: "Extinction", icon: PowerOff },
  suppression: { label: "Suppression", icon: SuppressionGlyph as IconType },
  "smoke-detection": { label: "Smoke & detection", icon: SmokeGlyph as IconType },
  materials: { label: "Materials", icon: Layers },
  "cool-flames": { label: "Cool flames", icon: DropletFlameGlyph as IconType },
  "scale-effects": { label: "Scale effects", icon: Maximize2 },
};

export function CategoryBadge({ category, className }: { category: FindingCategory; className?: string }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span className={cn(chip, "border-line-strong text-ink", className)}>
      <Icon className="size-3.5 text-ink-muted" strokeWidth={1.5} aria-hidden />
      {meta.label}
    </span>
  );
}

/** Outcome of a test point: colour + marker word. Blue = extinguished/safe side, amber = burned. */
export function OutcomeBadge({ outcome, className }: { outcome: string; className?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    burned: { label: "Burned", cls: "border-flame-earth/40 text-flame-earth" },
    "self-extinguished": { label: "Self-extinguished", cls: "border-flame-micro/40 text-flame-micro" },
    "no-ignition": { label: "No ignition", cls: "border-ok/40 text-ok" },
    "extinguished-by-agent": { label: "Extinguished by agent", cls: "border-flame-violet/40 text-flame-violet-text" },
  };
  const m = map[outcome] ?? { label: outcome, cls: "border-line-strong text-ink-muted" };
  return (
    <span className={cn(chip, m.cls, className)}>
      <Flame className="size-3.5" strokeWidth={1.5} aria-hidden />
      {m.label}
    </span>
  );
}
