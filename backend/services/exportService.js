import { readDatabase, toAnalysisRow } from "../database.js";
import { buildCsv } from "../utils/csv.js";
import { formatDateTime } from "../utils/date.js";
import { normalizeResultLabel, summarizeDistribution } from "../utils/labels.js";
import { buildAcademicReportPdf } from "../utils/pdfDocument.js";
import { getSystemDiagnostics } from "./diagnosticsService.js";

const BRAND = "Verity Lens";
const ANALYSIS_REPORT_LABEL = "Explainable AI Credibility Report";
const HISTORY_REPORT_LABEL = "Executive Analytics Export";

function filterHistory(items = [], { search = "", label = "" } = {}) {
  const normalizedSearch = String(search || "").trim().toLowerCase();

  return items
    .map(toAnalysisRow)
    .filter((item) => !label || normalizeResultLabel(item.label) === normalizeResultLabel(label))
    .filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      const entityText = Object.values(item.entities || {})
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .join(" ");
      const claimText = (item.claimAnalyses || []).map((claim) => `${claim.claim} ${claim.finalVerdict} ${claim.explanation}`).join(" ");
      const trustText = `${item.trustLevel || ""} ${item.trustExplanation || ""} ${(item.trustReasons || []).join(" ")} ${
        item.trustSignals?.map((signal) => `${signal.title} ${signal.evidence} ${signal.positiveReason} ${signal.cautionReason}`).join(" ") || ""
      }`;
      const sourceReputationText = `${item.sourceReputation?.domain || ""} ${item.sourceReputation?.badge || ""} ${
        item.sourceReputation?.politicalBias || ""
      } ${item.sourceReputation?.country || ""} ${item.sourceReputation?.reliability || ""} ${item.sourceReputation?.factCheckingHistory || ""}`;
      const haystack = `${item.title} ${item.source} ${item.summary} ${item.explanation} ${item.recommendation} ${item.keywords.join(" ")} ${entityText} ${claimText} ${trustText} ${sourceReputationText}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
}

function toRoundedPercent(value = 0) {
  const numeric = Number(value || 0);

  if (numeric <= 1 && numeric >= 0) {
    return Math.round(numeric * 100);
  }

  return Math.round(numeric);
}

function formatPercent(value = 0) {
  return `${toRoundedPercent(value)}%`;
}

function formatScore(value, max = 100) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return `n/a/${max}`;
  }

  return `${Math.round(Number(value))}/${max}`;
}

function average(values = []) {
  const numericValues = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return 0;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function uniqueStrings(values = [], limit = values.length) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}

function serializeForCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => ["string", "number", "boolean"].includes(typeof item))
      ? value.join(" | ")
      : JSON.stringify(value);
  }

  return JSON.stringify(value);
}

function collectTopTerms(values = [], limit = 6) {
  const counts = new Map();

  values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function buildProbabilityItems(probabilities = {}) {
  return Object.entries(probabilities || {}).map(([label, value]) => ({
    label,
    value: toRoundedPercent(value),
    displayValue: formatPercent(value),
  }));
}

function buildEntitySummary(entities = {}) {
  const entityGroups = [
    ["People", entities.people],
    ["Organizations", entities.organizations],
    ["Locations", entities.locations],
    ["Dates", entities.dates],
    ["Sources", entities.sources],
  ]
    .map(([label, values]) => `${label}: ${uniqueStrings(Array.isArray(values) ? values : [], 8).join(", ") || "None identified"}`)
    .join("\n");

  const totalEntities = Number(entities?.counts?.total || 0);
  return totalEntities ? `Entity count: ${totalEntities}\n${entityGroups}` : entityGroups;
}

function buildKeywordSummary(analysis) {
  const extractedKeywords = uniqueStrings(analysis.keywords || [], 10);
  const influentialKeywords = (analysis.influentialKeywords || [])
    .slice(0, 8)
    .map((item) => `${item.term} (${Math.round(Number(item.weight || 0) * 100)}%${item.direction === "opposes" ? ", opposes" : ""})`);
  const scoredKeywords = (analysis.keywordMetadata?.items || []).slice(0, 8).map((item) => `${item.term} (${Math.round(Number(item.score || 0))})`);

  return [
    extractedKeywords.length ? `Keywords: ${extractedKeywords.join(", ")}` : "Keywords: None extracted.",
    influentialKeywords.length ? `Influential keywords: ${influentialKeywords.join(", ")}` : "Influential keywords: No contribution weights recorded.",
    scoredKeywords.length ? `Scored keyword candidates: ${scoredKeywords.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSuspiciousSentenceSummary(analysis) {
  if (!analysis.suspiciousSentences?.length) {
    return "No strongly suspicious sentences were highlighted by the current pipeline.";
  }

  return analysis.suspiciousSentences
    .slice(0, 6)
    .map((item, index) => `${index + 1}. ${item.sentence} (${Math.round(Number(item.score || 0) * 100)}% suspicion${item.reasons?.length ? `; ${item.reasons.join(", ")}` : ""})`)
    .join("\n");
}

function buildRuleFindingSummary(analysis) {
  const findings = (analysis.ruleFindings || [])
    .filter((item) => Number(item.score || 0) > 0)
    .slice(0, 8)
    .map((item) => `${item.title}: ${item.message} (${Math.round(Number(item.score || 0) * 100)}%, ${item.evidence})`);

  return findings.length ? findings.join("\n") : "No strong rule-based credibility concerns were detected.";
}

function buildTrustSignalSummary(analysis) {
  if (!analysis.trustSignals?.length) {
    return "No weighted trust component breakdown is available.";
  }

  return analysis.trustSignals
    .slice(0, 8)
    .map(
      (signal) =>
        `${signal.title}: score ${signal.score}/100, weight ${signal.weight}. ${
          Number(signal.score || 0) >= 60 ? signal.positiveReason : signal.cautionReason
        } Evidence: ${signal.evidence}`
    )
    .join("\n");
}

function buildEvidenceSummary(analysis) {
  const evidence = analysis.evidence || null;

  if (!evidence?.hasEvidence) {
    return "Unable to verify this claim using trusted sources.";
  }

  const sourceDetails = (evidence.sources || [])
    .slice(0, 6)
    .map(
      (item, index) =>
        `${index + 1}. ${item.source}: ${item.title} (${item.stance}, ${Math.round(Number(item.similarityScore || 0) * 100)}% similarity${
          item.publishedAt ? `, ${item.publishedAt}` : ""
        })`
    )
    .join("\n");

  return [
    `Trusted sources found: ${(analysis.trustedSourcesFound || []).join(", ") || "None listed"}`,
    `Supporting articles: ${analysis.supportingArticlesCount || 0}`,
    `Contradicting articles: ${analysis.contradictingArticlesCount || 0}`,
    `Evidence confidence: ${formatPercent(analysis.evidenceConfidence || 0)}`,
    `Similarity score: ${formatPercent(analysis.similarityScore || 0)}`,
    `Evidence verdict: ${analysis.evidenceVerdict || "UNVERIFIED"}`,
    `Supported claims: ${analysis.supportedClaimsCount || 0}, contradicted claims: ${analysis.contradictedClaimsCount || 0}, unverified claims: ${
      analysis.unverifiedClaimsCount || 0
    }`,
    sourceDetails ? `Representative trusted sources:\n${sourceDetails}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildClaimSummary(analysis) {
  if (!analysis.claimAnalyses?.length) {
    return "No individual factual claims could be extracted from this article.";
  }

  return analysis.claimAnalyses
    .slice(0, 6)
    .map(
      (claim) =>
        `Claim ${claim.index}: ${claim.claim}\nVerdict: ${claim.finalVerdict} | Confidence: ${claim.confidence}% | Evidence items: ${claim.evidenceCount}\n${claim.explanation}`
    )
    .join("\n\n");
}

function buildSourceReputationSummary(analysis) {
  const sourceReputation = analysis.sourceReputation || null;

  if (!sourceReputation) {
    return "No source reputation profile is available for this analysis.";
  }

  return [
    `Domain: ${sourceReputation.domain || "Unknown domain"}`,
    `Trust score: ${formatScore(sourceReputation.trustScore ?? 50)}`,
    `Badge: ${sourceReputation.badge || "Unknown"}`,
    `Political bias: ${sourceReputation.politicalBias || "Unknown"}`,
    `Country: ${sourceReputation.country || "Unknown"}`,
    `Reliability: ${sourceReputation.reliability || "Unknown"}`,
    `Fact-checking history: ${sourceReputation.factCheckingHistory || "No local source reputation history stored."}`,
  ].join("\n");
}

function buildSystemSummary(diagnostics = {}) {
  const runtime = diagnostics.runtime || {};
  const configuration = diagnostics.configuration || {};
  const storage = diagnostics.storage || {};
  const model = diagnostics.model || {};

  return [
    `System status: ${diagnostics.status || "unknown"}`,
    `Model version: ${model.version || "Not available"}`,
    `Best model: ${model.bestModel || "Not available"}`,
    `Model metrics generated: ${model.generatedAt || "Not available"}`,
    `Runtime: Node ${runtime.nodeVersion || "unknown"} on ${runtime.platform || "unknown"} ${runtime.arch || ""}`.trim(),
    `Database client: ${configuration.dbClient || "json"}`,
    `Confidence threshold: ${configuration.confidenceThreshold ?? "n/a"}`,
    `ML / rule weights: ${configuration.mlWeight ?? "n/a"} / ${configuration.ruleWeight ?? "n/a"}`,
    `Evidence providers: ${configuration.evidenceProviders || "Not configured"}`,
    `Stored analyses: ${storage.databaseAnalyses ?? 0}, stored articles: ${storage.databaseArticles ?? 0}`,
    `Model artifact updated: ${storage.modelArtifactUpdatedAt || "Not available"}`,
    `Metrics artifact updated: ${storage.metricsArtifactUpdatedAt || "Not available"}`,
  ].join("\n");
}

function buildArticleBody(analysis) {
  return analysis.articleText || analysis.textPreview || analysis.summary || "No article body was stored for this analysis.";
}

function buildAnalysisCharts(analysis) {
  const finalProbabilities = buildProbabilityItems(analysis.probabilities || analysis.modelProbabilities || {});
  const scoreItems = [
    {
      label: "Confidence",
      value: analysis.confidence,
      displayValue: `${analysis.confidence}%`,
      color: "#2E86AB",
    },
    {
      label: "Trust Score",
      value: Number(analysis.trustScore ?? analysis.credibilityScore ?? 0),
      displayValue: formatScore(analysis.trustScore ?? analysis.credibilityScore ?? 0),
      color: "#2A9D8F",
    },
    {
      label: "Evidence",
      value: toRoundedPercent(analysis.evidenceConfidence || 0),
      displayValue: formatPercent(analysis.evidenceConfidence || 0),
      color: "#D4A72C",
    },
    {
      label: "Source Trust",
      value: Number(analysis.sourceReputation?.trustScore ?? 50),
      displayValue: formatScore(analysis.sourceReputation?.trustScore ?? 50),
      color: "#11324A",
    },
  ];

  return [
    {
      title: "Probability Distribution",
      items: finalProbabilities.length
        ? finalProbabilities
        : [
            {
              label: analysis.label || "Prediction",
              value: analysis.confidence || 0,
              displayValue: `${analysis.confidence || 0}%`,
            },
          ],
      maxValue: 100,
    },
    {
      title: "Credibility Components",
      items: scoreItems,
      maxValue: 100,
    },
  ];
}

function buildAnalysisMetricCards(analysis, diagnostics = {}) {
  return [
    {
      label: "Prediction",
      value: analysis.label,
      detail: analysis.explanation || "Explainable AI classification result.",
      accentColor: analysis.label === "FAKE" ? "#D96C6C" : analysis.label === "REAL" ? "#2A9D8F" : "#D4A72C",
    },
    {
      label: "Confidence",
      value: `${analysis.confidence}%`,
      detail: `Risk level ${analysis.riskLevel || "UNKNOWN"} | Recommendation: ${analysis.recommendation || "Review manually."}`,
      accentColor: "#2E86AB",
    },
    {
      label: "Trust Score",
      value: formatScore(analysis.trustScore ?? analysis.credibilityScore ?? 0),
      detail: analysis.trustLevel || "Trust level unavailable",
      accentColor: "#2A9D8F",
    },
    {
      label: "Model Version",
      value: analysis.modelVersion || diagnostics.model?.version || analysis.model || "Unknown",
      detail: `${analysis.model || "Unknown model"} | Exported ${formatDateTime()}`,
      accentColor: "#11324A",
    },
  ];
}

function buildAnalysisSections(analysis, diagnostics = {}) {
  const finalProbabilities = buildProbabilityItems(analysis.probabilities || analysis.modelProbabilities || {})
    .map((item) => `${item.label}: ${item.displayValue}`)
    .join(", ");
  const modelProbabilities = buildProbabilityItems(analysis.modelProbabilities || {})
    .map((item) => `${item.label}: ${item.displayValue}`)
    .join(", ");

  return [
    {
      heading: "Executive Summary",
      tone: "accent",
      body: [
        analysis.summary || "No concise article summary was stored.",
        `Prediction: ${analysis.label} with ${analysis.confidence}% confidence and a trust score of ${formatScore(
          analysis.trustScore ?? analysis.credibilityScore ?? 0
        )}.`,
        `Recommendation: ${analysis.recommendation || "Use additional editorial review before relying on this article."}`,
        analysis.warning ? `Warning: ${analysis.warning}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      heading: "Article Under Review",
      body: [
        `Title: ${analysis.title}`,
        `Source: ${analysis.source || "Manual input"}`,
        `URL: ${analysis.url || "Not provided"}`,
        `Author: ${analysis.author || "Not provided"}`,
        `Publication date: ${analysis.publishedAt || "Not provided"}`,
        `Saved analysis date: ${analysis.date}`,
        "",
        buildArticleBody(analysis),
      ].join("\n"),
    },
    {
      heading: "Prediction and Model Output",
      body: [
        `Prediction: ${analysis.label}`,
        `Confidence: ${analysis.confidence}%`,
        `Risk level: ${analysis.riskLevel || "UNKNOWN"}`,
        `Trust score: ${formatScore(analysis.trustScore ?? analysis.credibilityScore ?? 0)}`,
        `Evidence-adjusted credibility: ${formatScore(analysis.evidenceAdjustedCredibilityScore ?? analysis.baseCredibilityScore ?? analysis.credibilityScore ?? 0)}`,
        `Final probability distribution: ${finalProbabilities || "No probability distribution stored."}`,
        `Raw model probabilities: ${modelProbabilities || "No raw model probability distribution stored."}`,
        `Model: ${analysis.model || "Unknown model"}${analysis.modelVersion ? ` (${analysis.modelVersion})` : ""}`,
      ].join("\n"),
    },
    {
      heading: "Evidence Verification",
      body: buildEvidenceSummary(analysis),
    },
    {
      heading: "Claim-Level Verification",
      body: buildClaimSummary(analysis),
    },
    {
      heading: "Explainable AI Findings",
      body: [
        `Explanation: ${analysis.explanation || "No explanation narrative was stored."}`,
        `Trust rationale: ${analysis.trustExplanation || "No trust explanation was stored."}`,
        analysis.trustReasons?.length ? `Trust reasons: ${analysis.trustReasons.join(", ")}` : "",
        buildKeywordSummary(analysis),
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      heading: "Suspicious Sentences and Rule Findings",
      body: [buildSuspiciousSentenceSummary(analysis), "", buildRuleFindingSummary(analysis), "", buildTrustSignalSummary(analysis)].join("\n"),
    },
    {
      heading: "Named Entities and NLP Metadata",
      body: [
        buildEntitySummary(analysis.entities || {}),
        "",
        `Language: ${analysis.languageInfo?.name || analysis.language || "Unknown"} (${formatPercent(analysis.languageInfo?.confidence || 0)})`,
        `Article category: ${analysis.articleCategory?.label || "General"}`,
        `Primary topic: ${analysis.topicDetection?.primary?.label || "General News"}`,
        `Sentiment: ${analysis.sentiment?.label || "Not available"} (score ${analysis.sentiment?.score ?? "n/a"})`,
        `Reading complexity: ${analysis.readingComplexity?.level || "Standard"} | Grade ${analysis.readingComplexity?.fleschKincaidGrade ?? "n/a"}`,
        `Writing style: ${analysis.writingStyle?.label || "Not available"}`,
        `Dominant emotion: ${analysis.emotion?.dominant || "neutral"}`,
      ].join("\n"),
    },
    {
      heading: "Source Reputation and System Information",
      body: [buildSourceReputationSummary(analysis), "", buildSystemSummary(diagnostics)].join("\n"),
    },
  ];
}

function buildAnalysisExportPackage(analysis, diagnostics = {}) {
  const generatedAt = formatDateTime();
  const trustScore = Number(analysis.trustScore ?? analysis.credibilityScore ?? 0);
  const report = {
    brand: BRAND,
    headerLabel: ANALYSIS_REPORT_LABEL,
    title: analysis.title,
    subtitle: "Professional explainable AI fake news assessment designed for academic and executive presentation.",
    metaLine: `Generated ${generatedAt} | Prediction ${analysis.label} | Model version ${
      analysis.modelVersion || diagnostics.model?.version || analysis.model || "Unknown"
    }`,
    generatedAt,
    footerNote: `${BRAND} academic credibility export`,
    metricCards: buildAnalysisMetricCards(analysis, diagnostics),
    charts: buildAnalysisCharts(analysis),
    sections: buildAnalysisSections(analysis, diagnostics),
  };

  return {
    meta: {
      brand: BRAND,
      reportType: "analysis",
      generatedAt,
      headerLabel: ANALYSIS_REPORT_LABEL,
      academicPresentationReady: true,
    },
    report,
    charts: {
      probabilityDistribution: buildProbabilityItems(analysis.probabilities || analysis.modelProbabilities || {}),
      credibilityComponents: [
        { label: "Confidence", value: analysis.confidence },
        { label: "Trust Score", value: trustScore },
        { label: "Evidence Confidence", value: toRoundedPercent(analysis.evidenceConfidence || 0) },
        { label: "Source Trust Score", value: Number(analysis.sourceReputation?.trustScore ?? 50) },
      ],
    },
    highlights: {
      prediction: analysis.label,
      confidence: analysis.confidence,
      trustScore,
      summary: analysis.summary || "",
      recommendation: analysis.recommendation || "",
      evidenceVerdict: analysis.evidenceVerdict || "UNVERIFIED",
      trustedSourcesFound: analysis.trustedSourcesFound || [],
    },
    analysis,
    system: diagnostics,
  };
}

function buildHistorySummary(rows = []) {
  const labelDistribution = summarizeDistribution(rows);
  const averageConfidence = Math.round(average(rows.map((item) => item.confidence)));
  const averageTrustScore = Math.round(average(rows.map((item) => item.trustScore ?? item.credibilityScore ?? 0)));
  const averageEvidenceConfidence = Math.round(average(rows.map((item) => toRoundedPercent(item.evidenceConfidence || 0))));
  const evidenceBackedCount = rows.filter((item) => item.evidence?.hasEvidence).length;
  const uncertainCount = rows.filter((item) => item.label === "UNCERTAIN").length;
  const topKeywords = collectTopTerms(rows.flatMap((item) => item.keywords || []), 8);
  const topDomains = collectTopTerms(rows.map((item) => item.sourceReputation?.domain || ""), 8);

  return {
    total: rows.length,
    labelDistribution,
    averageConfidence,
    averageTrustScore,
    averageEvidenceConfidence,
    evidenceBackedCount,
    uncertainCount,
    topKeywords,
    topDomains,
  };
}

function buildHistoryCharts(summary) {
  const labelItems = summary.labelDistribution.map((item) => ({
    label: item.label,
    value: item.value,
    displayValue: String(item.value),
    color: item.label === "FAKE" ? "#D96C6C" : item.label === "REAL" ? "#2A9D8F" : "#D4A72C",
  }));
  const scoreItems = [
    {
      label: "Avg Confidence",
      value: summary.averageConfidence,
      displayValue: `${summary.averageConfidence}%`,
      color: "#2E86AB",
    },
    {
      label: "Avg Trust",
      value: summary.averageTrustScore,
      displayValue: formatScore(summary.averageTrustScore),
      color: "#2A9D8F",
    },
    {
      label: "Avg Evidence",
      value: summary.averageEvidenceConfidence,
      displayValue: `${summary.averageEvidenceConfidence}%`,
      color: "#D4A72C",
    },
    {
      label: "Evidence-backed",
      value: summary.total ? Math.round((summary.evidenceBackedCount / summary.total) * 100) : 0,
      displayValue: `${summary.evidenceBackedCount}/${summary.total}`,
      color: "#11324A",
    },
  ];

  return [
    {
      title: "Prediction Distribution",
      items: labelItems,
      maxValue: Math.max(1, ...labelItems.map((item) => item.value)),
    },
    {
      title: "Portfolio Score Overview",
      items: scoreItems,
      maxValue: 100,
    },
  ];
}

function buildHistorySections(rows, summary, diagnostics = {}, filters = {}) {
  const filterSummary = [
    filters.search ? `Search filter: "${filters.search}"` : "Search filter: none",
    filters.label ? `Label filter: ${filters.label}` : "Label filter: all labels",
  ].join(" | ");
  const topDomains = summary.topDomains.length
    ? summary.topDomains.map((item) => `${item.value} (${item.count})`).join(", ")
    : "No domains available";
  const topKeywords = summary.topKeywords.length
    ? summary.topKeywords.map((item) => `${item.value} (${item.count})`).join(", ")
    : "No recurring keywords available";

  const itemSections = rows.slice(0, 20).map((item, index) => ({
    heading: `${index + 1}. ${item.title}`,
    body: [
      `Prediction: ${item.label} | Confidence: ${item.confidence}% | Trust score: ${formatScore(item.trustScore ?? item.credibilityScore ?? 0)} | Risk: ${
        item.riskLevel || "UNKNOWN"
      }`,
      `Source: ${item.source} | Domain: ${item.sourceReputation?.domain || "Unknown"} | Date: ${item.date}`,
      `Evidence: ${item.supportingArticlesCount || 0} supporting, ${item.contradictingArticlesCount || 0} contradicting, ${formatPercent(
        item.evidenceConfidence || 0
      )} evidence confidence, verdict ${item.evidenceVerdict || "UNVERIFIED"}`,
      `Keywords: ${uniqueStrings(item.keywords || [], 6).join(", ") || "None extracted"}`,
      `Summary: ${item.summary || item.textPreview || "No summary available."}`,
    ].join("\n"),
  }));

  return [
    {
      heading: "Executive Summary",
      tone: "accent",
      body: [
        `This export contains ${summary.total} saved analyses prepared by ${BRAND}.`,
        `Average confidence is ${summary.averageConfidence}%, average trust score is ${formatScore(summary.averageTrustScore)}, and ${
          summary.evidenceBackedCount
        } analysis record(s) contain trusted-source evidence.`,
        `Prediction mix: ${summary.labelDistribution.map((item) => `${item.label} ${item.value}`).join(", ")}.`,
        `Filter scope: ${filterSummary}.`,
      ].join("\n"),
    },
    {
      heading: "Portfolio Insights",
      body: [`Top analyzed domains: ${topDomains}`, `Top recurring keywords: ${topKeywords}`, `UNCERTAIN analyses: ${summary.uncertainCount}`].join("\n"),
    },
    ...itemSections,
    {
      heading: "System Information",
      body: buildSystemSummary(diagnostics),
    },
  ];
}

function buildHistoryExportPackage(rows, filters = {}, diagnostics = {}) {
  const generatedAt = formatDateTime();
  const summary = buildHistorySummary(rows);
  const report = {
    brand: BRAND,
    headerLabel: HISTORY_REPORT_LABEL,
    title: "Filtered Analysis History Export",
    subtitle: "Executive dashboard export covering saved analyses, model outcomes, and supporting evidence statistics.",
    metaLine: `Generated ${generatedAt} | ${summary.total} analyses | Model version ${diagnostics.model?.version || "Not available"}`,
    generatedAt,
    footerNote: `${BRAND} history export`,
    metricCards: [
      {
        label: "Analyses",
        value: String(summary.total),
        detail: "Filtered analysis records included in this export.",
        accentColor: "#11324A",
      },
      {
        label: "Avg Confidence",
        value: `${summary.averageConfidence}%`,
        detail: `Prediction distribution: ${summary.labelDistribution.map((item) => `${item.label} ${item.value}`).join(", ")}`,
        accentColor: "#2E86AB",
      },
      {
        label: "Avg Trust Score",
        value: formatScore(summary.averageTrustScore),
        detail: `${summary.evidenceBackedCount} evidence-backed analyses`,
        accentColor: "#2A9D8F",
      },
      {
        label: "Avg Evidence",
        value: `${summary.averageEvidenceConfidence}%`,
        detail: filters.label ? `Filtered by label ${filters.label}` : "All prediction labels included",
        accentColor: "#D4A72C",
      },
    ],
    charts: buildHistoryCharts(summary),
    sections: buildHistorySections(rows, summary, diagnostics, filters),
  };

  return {
    meta: {
      brand: BRAND,
      reportType: "history",
      generatedAt,
      headerLabel: HISTORY_REPORT_LABEL,
      filters,
    },
    summary,
    filters,
    charts: {
      predictionDistribution: summary.labelDistribution,
      topKeywords: summary.topKeywords,
      topDomains: summary.topDomains,
    },
    history: rows,
    report,
    system: diagnostics,
  };
}

function buildHistoryCsvRows(rows = [], diagnostics = {}) {
  return rows.map((row) => ({
    reportType: "history",
    exportedAt: formatDateTime(),
    title: row.title,
    articleText: buildArticleBody(row),
    source: row.source,
    url: row.url,
    prediction: row.label,
    confidence: row.confidence,
    trustScore: row.trustScore ?? row.credibilityScore ?? 0,
    trustLevel: row.trustLevel ?? "",
    riskLevel: row.riskLevel ?? "",
    model: row.model,
    modelVersion: row.modelVersion || diagnostics.model?.version || "",
    sourceDomain: row.sourceReputation?.domain || "",
    sourceTrustScore: row.sourceReputation?.trustScore ?? "",
    sourceReliability: row.sourceReputation?.reliability || "",
    politicalBias: row.sourceReputation?.politicalBias || "",
    evidenceVerdict: row.evidenceVerdict || "",
    evidenceConfidence: toRoundedPercent(row.evidenceConfidence || 0),
    supportingArticles: row.supportingArticlesCount || 0,
    contradictingArticles: row.contradictingArticlesCount || 0,
    trustedSourcesFound: serializeForCsv(row.trustedSourcesFound || []),
    keywords: serializeForCsv(row.keywords || []),
    influentialKeywords: serializeForCsv((row.influentialKeywords || []).map((item) => item.term)),
    entities: serializeForCsv(row.entities || {}),
    summary: row.summary,
    explanation: row.explanation,
    recommendation: row.recommendation,
    sentiment: row.sentiment?.label || "",
    language: row.languageInfo?.name || row.language || "",
    articleCategory: row.articleCategory?.label || "",
    readingComplexity: row.readingComplexity?.level || "",
    writingStyle: row.writingStyle?.label || "",
    emotion: row.emotion?.dominant || "",
    date: row.date,
  }));
}

function buildAnalysisCsvRow(analysis, diagnostics = {}) {
  return {
    reportType: "analysis",
    exportedAt: formatDateTime(),
    analysisId: analysis.id,
    title: analysis.title,
    articleText: buildArticleBody(analysis),
    source: analysis.source,
    url: analysis.url,
    author: analysis.author,
    publishedAt: analysis.publishedAt,
    prediction: analysis.label,
    confidence: analysis.confidence,
    trustScore: analysis.trustScore ?? analysis.credibilityScore ?? 0,
    trustLevel: analysis.trustLevel || "",
    riskLevel: analysis.riskLevel || "",
    summary: analysis.summary,
    explanation: analysis.explanation,
    recommendation: analysis.recommendation,
    warning: analysis.warning,
    probabilities: serializeForCsv(analysis.probabilities || {}),
    modelProbabilities: serializeForCsv(analysis.modelProbabilities || {}),
    keywords: serializeForCsv(analysis.keywords || []),
    influentialKeywords: serializeForCsv(analysis.influentialKeywords || []),
    suspiciousSentences: serializeForCsv(analysis.suspiciousSentences || []),
    trustReasons: serializeForCsv(analysis.trustReasons || []),
    trustSignals: serializeForCsv(analysis.trustSignals || []),
    ruleFindings: serializeForCsv(analysis.ruleFindings || []),
    evidenceVerdict: analysis.evidenceVerdict || "",
    evidenceConfidence: toRoundedPercent(analysis.evidenceConfidence || 0),
    similarityScore: toRoundedPercent(analysis.similarityScore || 0),
    trustedSourcesFound: serializeForCsv(analysis.trustedSourcesFound || []),
    supportingArticles: analysis.supportingArticlesCount || 0,
    contradictingArticles: analysis.contradictingArticlesCount || 0,
    claimAnalyses: serializeForCsv(analysis.claimAnalyses || []),
    entities: serializeForCsv(analysis.entities || {}),
    sentiment: serializeForCsv(analysis.sentiment || {}),
    language: analysis.languageInfo?.name || analysis.language || "",
    articleCategory: analysis.articleCategory?.label || "",
    readingComplexity: serializeForCsv(analysis.readingComplexity || {}),
    writingStyle: serializeForCsv(analysis.writingStyle || {}),
    emotion: serializeForCsv(analysis.emotion || {}),
    sourceDomain: analysis.sourceReputation?.domain || "",
    sourceTrustScore: analysis.sourceReputation?.trustScore ?? "",
    sourceBadge: analysis.sourceReputation?.badge || "",
    sourceReliability: analysis.sourceReputation?.reliability || "",
    model: analysis.model,
    modelVersion: analysis.modelVersion || diagnostics.model?.version || "",
    systemStatus: diagnostics.status || "",
    nodeVersion: diagnostics.runtime?.nodeVersion || "",
    dbClient: diagnostics.configuration?.dbClient || "",
    date: analysis.date,
  };
}

function buildSingleRowCsv(row) {
  return buildCsv([row], Object.keys(row).map((key) => ({ header: key, value: key })));
}

async function findAnalysisById(analysisId) {
  const database = await readDatabase();
  return database.analyses.map(toAnalysisRow).find((item) => item.id === analysisId) || null;
}

function buildJsonString(payload) {
  return JSON.stringify(payload, null, 2);
}

export async function exportHistoryCsv(filters = {}) {
  const [database, diagnostics] = await Promise.all([readDatabase(), getSystemDiagnostics()]);
  const rows = filterHistory(database.analyses, filters);

  return buildCsv(buildHistoryCsvRows(rows, diagnostics), [
    { header: "Report Type", value: "reportType" },
    { header: "Exported At", value: "exportedAt" },
    { header: "Title", value: "title" },
    { header: "Article", value: "articleText" },
    { header: "Source", value: "source" },
    { header: "URL", value: "url" },
    { header: "Prediction", value: "prediction" },
    { header: "Confidence", value: "confidence" },
    { header: "Trust Score", value: "trustScore" },
    { header: "Trust Level", value: "trustLevel" },
    { header: "Risk Level", value: "riskLevel" },
    { header: "Model", value: "model" },
    { header: "Model Version", value: "modelVersion" },
    { header: "Source Domain", value: "sourceDomain" },
    { header: "Source Trust Score", value: "sourceTrustScore" },
    { header: "Source Reliability", value: "sourceReliability" },
    { header: "Political Bias", value: "politicalBias" },
    { header: "Evidence Verdict", value: "evidenceVerdict" },
    { header: "Evidence Confidence", value: "evidenceConfidence" },
    { header: "Supporting Articles", value: "supportingArticles" },
    { header: "Contradicting Articles", value: "contradictingArticles" },
    { header: "Trusted Sources Found", value: "trustedSourcesFound" },
    { header: "Keywords", value: "keywords" },
    { header: "Influential Keywords", value: "influentialKeywords" },
    { header: "Entities", value: "entities" },
    { header: "Summary", value: "summary" },
    { header: "Explanation", value: "explanation" },
    { header: "Recommendation", value: "recommendation" },
    { header: "Sentiment", value: "sentiment" },
    { header: "Language", value: "language" },
    { header: "Article Category", value: "articleCategory" },
    { header: "Reading Complexity", value: "readingComplexity" },
    { header: "Writing Style", value: "writingStyle" },
    { header: "Emotion", value: "emotion" },
    { header: "Date", value: "date" },
  ]);
}

export async function exportHistoryJson(filters = {}) {
  const [database, diagnostics] = await Promise.all([readDatabase(), getSystemDiagnostics()]);
  const rows = filterHistory(database.analyses, filters);
  return buildJsonString(buildHistoryExportPackage(rows, filters, diagnostics));
}

export async function exportHistoryPdf(filters = {}) {
  const [database, diagnostics] = await Promise.all([readDatabase(), getSystemDiagnostics()]);
  const rows = filterHistory(database.analyses, filters);
  const reportPackage = buildHistoryExportPackage(rows, filters, diagnostics);
  return buildAcademicReportPdf(reportPackage.report);
}

export async function exportAnalysisCsv(analysisId) {
  const [analysis, diagnostics] = await Promise.all([findAnalysisById(analysisId), getSystemDiagnostics()]);

  if (!analysis) {
    return null;
  }

  return buildSingleRowCsv(buildAnalysisCsvRow(analysis, diagnostics));
}

export async function exportAnalysisJson(analysisId) {
  const [analysis, diagnostics] = await Promise.all([findAnalysisById(analysisId), getSystemDiagnostics()]);

  if (!analysis) {
    return null;
  }

  return buildJsonString(buildAnalysisExportPackage(analysis, diagnostics));
}

export async function exportAnalysisPdf(analysisId) {
  const [analysis, diagnostics] = await Promise.all([findAnalysisById(analysisId), getSystemDiagnostics()]);

  if (!analysis) {
    return null;
  }

  return buildAcademicReportPdf(buildAnalysisExportPackage(analysis, diagnostics).report);
}
