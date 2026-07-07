import { useEffect, useState } from "react";
import { api } from "../api";
import { SourceReputationBadge } from "../components/SourceReputationCard";

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

  return (
    <section className="panel page-grid page-grid--single">
      <div className="panel__header panel__header--split">
        <div>
          <span className="eyebrow">Saved Analyses</span>
          <h2>History</h2>
        </div>

        <div className="filter-row">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search title, source, summary, entities"
          />
          <select value={filters.label} onChange={(event) => setFilters((current) => ({ ...current, label: event.target.value }))}>
            <option value="">All Labels</option>
            <option value="REAL">REAL</option>
            <option value="FAKE">FAKE</option>
            <option value="UNCERTAIN">UNCERTAIN</option>
          </select>
          <button type="button" className="secondary-button" onClick={() => api.downloadHistoryCsv(filters)}>
            Export CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => api.downloadHistoryJson(filters)}>
            Export JSON
          </button>
          <button type="button" className="secondary-button" onClick={() => api.downloadHistoryPdf(filters)}>
            Export PDF
          </button>
        </div>
      </div>

      {state.loading ? <div className="empty-state">Loading history...</div> : null}
      {state.error ? <div className="inline-error">{state.error}</div> : null}

      {!state.loading && !state.error ? (
        <>
          <div className="history-total">Showing {state.total} saved analyses</div>
          <div className="history-list">
            {state.history.map((item) => {
              const hasSourceReputation = Boolean(item.url || (item.source && item.source !== "Manual input"));

              return (
                <article key={item.id} className="history-card">
                  <div className="history-card__header">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.source}</span>
                      {hasSourceReputation && item.sourceReputation ? <SourceReputationBadge badge={item.sourceReputation.badge} /> : null}
                    </div>
                    <span className={`status-badge status-badge--${item.label.toLowerCase()}`}>{item.label}</span>
                  </div>

                  <p>{item.summary || item.textPreview || "No summary stored for this analysis."}</p>

                  <div className="history-card__metrics">
                    <span>{item.confidence}% confidence</span>
                    <span>{item.trustScore || item.credibilityScore || 0}/100 trust score</span>
                    <span>{item.trustLevel || "Trust level unavailable"}</span>
                    <span>{item.url || (item.source && item.source !== "Manual input") ? item.sourceReputation?.domain || "Unknown domain" : "No source domain"}</span>
                    <span>{item.url || (item.source && item.source !== "Manual input") ? `${item.sourceReputation?.reliability || "Unknown"} reliability` : "No source profile"}</span>
                    <span>{Math.round(Number(item.evidenceConfidence || 0) * 100)}% evidence confidence</span>
                    <span>{item.evidenceVerdict || "UNVERIFIED"} evidence verdict</span>
                    <span>{item.sentiment?.label || "neutral"} sentiment</span>
                    <span>{item.modelVersion || item.model}</span>
                  </div>

                  {item.trustExplanation ? <p>{item.trustExplanation}</p> : null}
                  {item.recommendation ? <p>{item.recommendation}</p> : null}

                  {item.trustReasons?.length ? (
                    <div className="tag-list">
                      {item.trustReasons.slice(0, 4).map((reason) => (
                        <span key={`${item.id}-${reason}`}>{reason}</span>
                      ))}
                    </div>
                  ) : null}

                  {item.keywords?.length ? (
                    <div className="tag-list">
                      {item.keywords.slice(0, 6).map((keyword) => (
                        <span key={`${item.id}-${keyword}`}>{keyword}</span>
                      ))}
                    </div>
                  ) : null}

                  <div className="history-card__footer">
                    <div className="history-card__footer-meta">
                      <span>{item.model}</span>
                      <span>{item.date}</span>
                    </div>
                    <div className="history-card__actions">
                      <button type="button" className="ghost-button" onClick={() => api.downloadAnalysisCsv(item.id)}>
                        Export CSV
                      </button>
                      <button type="button" className="ghost-button" onClick={() => api.downloadAnalysisJson(item.id)}>
                        Export JSON
                      </button>
                      <button type="button" className="ghost-button" onClick={() => api.downloadAnalysisPdf(item.id)}>
                        Export PDF
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
