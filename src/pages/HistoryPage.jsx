import { useEffect, useMemo, useState } from "react";
import { FileDown, Search } from "lucide-react";
import { api } from "../api";
import { AnalysisResultCard } from "../components/AnalysisResultCard";
import { SectionHeader } from "../components/SectionHeader";
import { ListPageSkeleton } from "../components/Skeleton";
import { SourceReputationBadge } from "../components/SourceReputationCard";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

const PAGE_SIZE = 10;

function labelVariant(label) {
  if (label === "REAL") {
    return "real";
  }

  if (label === "FAKE") {
    return "fake";
  }

  return "uncertain";
}

export function HistoryPage({ refreshToken }) {
  const [filters, setFilters] = useState({
    search: "",
    label: "",
  });
  const [state, setState] = useState({
    loading: true,
    error: "",
    history: [],
    total: 0,
  });
  const [page, setPage] = useState(1);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
      try {
        const data = await api.getHistory({
          ...filters,
          limit: 100,
        });

        if (isActive) {
          setState({
            loading: false,
            error: "",
            history: data.history,
            total: data.total,
          });
        }
      } catch (error) {
        if (isActive) {
          setState({
            loading: false,
            error: error.message,
            history: [],
            total: 0,
          });
        }
      }
    }

    loadHistory();

    return () => {
      isActive = false;
    };
  }, [refreshToken, filters]);

  const summary = useMemo(() => {
    const base = {
      total: state.history.length,
      real: 0,
      fake: 0,
      uncertain: 0,
      avgConfidence: 0,
    };

    if (!state.history.length) {
      return base;
    }

    state.history.forEach((item) => {
      if (item.label === "REAL") {
        base.real += 1;
      } else if (item.label === "FAKE") {
        base.fake += 1;
      } else {
        base.uncertain += 1;
      }
      base.avgConfidence += Number(item.confidence || 0);
    });

    base.avgConfidence = Math.round(base.avgConfidence / state.history.length);
    return base;
  }, [state.history]);

  const totalPages = Math.max(1, Math.ceil(state.history.length / PAGE_SIZE));
  const paginatedItems = state.history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="page-grid">
        <Card>
          <CardContent className="space-y-8">
            <SectionHeader
              eyebrow="Saved Analyses"
              title="Searchable history"
              description="Review every saved analysis, filter by label, export records, and open a full detail view without leaving the table."
              actions={
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={() => api.downloadHistoryCsv(filters)}>
                    <FileDown className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button type="button" variant="outline" onClick={() => api.downloadHistoryJson(filters)}>
                    <FileDown className="h-4 w-4" />
                    Export JSON
                  </Button>
                  <Button type="button" variant="outline" onClick={() => api.downloadHistoryPdf(filters)}>
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              }
            />

            <div className="four-column-grid">
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Loaded Analyses</span>
                <strong>{summary.total}</strong>
                <p className="text-sm leading-6">Current search result count loaded from the history API.</p>
              </article>
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">REAL</span>
                <strong>{summary.real}</strong>
                <p className="text-sm leading-6">Analyses currently marked as likely legitimate reporting.</p>
              </article>
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">FAKE</span>
                <strong>{summary.fake}</strong>
                <p className="text-sm leading-6">Analyses currently marked as likely misleading or fabricated.</p>
              </article>
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Avg Confidence</span>
                <strong>{summary.avgConfidence}%</strong>
                <p className="text-sm leading-6">Average confidence across the loaded history results.</p>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="form-field">
                <span>Search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    value={filters.search}
                    onChange={(event) => {
                      setPage(1);
                      setFilters((current) => ({ ...current, search: event.target.value }));
                    }}
                    placeholder="Search title, source, summary, entities"
                    className="pl-11"
                  />
                </div>
              </label>

              <label className="form-field">
                <span>Label</span>
                <Select
                  value={filters.label}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({ ...current, label: event.target.value }));
                  }}
                >
                  <option value="">All Labels</option>
                  <option value="REAL">REAL</option>
                  <option value="FAKE">FAKE</option>
                  <option value="UNCERTAIN">UNCERTAIN</option>
                </Select>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader
              eyebrow="History Table"
              title={`Showing ${state.total} saved analyses`}
              description="Click any row to open the full explainable report in a detail modal."
            />

            {state.loading ? <ListPageSkeleton items={4} /> : null}
            {state.error ? <div className="callout callout-danger">{state.error}</div> : null}

            {!state.loading && !state.error ? (
              paginatedItems.length ? (
                <>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Article</th>
                          <th>Prediction</th>
                          <th>Confidence</th>
                          <th>Trust</th>
                          <th>Evidence</th>
                          <th>Model</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item) => {
                          const hasSourceReputation = Boolean(item.url || (item.source && item.source !== "Manual input"));

                          return (
                            <tr key={item.id} className="cursor-pointer" onClick={() => setSelectedAnalysis(item)}>
                              <td>
                                <div className="space-y-2">
                                  <strong className="block text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
                                  <div className="flex flex-wrap gap-2">
                                    <span className="text-xs text-[var(--muted-foreground)]">{item.source}</span>
                                    {hasSourceReputation && item.sourceReputation ? <SourceReputationBadge badge={item.sourceReputation.badge} /> : null}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <Badge variant={labelVariant(item.label)}>{item.label}</Badge>
                              </td>
                              <td>{item.confidence}%</td>
                              <td>{item.trustScore || item.credibilityScore || 0}/100</td>
                              <td>{Math.round(Number(item.evidenceConfidence || 0) * 100)}%</td>
                              <td>{item.modelVersion || item.model}</td>
                              <td>{item.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-[var(--muted-foreground)]">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Search}
                  title="No analyses found"
                  description="Try adjusting the search term or label filter to find saved records."
                />
              )
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedAnalysis)} onOpenChange={(open) => !open && setSelectedAnalysis(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto p-0">
          {selectedAnalysis ? <AnalysisResultCard analysis={selectedAnalysis} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
