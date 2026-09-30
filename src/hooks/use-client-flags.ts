"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** True after hydration, false on the server and during hydration, without a setState-in-effect round trip. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * The visitor's reduced-motion preference, live. `serverValue` is used on the server and during hydration, so pass
 * `true` for decoration that should only appear once the client has confirmed motion is welcome.
 */
export function usePrefersReducedMotion(serverValue = true): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => serverValue,
  );
}
