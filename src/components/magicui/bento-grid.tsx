/**
 * Magic UI BentoGrid (fetched via the magicui MCP), re-themed to EMBER tokens:
 * cards accept arbitrary children (charts, lists) and an optional title / icon / CTA.
 */
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
  name: ReactNode;
  className?: string;
  Icon?: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  description?: ReactNode;
  href?: string;
  cta?: string;
  action?: ReactNode;
  children?: ReactNode;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div className={cn("grid w-full grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12", className)} {...props}>
      {children}
    </div>
  );
};

const BentoCard = ({ name, className, Icon, description, href, cta, action, children, ...props }: BentoCardProps) => (
  <section
    className={cn(
      "group relative flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-line bg-elev-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]",
      className,
    )}
    {...props}
  >
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
          {Icon ? <Icon className="size-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden /> : null}
          {name}
        </h2>
        {description ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </header>
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-5">{children}</div>
    {href && cta ? (
      <div className="border-t border-line px-5 py-3">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          {cta}
          <ArrowRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            strokeWidth={1.5}
            aria-hidden
          />
        </Link>
      </div>
    ) : null}
  </section>
);

export { BentoCard, BentoGrid };
