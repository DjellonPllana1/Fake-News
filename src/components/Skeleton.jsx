export function SkeletonBlock({ className = "" }) {
  return <div className={`shimmer-block ${className}`.trim()} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  return (
    <div className="page-grid">
      <section className="surface-card space-y-6">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="h-14 w-3/4" />
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-5 w-2/3" />
        <div className="three-column-grid">
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
        </div>
      </section>

      <section className="stats-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-40" />
        ))}
      </section>

      <div className="two-column-grid">
        <SkeletonBlock className="h-[360px]" />
        <SkeletonBlock className="h-[360px]" />
      </div>

      <div className="two-column-grid">
        <SkeletonBlock className="h-[320px]" />
        <SkeletonBlock className="h-[320px]" />
      </div>
    </div>
  );
}

export function SplitPageSkeleton() {
  return (
    <div className="page-grid-wide">
      <SkeletonBlock className="min-h-[680px]" />
      <SkeletonBlock className="min-h-[680px]" />
    </div>
  );
}

export function ListPageSkeleton({ items = 4 }) {
  return (
    <div className="page-grid">
      {Array.from({ length: items }).map((_, index) => (
        <article key={index} className="surface-card space-y-5">
          <SkeletonBlock className="h-7 w-1/2" />
          <SkeletonBlock className="h-5 w-3/4" />
          <div className="four-column-grid">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
          <SkeletonBlock className="h-16" />
        </article>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-6 w-40" />
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock key={index} className="h-14" />
      ))}
    </div>
  );
}
