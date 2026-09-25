// ============================================================
// Skeleton.jsx - Komponente për efektin "Loading" (ngarkim)
// ============================================================
// Kur faqja është duke u ngarkuar, ne shfaqim "skeleton" -
// blloqe gri që lëvizin (animohen) për të treguar se diçka
// po ngarkohet. Kjo i tregon përdoruesit se sistemi po punon.
// ============================================================

// SkeletonBlock - Blloku bazë i animuar (shimmer)
// Parametri "className" lejon të ndryshosh madhësinë nga jashtë.
export function SkeletonBlock({ className = "" }) {
  // aria-hidden="true" do të thotë: fshih këtë element nga lexuesit e ekranit
  // sepse është vetëm dekorative, jo informative.
  return <div className={`shimmer-block ${className}`.trim()} aria-hidden="true" />;
}

// DashboardSkeleton - Skelet i faqes kryesore (Dashboard)
// Shfaqet derisa të ngarkohen të dhënat e panelit kryesor.
export function DashboardSkeleton() {
  return (
    <div className="page-grid">
      {/* Seksioni i sipërm me titull dhe statistika të vogla */}
      <section className="surface-card space-y-6">
        <SkeletonBlock className="h-6 w-36" />   {/* Vend për titullin e vogël */}
        <SkeletonBlock className="h-14 w-3/4" />  {/* Vend për titullin kryesor */}
        <SkeletonBlock className="h-5 w-full" />  {/* Vend për rreshtin e parë të tekstit */}
        <SkeletonBlock className="h-5 w-2/3" />   {/* Vend për rreshtin e dytë të tekstit */}
        {/* Tre kolona me karta të vogla statistikash */}
        <div className="three-column-grid">
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
        </div>
      </section>

      {/* 8 karta statistikash në grid */}
      <section className="stats-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-40" />
        ))}
      </section>

      {/* Dy grafike të mëdha krah për krah */}
      <div className="two-column-grid">
        <SkeletonBlock className="h-[360px]" />
        <SkeletonBlock className="h-[360px]" />
      </div>

      {/* Edhe dy seksione të tjera me lartësi pak më të vogël */}
      <div className="two-column-grid">
        <SkeletonBlock className="h-[320px]" />
        <SkeletonBlock className="h-[320px]" />
      </div>
    </div>
  );
}

// SplitPageSkeleton - Skelet për faqe të ndarë në dy kolona
// Për shembull: analizuesi i tekstit ose URL-ve.
export function SplitPageSkeleton() {
  return (
    <div className="page-grid-wide">
      {/* Dy blloqe të mëdha krah për krah */}
      <SkeletonBlock className="min-h-[680px]" />
      <SkeletonBlock className="min-h-[680px]" />
    </div>
  );
}

// ListPageSkeleton - Skelet për faqe me listë artikujsh
// Parametri "items" kontrollon sa artikuj të rremë shfaqen.
export function ListPageSkeleton({ items = 4 }) {
  return (
    <div className="page-grid">
      {/* Krijon "items" artikuj të rremë (default: 4) */}
      {Array.from({ length: items }).map((_, index) => (
        <article key={index} className="surface-card space-y-5">
          <SkeletonBlock className="h-7 w-1/2" />  {/* Vend për titullin */}
          <SkeletonBlock className="h-5 w-3/4" />  {/* Vend për nëntitullin */}
          {/* Katër kolona me statistika */}
          <div className="four-column-grid">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
          <SkeletonBlock className="h-16" />  {/* Vend për butonin/aksionin */}
        </article>
      ))}
    </div>
  );
}

// TableSkeleton - Skelet për tabelë me rreshta
// Parametri "rows" kontrollon sa rreshta të rremë shfaqen.
export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-6 w-40" />  {/* Vend për titullin e tabelës */}
      {/* Krijon "rows" rreshta të rremë (default: 6) */}
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock key={index} className="h-14" />
      ))}
    </div>
  );
}
