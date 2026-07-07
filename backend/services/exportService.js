import { readDatabase, toAnalysisRow } from "../database.js";
import { buildCsv } from "../utils/csv.js";
import { formatDateTime } from "../utils/date.js";
import { buildPdfDocument } from "../utils/pdfDocument.js";
import { normalizeResultLabel } from "../utils/labels.js";

function filterHistory(items = [], { search = "", label = "" } = {}) {
  return items
    .map(toAnalysisRow)
    .filter((item) => !label || normalizeResultLabel(item.label) === normalizeResultLabel(label))
    .filter((item) => {
      if (!search) {
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
      return haystack.includes(search);
    });
}

export async function exportHistoryCsv(filters = {}) {
  const database = await readDatabase();
  const rows = filterHistory(database.analyses, filters);

  return buildCsv(rows, [
    { header: "ID", value: "id" },
    { header: "Title", value: "title" },
    { header: "Label", value: "label" },
    { header: "Confidence", value: (row) => row.confidence },
    { header: "Trust Score", value: (row) => row.trustScore ?? row.credibilityScore ?? "" },
    { header: "Trust Level", value: (row) => row.trustLevel ?? "" },
    { header: "Trust Reasons", value: (row) => (row.trustReasons || []).join(" | ") },
    { header: "Evidence Adjusted Score", value: (row) => row.evidenceAdjustedCredibilityScore ?? "" },
    { header: "Source", value: "source" },
    { header: "Source Domain", value: (row) => row.sourceReputation?.domain ?? "" },
    { header: "Source Badge", value: (row) => row.sourceReputation?.badge ?? "" },
    { header: "Political Bias", value: (row) => row.sourceReputation?.politicalBias ?? "" },
    { header: "Country", value: (row) => row.sourceReputation?.country ?? "" },
    { header: "Reliability", value: (row) => row.sourceReputation?.reliability ?? "" },
    { header: "Fact Checking History", value: (row) => row.sourceReputation?.factCheckingHistory ?? "" },
    { header: "Author", value: (row) => row.author ?? "" },
    { header: "Published At", value: (row) => row.publishedAt ?? "" },
    { header: "Model", value: "model" },
    { header: "Model Version", value: (row) => row.modelVersion ?? "" },
    { header: "Risk Level", value: "riskLevel" },
    { header: "Evidence Confidence", value: (row) => row.evidenceConfidence ?? "" },
    { header: "Evidence Verdict", value: (row) => row.evidenceVerdict ?? "" },
    { header: "Supported Claims", value: (row) => row.supportedClaimsCount ?? 0 },
    { header: "Contradicted Claims", value: (row) => row.contradictedClaimsCount ?? 0 },
    { header: "Unverified Claims", value: (row) => row.unverifiedClaimsCount ?? 0 },
    { header: "Supporting Articles", value: (row) => row.supportingArticlesCount ?? 0 },
    { header: "Contradicting Articles", value: (row) => row.contradictingArticlesCount ?? 0 },
    { header: "Trusted Sources", value: (row) => (row.trustedSourcesFound || []).join(" | ") },
    { header: "Sentiment", value: (row) => row.sentiment?.label ?? "" },
    { header: "Recommendation", value: (row) => row.recommendation ?? "" },
    { header: "Summary", value: "summary" },
    { header: "Date", value: "date" },
  ]);
}

export async function exportHistoryPdf(filters = {}) {
  const database = await readDatabase();
  const rows = filterHistory(database.analyses, filters).slice(0, 40);
  const sections = rows.map((item, index) => ({
    heading: `${index + 1}. ${item.title}`,
    body: [
      `Prediction: ${item.label} (${item.confidence}% confidence, trust score ${item.trustScore ?? item.credibilityScore ?? "n/a"}/100, ${item.trustLevel || "Trust level unavailable"})`,
      `Source: ${item.source} | Model: ${item.model}${item.modelVersion ? ` ${item.modelVersion}` : ""} | Date: ${item.date}`,
      `Source reputation: ${item.sourceReputation?.domain || "Unknown domain"} | ${item.sourceReputation?.badge || "Unknown"} | ${
        item.sourceReputation?.politicalBias || "Unknown bias"
      } | ${item.sourceReputation?.country || "Unknown country"} | ${item.sourceReputation?.reliability || "Unknown reliability"}`,
      `Fact-checking history: ${item.sourceReputation?.factCheckingHistory || "No local source reputation history stored."}`,
      `Trust summary: ${item.trustExplanation || "No trust explanation stored."}`,
      `Evidence: ${item.supportingArticlesCount ?? 0} supporting, ${item.contradictingArticlesCount ?? 0} contradicting, ${Math.round(
        Number(item.evidenceConfidence || 0) * 100
      )}% confidence, verdict ${item.evidenceVerdict || "UNVERIFIED"}`,
      `Claims: ${item.supportedClaimsCount ?? 0} supported, ${item.contradictedClaimsCount ?? 0} contradicted, ${item.unverifiedClaimsCount ?? 0} unverified`,
      `Summary: ${item.summary || item.textPreview || "No summary available."}`,
      `Recommendation: ${item.recommendation || "No recommendation available."}`,
    ].join("\n"),
  }));

  return buildPdfDocument({
    title: `Verity Lens History Export - ${formatDateTime()}`,
    sections,
  });
}

export async function exportAnalysisPdf(analysisId) {
  const database = await readDatabase();
  const analysis = database.analyses.map(toAnalysisRow).find((item) => item.id === analysisId);

  if (!analysis) {
    return null;
  }

  return buildPdfDocument({
    title: `Article Analysis Report - ${analysis.title}`,
    sections: [
      {
        heading: "Prediction",
        body: `Label: ${analysis.label}\nConfidence: ${analysis.confidence}%\nTrust Score: ${analysis.trustScore ?? analysis.credibilityScore ?? "n/a"}/100\nTrust Level: ${
          analysis.trustLevel || "Not available"
        }\nEvidence Adjusted Score: ${analysis.evidenceAdjustedCredibilityScore ?? "n/a"}/100\nModel: ${analysis.model}${
          analysis.modelVersion ? ` (${analysis.modelVersion})` : ""
        }`,
      },
      {
        heading: "Trust Score",
        body: [
          analysis.trustExplanation || "No trust explanation stored.",
          analysis.trustReasons?.length ? `Reasons: ${analysis.trustReasons.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        heading: "Source Reputation",
        body: `Domain: ${analysis.sourceReputation?.domain || "Unknown domain"}\nBadge: ${analysis.sourceReputation?.badge || "Unknown"}\nTrust Score: ${
          analysis.sourceReputation?.trustScore ?? 50
        }/100\nPolitical Bias: ${analysis.sourceReputation?.politicalBias || "Unknown"}\nCountry: ${
          analysis.sourceReputation?.country || "Unknown"
        }\nReliability: ${analysis.sourceReputation?.reliability || "Unknown"}\nFact Checking History: ${
          analysis.sourceReputation?.factCheckingHistory || "No local source reputation history stored."
        }`,
      },
      {
        heading: "Explanation",
        body: analysis.explanation || "No explanation stored.",
      },
      {
        heading: "Recommendation",
        body: analysis.recommendation || "No recommendation stored.",
      },
      {
        heading: "Evidence Verification",
        body: analysis.evidence?.hasEvidence
          ? `Trusted sources: ${(analysis.trustedSourcesFound || []).join(", ") || "None"}\nSupporting: ${
              analysis.supportingArticlesCount ?? 0
            }\nContradicting: ${analysis.contradictingArticlesCount ?? 0}\nSimilarity: ${Math.round(
              Number(analysis.similarityScore || 0) * 100
            )}%\nEvidence confidence: ${Math.round(Number(analysis.evidenceConfidence || 0) * 100)}%\nEvidence verdict: ${
              analysis.evidenceVerdict || "UNVERIFIED"
            }\nClaim summary: ${analysis.supportedClaimsCount ?? 0} supported, ${analysis.contradictedClaimsCount ?? 0} contradicted, ${
              analysis.unverifiedClaimsCount ?? 0
            } unverified`
          : "Unable to verify this claim using trusted sources.",
      },
      {
        heading: "Claim Verification",
        body:
          analysis.claimAnalyses?.length
            ? analysis.claimAnalyses
                .map((claim) => `${claim.index}. ${claim.finalVerdict}: ${claim.claim} (${claim.confidence ?? 0}% confidence)`)
                .join("\n")
            : "No claim-level verification stored.",
      },
      {
        heading: "Summary",
        body: analysis.summary || analysis.textPreview || "No summary stored.",
      },
      {
        heading: "Suspicious Sentences",
        body:
          analysis.suspiciousSentences?.length
            ? analysis.suspiciousSentences.map((item, index) => `${index + 1}. ${item.sentence} (${item.reasons.join(", ")})`).join("\n")
            : "No suspicious sentences highlighted.",
      },
    ],
  });
}
