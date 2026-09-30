import Link from "next/link";
import { CircleAlert, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

type IconLike = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/** Zero dead ends: every empty state suggests a next action (project.md §2.5). */
export function EmptyState({
  title,
  body,
  action,
  className,
  icon: Icon = SearchX,
}: {
  title: string;
  body?: React.ReactNode;
  action?: { href?: string; label: string; onClick?: () => void };
  className?: string;
  icon?: IconLike;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line-strong p-6", className)}>
      <Icon className="size-5 text-ink-muted" strokeWidth={1.5} />
      <p className="text-sm font-medium text-ink">{title}</p>
      {body ? <p className="max-w-md text-sm text-ink-muted">{body}</p> : null}
      {action ? (
        action.href ? (
          <Link href={action.href} className="text-sm text-flame-micro underline-offset-4 hover:underline">
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="text-sm text-flame-micro underline-offset-4 hover:underline"
          >
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}

export function ErrorNotice({ title, body, className }: { title: string; body?: React.ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/[0.06] p-4", className)}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {body ? <p className="mt-1 text-sm text-ink-muted">{body}</p> : null}
      </div>
    </div>
  );
}

export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded-full bg-elev-3" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}
