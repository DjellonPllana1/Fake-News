// ============================================================
// SourceReputationCard.jsx - Karta e Reputacionit të Burimit
// ============================================================
// Ky komponent shfaq informacionin mbi besueshmërinë e burimit
// (domainit/faqes) nga ku vjen artikulli i analizuar.
// Shfaq: Domain, Nota e besimit (Trust Score), Anësia politike,
// Besueshmëria dhe Historiku i kontrollit të fakteve.
// ============================================================

import { Globe2, Landmark, ShieldCheck } from "lucide-react";
import { InfoList } from "./InfoList";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

// formatValue - Pastro dhe ktheje vlerën si tekst të lexueshëm
// Nëse vlera është bosh ose undefined, kthe fallback-un
// Shembull: formatValue(null, "I panjohur") → "I panjohur"
function formatValue(value, fallback = "Unknown") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

// resolveBadgeVariant - Cakto stilin e etiketës sipas statusit
// Kthen variantin CSS të duhur për Badge-in
function resolveBadgeVariant(badge = "Unknown") {
  const normalized = formatValue(badge, "Unknown").toLowerCase();

  // "trusted" → etiketë jeshile (burim i besuar)
  if (normalized === "trusted") {
    return "trusted";
  }

  // "medium" → etiketë portokalli (burim mesatar)
  if (normalized === "medium") {
    return "medium";
  }

  // "suspicious" → etiketë kuqe (burim i dyshimtë)
  if (normalized === "suspicious") {
    return "suspicious";
  }

  // Çdo gjë tjetër → etiketë gri (i panjohur)
  return "unknown";
}

// SourceReputationBadge - Shfaq vetëm etiketën e statusit të burimit
// Parametri "badge": "trusted" | "medium" | "suspicious" | "Unknown"
export function SourceReputationBadge({ badge = "Unknown" }) {
  const normalizedBadge = formatValue(badge, "Unknown");
  // Badge - komponenti i etiketës me ngjyrën e duhur sipas statusit
  return <Badge variant={resolveBadgeVariant(normalizedBadge)}>{normalizedBadge}</Badge>;
}

// SourceReputationCard - Karta e plotë e reputacionit të burimit
// Parametrat:
//   sourceReputation - Objekti me të gjitha të dhënat e burimit
//   title            - Titulli i seksionit (parazgjedhje: "Source Reputation")
//   compact          - Nëse true, karta është më e vogël (më pak hapësirë)
export function SourceReputationCard({ sourceReputation, title = "Source Reputation", compact = false }) {
  // Nëse s'ka të dhëna, mos shfaq asgjë
  if (!sourceReputation) {
    return null;
  }

  return (
    <Card className={compact ? "p-5" : ""}>
      <CardContent className="space-y-5">
        {/* Rreshti i sipërm: titulli dhe etiketa e statusit */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            {/* Teksti i vogël mbi titull (eyebrow) */}
            <span className="eyebrow">{title}</span>
            {/* Ikona dhe emri i domainit */}
            <div className="flex items-start gap-3">
              <div className="metric-icon">
                <Globe2 className="h-4 w-4" />  {/* Ikona e globit */}
              </div>
              <div className="space-y-1">
                {/* Emri i domainit (p.sh. "bbc.com") */}
                <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {formatValue(sourceReputation.domain, "Unknown domain")}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">Domain-level reliability metadata used in the final trust score.</p>
              </div>
            </div>
          </div>
          {/* Etiketa e statusit të burimit (trusted/medium/suspicious) */}
          <SourceReputationBadge badge={sourceReputation.badge} />
        </div>

        {/* Tre kartela metrikash: Nota, Anësia Politike, Besueshmëria */}
        <div className="three-column-grid">
          {/* Kartela 1: Nota e Besimit (Trust Score) */}
          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--muted-foreground)]">Trust Score</span>
              <ShieldCheck className="h-4 w-4 text-[var(--accent-strong)]" />
            </div>
            {/* Nota nga 0 deri 100 */}
            <strong>{Number(sourceReputation.trustScore || 0)}/100</strong>
            <p className="text-sm">Weighted by local domain reputation data and fact-checking history.</p>
          </div>
          {/* Kartela 2: Anësia Politike dhe Vendi */}
          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--muted-foreground)]">Political Bias</span>
              <Landmark className="h-4 w-4 text-[var(--accent-strong)]" />
            </div>
            {/* Anësia politike (p.sh. "Center", "Left", "Right") */}
            <strong className="text-[1.25rem]">{formatValue(sourceReputation.politicalBias)}</strong>
            <p className="text-sm">Country: {formatValue(sourceReputation.country)}</p>
          </div>
          {/* Kartela 3: Niveli i Besueshmërisë */}
          <div className="metric-tile">
            <span className="text-sm text-[var(--muted-foreground)]">Reliability</span>
            <strong className="text-[1.25rem]">{formatValue(sourceReputation.reliability)}</strong>
            <p className="text-sm">Badge: {formatValue(sourceReputation.badge, "Unknown")}</p>
          </div>
        </div>

        {/* Lista e detajuar me të gjitha të dhënat */}
        <InfoList
          items={[
            { label: "Domain", value: formatValue(sourceReputation.domain, "Unknown domain") },
            { label: "Trust Score", value: `${Number(sourceReputation.trustScore || 0)}/100` },
            { label: "Political Bias", value: formatValue(sourceReputation.politicalBias) },
            { label: "Country", value: formatValue(sourceReputation.country) },
            { label: "Reliability", value: formatValue(sourceReputation.reliability) },
          ]}
        />

        {/* Seksioni i Historikut të Kontrollit të Fakteve */}
        <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5">
          <span className="eyebrow">Fact Checking History</span>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            {/* Nëse nuk ka histori, shfaq mesazhin standard */}
            {formatValue(sourceReputation.factCheckingHistory, "No local fact-checking history is available for this domain.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
