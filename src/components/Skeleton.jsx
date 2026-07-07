export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  return (
    <div className="page-grid dashboard-grid">
      <section className="panel dashboard-hero skeleton-panel">
        <div className="dashboard-hero__content">
          <SkeletonBlock className="skeleton-pill" />
          <SkeletonBlock className="skeleton-title skeleton-title--xl" />
          <SkeletonBlock className="skeleton-line" />
          <SkeletonBlock className="skeleton-line skeleton-line--short" />
        </div>
        <div className="dashboard-hero__summary">
          <SkeletonBlock className="skeleton-card" />
          <SkeletonBlock className="skeleton-card" />
          <SkeletonBlock className="skeleton-card" />
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonBlock key={index} className="skeleton-card skeleton-card--metric" />
        ))}
      </section>

      <SkeletonBlock className="panel skeleton-panel skeleton-panel--wide" />
      <SkeletonBlock className="panel skeleton-panel" />
      <SkeletonBlock className="panel skeleton-panel" />
      <SkeletonBlock className="panel skeleton-panel" />
      <SkeletonBlock className="panel skeleton-panel" />
    </div>
  );
}

export function SplitPageSkeleton() {
  return (
    <div className="page-grid page-grid--wide">
      <section className="panel skeleton-panel skeleton-panel--form" />
      <section className="panel skeleton-panel skeleton-panel--result" />
    </div>
  );
}

export function ListPageSkeleton({ items = 4 }) {
  return (
    <div className="history-list">
      {Array.from({ length: items }).map((_, index) => (
        <article key={index} className="history-card history-card--skeleton">
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-line" />
          <div className="history-card__metrics">
            <SkeletonBlock className="skeleton-card skeleton-card--chip" />
            <SkeletonBlock className="skeleton-card skeleton-card--chip" />
            <SkeletonBlock className="skeleton-card skeleton-card--chip" />
            <SkeletonBlock className="skeleton-card skeleton-card--chip" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="table-skeleton">
      <SkeletonBlock className="skeleton-line" />
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock key={index} className="skeleton-row" />
      ))}
    </div>
  );
}
