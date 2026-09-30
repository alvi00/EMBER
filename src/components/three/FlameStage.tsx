"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { flameState, GRAVITY_PRESETS } from "@/components/three/flame-state";
import { GravitySlider } from "@/components/three/GravitySlider";
import { cn } from "@/lib/utils";

const FlameScene = dynamic(() => import("@/components/three/FlameScene"), { ssr: false });

type Mode = "pending" | "webgl" | "poster";

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

function lowPower(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (
    (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2 || Boolean(nav.connection?.saveData)
  );
}

function nearestPreset(g: number) {
  return GRAVITY_PRESETS.reduce((a, b) => (Math.abs(b.g - g) < Math.abs(a.g - g) ? b : a));
}

/** Poster frames rendered from the live scene with Playwright (public/flame/poster-*.webp). */
function Poster({ gravity }: { gravity: number }) {
  const preset = nearestPreset(gravity);
  return (
    <div aria-hidden className="absolute inset-0">
      {GRAVITY_PRESETS.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.id}
          src={`/flame/poster-${p.id}.webp`}
          alt=""
          width={551}
          height={769}
          loading={p.id === "earth" ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-150",
            p.id === preset.id ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </div>
  );
}

/**
 * The flame + its instrument panel. Picks WebGL or a static poster (reduced motion, no WebGL, low-power devices),
 * and pauses rendering while off-screen.
 */
export function FlameStage({ className, initialGravity = 1 }: { className?: string; initialGravity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [visible, setVisible] = useState(true);
  const [posterG, setPosterG] = useState(initialGravity);

  useEffect(() => {
    flameState.setTarget(initialGravity);
    flameState.gravity = initialGravity;
  }, [initialGravity]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMode(!reduce.matches && supportsWebGL() && !lowPower() ? "webgl" : "poster");
    decide();
    reduce.addEventListener("change", decide);
    return () => reduce.removeEventListener("change", decide);
  }, []);

  useEffect(() => flameState.subscribe((g) => setPosterG(g)), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative flex flex-col", className)}>
      <div className="relative min-h-0 flex-1">
        {/* soft radial backdrop so the flame reads as light in a dark cabin */}
        {mode !== "poster" ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[10%] top-[18%] bottom-[22%] rounded-full bg-[radial-gradient(closest-side,rgba(123,97,255,0.12),transparent)]"
          />
        ) : null}
        {mode === "webgl" ? <FlameScene active={visible} /> : null}
        {mode === "poster" ? <Poster gravity={posterG} /> : null}
      </div>
      <div className="relative z-10 px-2 pb-2">
        <GravitySlider />
        <p className="mt-3 text-center text-2xs text-ink-muted">
          Artistic visualization. Trends match the literature; this is not a simulation.
        </p>
      </div>
    </div>
  );
}
