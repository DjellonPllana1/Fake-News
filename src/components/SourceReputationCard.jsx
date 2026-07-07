import { Globe2, Landmark, ShieldCheck } from "lucide-react";
import { InfoList } from "./InfoList";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

function formatValue(value, fallback = "Unknown") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function resolveBadgeVariant(badge = "Unknown") {
  const normalized = formatValue(badge, "Unknown").toLowerCase();

  if (normalized === "trusted") {
    return "trusted";
  }

  if (normalized === "medium") {
    return "medium";
  }

  if (normalized === "suspicious") {
    return "suspicious";
  }

  return "unknown";
}

export function SourceReputationBadge({ badge = "Unknown" }) {
  const normalizedBadge = formatValue(badge, "Unknown");

  return <Badge variant={resolveBadgeVariant(normalizedBadge)}>{normalizedBadge}</Badge>;
}

export function SourceReputationCard({ sourceReputation, title = "Source Reputation", compact = false }) {
  if (!sourceReputation) {
    return null;
  }

  return (
    <Card className={compact ? "p-5" : ""}>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <span className="eyebrow">{title}</span>
            <div className="flex items-start gap-3">
              <div className="metric-icon">
                <Globe2 className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {formatValue(sourceReputation.domain, "Unknown domain")}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">Domain-level reliability metadata used in the final trust score.</p>
              </div>
            </div>
          </div>
          <SourceReputationBadge badge={sourceReputation.badge} />
        </div>

        <div className="three-column-grid">
          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--muted-foreground)]">Trust Score</span>
              <ShieldCheck className="h-4 w-4 text-[var(--accent-strong)]" />
            </div>
            <strong>{Number(sourceReputation.trustScore || 0)}/100</strong>
            <p className="text-sm">Weighted by local domain reputation data and fact-checking history.</p>
          </div>
          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--muted-foreground)]">Political Bias</span>
              <Landmark className="h-4 w-4 text-[var(--accent-strong)]" />
            </div>
            <strong className="text-[1.25rem]">{formatValue(sourceReputation.politicalBias)}</strong>
            <p className="text-sm">Country: {formatValue(sourceReputation.country)}</p>
          </div>
          <div className="metric-tile">
            <span className="text-sm text-[var(--muted-foreground)]">Reliability</span>
            <strong className="text-[1.25rem]">{formatValue(sourceReputation.reliability)}</strong>
            <p className="text-sm">Badge: {formatValue(sourceReputation.badge, "Unknown")}</p>
          </div>
        </div>

        <InfoList
          items={[
            { label: "Domain", value: formatValue(sourceReputation.domain, "Unknown domain") },
            { label: "Trust Score", value: `${Number(sourceReputation.trustScore || 0)}/100` },
            { label: "Political Bias", value: formatValue(sourceReputation.politicalBias) },
            { label: "Country", value: formatValue(sourceReputation.country) },
            { label: "Reliability", value: formatValue(sourceReputation.reliability) },
          ]}
        />

        <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5">
          <span className="eyebrow">Fact Checking History</span>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            {formatValue(sourceReputation.factCheckingHistory, "No local fact-checking history is available for this domain.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
