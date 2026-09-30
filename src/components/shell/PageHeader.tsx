import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("container-ember pt-12 pb-8 md:pt-16 md:pb-10", className)}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[1.02] tracking-tight text-balance text-ink md:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-pretty text-ink-muted md:text-lg">{description}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
}
