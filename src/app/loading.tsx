export default function Loading() {
  return (
    <div className="container-ember py-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-3 w-24 animate-pulse rounded-full bg-elev-2" />
      <div className="mt-5 h-12 w-2/3 max-w-xl animate-pulse rounded-2xl bg-elev-2" />
      <div className="mt-4 h-4 w-1/2 max-w-md animate-pulse rounded-full bg-elev-1" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface h-40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
