"use client";

import { useEffect, useState } from "react";

// Module state survives client navigations but is never set during server rendering.
let hasNavigated = false;

/**
 * Page transition (project.md Phase 10): templates remount on every navigation, so each client-side page change fades
 * and lifts in. The first load renders without the animation so the hero and LCP are never held back.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const [animate] = useState(() => hasNavigated);
  useEffect(() => {
    hasNavigated = true;
  }, []);
  return <div className={animate ? "page-enter" : undefined}>{children}</div>;
}
