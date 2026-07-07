function formatValue(value, fallback = "Unknown") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

export function SourceReputationBadge({ badge = "Unknown" }) {
  const normalizedBadge = formatValue(badge, "Unknown");

  return <span className={`reputation-badge reputation-badge--${normalizedBadge.toLowerCase()}`}>{normalizedBadge}</span>;
}

export function SourceReputationCard({ sourceReputation, title = "Source Reputation", compact = false }) {
  if (!sourceReputation) {
    return null;
  }

  return (
    <article className={`source-reputation-card${compact ? " source-reputation-card--compact" : ""}`}>
      <div className="source-reputation-card__header">
        <div>
          <span className="eyebrow">{title}</span>
          <h3>{formatValue(sourceReputation.domain, "Unknown domain")}</h3>
        </div>
        <SourceReputationBadge badge={sourceReputation.badge} />
      </div>

      <div className="detail-list">
        <div className="detail-list__row">
          <span>Domain</span>
          <strong>{formatValue(sourceReputation.domain, "Unknown domain")}</strong>
        </div>
        <div className="detail-list__row">
          <span>Trust Score</span>
          <strong>{Number(sourceReputation.trustScore || 0)}/100</strong>
        </div>
        <div className="detail-list__row">
          <span>Political Bias</span>
          <strong>{formatValue(sourceReputation.politicalBias)}</strong>
        </div>
        <div className="detail-list__row">
          <span>Country</span>
          <strong>{formatValue(sourceReputation.country)}</strong>
        </div>
        <div className="detail-list__row">
          <span>Reliability</span>
          <strong>{formatValue(sourceReputation.reliability)}</strong>
        </div>
      </div>

      <div className="source-reputation-card__history">
        <span className="eyebrow">Fact Checking History</span>
        <p>{formatValue(sourceReputation.factCheckingHistory, "No local fact-checking history is available for this domain.")}</p>
      </div>
    </article>
  );
}
