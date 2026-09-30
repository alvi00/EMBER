/**
 * Shared, non-React state for the flame (project.md §8). The gravity slider and the scroll timeline write `target`;
 * the render loop eases `gravity` toward it. Keeping this outside React avoids re-renders on every frame.
 */
type Listener = (g: number) => void;

export const GRAVITY_PRESETS = [
  { id: "space", label: "Space", g: 0 },
  { id: "moon", label: "Moon", g: 0.166 },
  { id: "mars", label: "Mars", g: 0.38 },
  { id: "earth", label: "Earth", g: 1 },
] as const;

export function describeGravity(g: number): string {
  const nearest = GRAVITY_PRESETS.reduce((a, b) => (Math.abs(b.g - g) < Math.abs(a.g - g) ? b : a));
  const value = g === 0 ? "0 g" : `${g.toFixed(2)} g`;
  return Math.abs(nearest.g - g) < 0.02 ? `${nearest.label}, ${value}` : value;
}

export const flameState = {
  /** Eased value the shader uses. */
  gravity: 1,
  /** Value requested by the slider or the scroll timeline. */
  target: 1,
  listeners: new Set<Listener>(),
  setTarget(g: number) {
    const clamped = Math.min(1, Math.max(0, g));
    this.target = clamped;
    this.listeners.forEach((l) => l(clamped));
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  },
};
