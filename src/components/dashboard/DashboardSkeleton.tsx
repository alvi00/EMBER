/** Layout-matching skeleton for Mission Control (shown while the mission is resolved on the client). */
export function DashboardSkeleton() {
  return (
    <div className="container-ember pb-16" aria-busy="true">
      <span className="sr-only">Loading Mission Control…</span>
      <div className="h-4 w-2/3 max-w-xl animate-pulse rounded-full bg-elev-2" />
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[1.25rem] border border-line sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse bg-elev-1" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
        <div className="h-[34rem] animate-pulse rounded-[1.25rem] border border-line bg-elev-1 md:col-span-6 xl:col-span-7" />
        <div className="h-[34rem] animate-pulse rounded-[1.25rem] border border-line bg-elev-1 md:col-span-6 xl:col-span-5" />
      </div>
    </div>
  );
}
