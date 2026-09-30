import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/** Pill CTA with a nested "button-in-button" trailing icon. */
export function CtaLink({
  href,
  children,
  variant = "primary",
  className,
  icon: Icon = ArrowUpRight,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-medium transition-[transform,background-color,border-color] duration-300 active:scale-[0.98]",
        EASE,
        variant === "primary"
          ? "bg-ink text-canvas hover:bg-white"
          : "border border-line-strong bg-white/[0.03] text-ink hover:border-white/25 hover:bg-white/[0.06]",
        className,
      )}
    >
      <span className="whitespace-nowrap">{children}</span>
      <span
        aria-hidden
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105",
          EASE,
          variant === "primary" ? "bg-canvas/10" : "bg-white/[0.08]",
        )}
      >
        <Icon className="size-4" strokeWidth={1.5} />
      </span>
    </Link>
  );
}
