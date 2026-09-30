import { cn } from "@/lib/utils";

/**
 * Double-bezel surface: a hairline outer shell holding an inner core with its own top highlight.
 * Used for hero panels and key tiles; plain `.surface` is used for dense data.
 */
export function Bezel({
  children,
  className,
  innerClassName,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[1.5rem] border border-line bg-white/[0.02] p-1.5", className)} {...rest}>
      <div
        className={cn(
          "relative h-full rounded-[calc(1.5rem-0.375rem)] bg-elev-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
