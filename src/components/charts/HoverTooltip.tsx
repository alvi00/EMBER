"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TooltipState = { x: number; y: number; content: React.ReactNode } | null;

/**
 * Minimal hover/focus tooltip for hand-built SVG/HTML charts. Marks call `show(event, content)` on pointer
 * enter / focus and `hide()` on leave / blur; the tooltip is positioned relative to the chart container.
 */
export function useHoverTooltip() {
  const container = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TooltipState>(null);

  const show = useCallback((target: Element, content: React.ReactNode) => {
    const box = container.current?.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    if (!box) return;
    setTip({ x: r.left - box.left + r.width / 2, y: r.top - box.top, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  return { container, tip, show, hide };
}

export function HoverTooltip({ tip, className }: { tip: TooltipState; className?: string }) {
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-20 max-w-64 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-line-strong bg-elev-3 px-3 py-2 text-xs text-ink shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]",
        className,
      )}
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.content}
    </div>
  );
}
