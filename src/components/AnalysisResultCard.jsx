import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleOff,
  FileDown,
  Globe2,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { api } from "../api";
import { RESULT_META } from "../constants";
import { InfoList } from "./InfoList";
import { SectionHeader } from "./SectionHeader";
import { SourceReputationBadge, SourceReputationCard } from "./SourceReputationCard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { EmptyState } from "./ui/empty-state";
import { Gauge } from "./ui/gauge";
import { ProgressBar } from "./ui/progress";

const CLAIM_VERDICT_META = {
  SUPPORTED: {
    label: "Supported",
    icon: CheckCircle2,
    badge: "trusted",
    border: "border-[rgba(52,211,153,0.24)]",
    background: "bg-[rgba(52,211,153,0.08)]",
  },
  UNVERIFIED: {
    label: "Unverified",
    icon: AlertTriangle,
    badge: "uncertain",
    border: "border-[rgba(255,194,102,0.24)]",
    background: "bg-[rgba(255,194,102,0.08)]",
  },
  CONTRADICTED: {
    label: "Contradicted",
    icon: XCircle,
    badge: "suspicious",
    border: "border-[rgba(255,92,118,0.24)]",
    background: "bg-[rgba(255,92,118,0.08)]",
  },
};

function resolveResultVariant(label) {
  if (label === "REAL") {
    return "real";
  }

  if (label === "FAKE") {
    return "fake";
  }

  return "uncertain";
}

function resolveGaugeTone(label) {
  if (label === "REAL") {
    return "success";
  }

  if (label === "FAKE") {
    return "danger";
  }

  return "warning";
}

function renderTagKey(item) {
  if (typeof item === "string") {
    return item;
  }

  return `${item.term || item.title || item.sentence || item.claim || item.label || item.emotion || item.style}-${item.weight || item.score || item.index || item.confidence || 0}`;
}

function ProbabilityList({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-[var(--muted-foreground)]">No probability data available.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ProgressBar key={item.label} label={item.label} value={item.value} helper={`${Math.round(item.value)}%`} tone={item.tone || "accent"} />
      ))}
    </div>
  );
}

function TagList({ items, renderLabel }) {
  if (!items?.length) {
    return <p className="text-sm text-[var(--muted-foreground)]">No additional evidence available.</p>;
  }

  return (
    <div className="tag-cloud">
      {items.map((item) => {
        const value = renderLabel ? renderLabel(item) : item;

        return <span key={renderTagKey(item)}>{value}</span>;
      })}
    </div>
  );
}

function InsightTile({ label, value, detail }) {
  return (
    <article className="metric-tile">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <strong className="text-[1.35rem]">{value}</strong>
      <p className="text-sm leading-6">{detail}</p>
    </article>
  );
}

function InfoCard({ eyebrow, title, description, children }) {
  return (
    <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5">
      <div className="space-y-3">
        <span className="eyebrow">{eyebrow}</span>
        <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{title}</h3>
        {description ? <p className="text-sm leading-7 text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

function EvidenceSourceCard({ source }) {
  return (
    <article className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel)] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <strong className="block text-base font-semibold text-[var(--foreground)]">{source.title}</strong>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{source.summary || source.snippet || "No summary available."}</p>
        </div>
        <Badge variant="info">{Math.round(Number(source.similarityScore || 0) * 100)}% similar</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="pill-chip">{source.source}</span>
        {source.publishedAt ? <span className="pill-chip">{source.publishedAt}</span> : null}
        <span className="pill-chip">{source.stance}</span>
      </div>
    </article>
  );
}

function ClaimVerificationCard({ claim, defaultOpen = false }) {
  const meta = CLAIM_VERDICT_META[claim.verdict] || CLAIM_VERDICT_META.UNVERIFIED;
  const Icon = meta.icon;

  return (
    <details
      open={defaultOpen}
      className={`overflow-hidden rounded-[28px] border ${meta.border} ${meta.background}`}
    >
      <summary className="cursor-pointer list-none p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Badge variant={meta.badge}>
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </Badge>
            <strong className="block text-lg font-semibold text-[var(--foreground)]">
              Claim {claim.index}: {claim.claim}
            </strong>
          </div>
          <div className="grid gap-2 text-sm text-[var(--muted-foreground)] md:text-right">
            <span>{claim.confidence}% confidence</span>
            <span>{claim.evidenceCount} evidence item(s)</span>
          </div>
        </div>
      </summary>

      <div className="space-y-5 border-t border-[var(--border-subtle)] px-5 pb-5 pt-4">
        <InfoList
          items={[
            { label: "Final Verdict", value: meta.label },
            { label: "Confidence", value: `${claim.confidence}%` },
            { label: "Similarity Score", value: `${Math.round(Number(claim.similarityScore || 0) * 100)}%` },
            {
              label: "Evidence Breakdown",
              value: `${claim.supportingArticlesCount} support / ${claim.contradictingArticlesCount} contradict / ${claim.relatedArticlesCount} related`,
            },
          ]}
        />

        <div className="space-y-2">
          <span className="eyebrow">Explanation</span>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">{claim.explanation}</p>
        </div>

        <div className="space-y-3">
          <span className="eyebrow">Evidence</span>
          {claim.evidence?.length ? (
            <div className="space-y-3">
              {claim.evidence.map((source) => (
                <EvidenceSourceCard key={`${claim.id}-${source.source}-${source.title}`} source={source} />
              ))}
            </div>
          ) : (
            <div className="callout callout-warning">Unable to verify this claim using trusted sources.</div>
          )}
        </div>
      </div>
    </details>
  );
}

function ExportButtons({ analysisId }) {
  if (!analysisId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" onClick={() => api.downloadAnalysisCsv(analysisId)}>
        <FileDown className="h-4 w-4" />
        Export CSV
      </Button>
      <Button type="button" variant="outline" onClick={() => api.downloadAnalysisJson(analysisId)}>
        <FileDown className="h-4 w-4" />
        Export JSON
      </Button>
      <Button type="button" variant="outline" onClick={() => api.downloadAnalysisPdf(analysisId)}>
        <FileDown className="h-4 w-4" />
        Export PDF
      </Button>
    </div>
  );
}

export function AnalysisResultCard({ analysis }) {
  if (!analysis) {
    return null;
  }

  const meta = RESULT_META[analysis.label] || RESULT_META.UNCERTAIN;
  const finalProbabilities = analysis.probabilities || {};
  const modelProbabilities = analysis.modelProbabilities || {};
  const evidence = analysis.evidence || null;
  const claimAnalyses = analysis.claimAnalyses || [];
  const trustSignals = analysis.trustSignals || [];
  const trustReasons = analysis.trustReasons || [];
  const trustScore = analysis.trustScore ?? analysis.credibilityScore;
  const evidenceAdjustedScore = analysis.evidenceAdjustedCredibilityScore ?? analysis.baseCredibilityScore ?? analysis.credibilityScore;
  const sourceReputation = analysis.url || (analysis.source && analysis.source !== "Manual input") ? analysis.sourceReputation || null : null;
  const languageInfo = analysis.languageInfo || analysis.nlpMetadata?.language || null;
  const keywordMetadata = analysis.keywordMetadata || analysis.nlpMetadata?.keywordExtraction || null;
  const topicDetection = analysis.topicDetection || analysis.nlpMetadata?.topicDetection || null;
  const articleCategory = analysis.articleCategory || analysis.nlpMetadata?.articleCategory || null;
  const readingComplexity = analysis.readingComplexity || analysis.nlpMetadata?.readingComplexity || null;
  const writingStyle = analysis.writingStyle || analysis.nlpMetadata?.writingStyle || null;
  const emotion = analysis.emotion || analysis.nlpMetadata?.emotion || null;
  const entityCounts = analysis.entities?.counts || null;
  const finalProbabilityItems = Object.entries(finalProbabilities).map(([label, value]) => ({
    label,
    value: Math.round(Number(value || 0) * 100),
    tone: label === "REAL" ? "success" : label === "FAKE" ? "danger" : "warning",
  }));
  const rawProbabilityItems = Object.entries(modelProbabilities).map(([label, value]) => ({
    label,
    value: Math.round(Number(value || 0) * 100),
    tone: label === "REAL" ? "success" : label === "FAKE" ? "danger" : "warning",
  }));

  return (
    <Card>
      <CardContent className="space-y-8">
        <SectionHeader
          eyebrow="Explainable Report"
          title={analysis.title}
          description={meta.description}
          badge={{ label: meta.badge, variant: resolveResultVariant(analysis.label) }}
          actions={<ExportButtons analysisId={analysis.id} />}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">
            <BrainCircuit className="h-3.5 w-3.5" />
            {analysis.model || "Model unavailable"}
          </Badge>
          <Badge variant="neutral">{analysis.modelVersion || "No model version"}</Badge>
          <Badge variant="neutral">{analysis.trustLevel || "Trust level unavailable"}</Badge>
          <Badge variant="neutral">{analysis.riskLevel || "Risk unavailable"}</Badge>
          {sourceReputation ? <SourceReputationBadge badge={sourceReputation.badge} /> : null}
        </div>

        {analysis.label === "UNCERTAIN" ? (
          <div className="callout callout-warning">
            This article is marked UNCERTAIN because the evidence is mixed or the confidence is below the configured threshold.
          </div>
        ) : null}
        {analysis.warning ? <div className="callout callout-warning">{analysis.warning}</div> : null}

        <div className="three-column-grid">
          <Gauge value={analysis.confidence} label="Confidence Score" helper="confidence" tone={resolveGaugeTone(analysis.label)} />
          <Gauge value={trustScore ?? 0} label="Trust Score" helper="trust" tone={resolveGaugeTone(analysis.label)} />
          <Gauge value={Math.round(Number(analysis.evidenceConfidence || 0) * 100)} label="Evidence Confidence" helper="evidence" tone="accent" />
        </div>

        <div className="four-column-grid">
          <InsightTile label="Prediction" value={analysis.label} detail={analysis.explanation || "Prediction explanation is not available."} />
          <InsightTile label="Trust Level" value={analysis.trustLevel || "Unknown"} detail={`Risk level: ${analysis.riskLevel || "Unknown"}`} />
          <InsightTile label="Final Trust Score" value={`${trustScore ?? "n/a"}/100`} detail={`Evidence-adjusted: ${evidenceAdjustedScore ?? "n/a"}/100`} />
          <InsightTile label="Source" value={analysis.source || "Manual input"} detail={analysis.author || "Author not provided"} />
        </div>

        <div className="two-column-grid">
          <InfoCard eyebrow="Explanation" title="Why the platform predicted this label" description="Machine learning, credibility rules, evidence verification, and writing signals all contribute here.">
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">{analysis.explanation}</p>
            <TagList items={trustReasons} />
          </InfoCard>

          <InfoCard eyebrow="Recommendation" title="Next best action" description="What an analyst or reader should do after reviewing this result.">
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">{analysis.recommendation || "No recommendation available."}</p>
            <InfoList
              items={[
                { label: "Confidence", value: `${analysis.confidence}%` },
                { label: "Evidence Verdict", value: analysis.evidenceVerdict || "UNVERIFIED" },
                { label: "Evidence-adjusted Score", value: `${evidenceAdjustedScore ?? "n/a"}/100` },
              ]}
            />
          </InfoCard>
        </div>

        {sourceReputation ? <SourceReputationCard sourceReputation={sourceReputation} /> : null}

        <div className="two-column-grid">
          <InfoCard eyebrow="Probability Distribution" title="Final credibility probabilities" description="The final probability distribution combines the model output with platform decision rules.">
            <ProbabilityList items={finalProbabilityItems} />
          </InfoCard>

          <InfoCard eyebrow="Raw ML Output" title="Model-only probabilities" description="Raw classifier scores before credibility adjustments and evidence weighting.">
            <ProbabilityList items={rawProbabilityItems} />
          </InfoCard>
        </div>

        <div className="two-column-grid">
          <InfoCard eyebrow="Influential Keywords" title="Terms that pushed the model" description="Top weighted terms that influenced the current prediction.">
            <TagList
              items={analysis.influentialKeywords}
              renderLabel={(item) => `${item.term} (${Math.round(Number(item.weight || 0) * 100)}%)${item.direction === "opposes" ? " opposes" : ""}`}
            />
          </InfoCard>

          <InfoCard eyebrow="Extracted Keywords" title="Content keywords" description="Keyword extraction from the article body and metadata.">
            <TagList
              items={keywordMetadata?.items || analysis.keywords}
              renderLabel={(item) =>
                typeof item === "string" ? item : `${item.term} (${Math.round(Number(item.score || 0))})${item.source ? ` - ${item.source}` : ""}`
              }
            />
          </InfoCard>
        </div>

        <div className="two-column-grid">
          <InfoCard eyebrow="Suspicious Sentences" title="Highlighted language risks" description="Sentences with strong sensational, emotional, or suspicious patterns.">
            {analysis.suspiciousSentences?.length ? (
              <div className="space-y-3">
                {analysis.suspiciousSentences.map((item, index) => (
                  <article key={`${item.sentence}-${index}`} className="rounded-[24px] border border-[rgba(255,194,102,0.24)] bg-[rgba(255,194,102,0.08)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-sm font-semibold text-[var(--foreground)]">{Math.round(Number(item.score || 0) * 100)}% suspicion</strong>
                      <Badge variant="uncertain">Sentence Flag</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{item.sentence}</p>
                    <p className="mt-2 text-xs leading-6 text-[var(--muted-foreground)]">{item.reasons?.join(", ") || "Model warning"}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No strongly suspicious sentences were highlighted.</p>
            )}
          </InfoCard>

          <InfoCard eyebrow="Credibility Rules" title="Rule engine findings" description="Rule-based signals blended into the final trust score.">
            {analysis.ruleFindings?.filter((item) => Number(item.score || 0) > 0).length ? (
              <div className="space-y-3">
                {analysis.ruleFindings
                  .filter((item) => Number(item.score || 0) > 0)
                  .slice(0, 6)
                  .map((item) => (
                    <article key={item.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
                        <Badge variant={Number(item.score || 0) >= 0.5 ? "uncertain" : "neutral"}>
                          {Math.round(Number(item.score || 0) * 100)}%
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.message}</p>
                      <p className="mt-2 text-xs leading-6 text-[var(--muted-foreground)]">{item.evidence}</p>
                    </article>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No strong rule-based credibility concerns were detected.</p>
            )}
          </InfoCard>
        </div>

        <InfoCard eyebrow="Evidence Verification" title="Claim support and contradiction report" description="Trusted-source search and semantic similarity are used to validate the article's factual claims.">
          {evidence?.hasEvidence ? (
            <>
              <InfoList
                items={[
                  { label: "Trusted Sources Found", value: analysis.trustedSourcesFound?.length || 0 },
                  { label: "Supporting Articles", value: analysis.supportingArticlesCount || 0 },
                  { label: "Contradicting Articles", value: analysis.contradictingArticlesCount || 0 },
                  { label: "Similarity Score", value: `${Math.round(Number(analysis.similarityScore || 0) * 100)}%` },
                  { label: "Evidence Confidence", value: `${Math.round(Number(analysis.evidenceConfidence || 0) * 100)}%` },
                  { label: "Evidence-adjusted Score", value: `${evidenceAdjustedScore ?? "n/a"}/100` },
                ]}
              />
              <div className="tag-cloud">
                {(analysis.trustedSourcesFound || []).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="callout callout-warning">Unable to verify this claim using trusted sources.</div>
          )}
        </InfoCard>

        <InfoCard eyebrow="Trust Signals" title="Weighted credibility components" description="Configurable weights combine model probability with writing, source, metadata, and evidence signals.">
          {trustSignals.length ? (
            <div className="two-column-grid">
              {trustSignals.map((signal) => (
                <article key={signal.key} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="block text-base font-semibold text-[var(--foreground)]">{signal.title}</strong>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        {signal.score >= 60 ? signal.positiveReason : signal.cautionReason}
                      </p>
                    </div>
                    <Badge variant={signal.score >= 60 ? "real" : "uncertain"}>
                      {signal.score}/100
                    </Badge>
                  </div>
                  <ProgressBar className="mt-4" label="Weight" value={Math.round(Number(signal.weight || 0) * 100)} helper={`${signal.weight}`} tone="accent" />
                  <p className="mt-3 text-xs leading-6 text-[var(--muted-foreground)]">{signal.evidence}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No trust signal breakdown is available.</p>
          )}
        </InfoCard>

        <InfoCard eyebrow="Claim Verification" title="Extracted factual claims" description="Each claim is checked separately and can be expanded for detailed supporting or contradicting evidence.">
          {claimAnalyses.length ? (
            <div className="space-y-4">
              {claimAnalyses.map((claim, index) => (
                <ClaimVerificationCard key={claim.id || claim.index} claim={claim} defaultOpen={index === 0} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No extracted claims"
              description="No individual factual claims could be extracted from this article."
              className="min-h-[220px]"
            />
          )}
        </InfoCard>

        <InfoCard eyebrow="Article Summary" title="Condensed narrative" description="A short summary to help the user review the article before deciding what to trust.">
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">{analysis.summary || "No summary available."}</p>
        </InfoCard>

        <InfoCard eyebrow="Advanced NLP" title="Language, topic, sentiment, and writing profile" description="Stored metadata extracted from the article text for explainability and analytics.">
          <div className="three-column-grid">
            <InsightTile
              label="Language"
              value={languageInfo?.name || analysis.language || "Unknown"}
              detail={
                languageInfo?.confidence
                  ? `${Math.round(Number(languageInfo.confidence || 0) * 100)}% detection confidence`
                  : "Automatic language detection"
              }
            />
            <InsightTile label="Article Category" value={articleCategory?.label || "General"} detail={articleCategory?.primaryTopic || "Primary editorial category"} />
            <InsightTile
              label="Primary Topic"
              value={topicDetection?.primary?.label || "General News"}
              detail={
                topicDetection?.primary?.confidence
                  ? `${Math.round(Number(topicDetection.primary.confidence || 0) * 100)}% topical confidence`
                  : "Topic detection"
              }
            />
            <InsightTile
              label="Reading Complexity"
              value={readingComplexity?.level || "Standard"}
              detail={readingComplexity ? `Flesch ${readingComplexity.fleschReadingEase}` : "Readability estimate"}
            />
            <InsightTile
              label="Writing Style"
              value={writingStyle?.label || "Not available"}
              detail={
                writingStyle?.confidence
                  ? `${Math.round(Number(writingStyle.confidence || 0) * 100)}% style confidence`
                  : "Tone and structure analysis"
              }
            />
            <InsightTile label="Dominant Emotion" value={emotion?.dominant || "neutral"} detail={emotion?.summary || "Emotion profile detected from language cues"} />
          </div>
        </InfoCard>

        <div className="two-column-grid">
          <InfoCard eyebrow="Topic Detection" title="Topic distribution" description="Probability across editorial themes and article categories.">
            <TagList
              items={topicDetection?.distribution || []}
              renderLabel={(item) => `${item.label} (${Math.round(Number(item.confidence || item.strength || 0) * 100)}%)`}
            />
          </InfoCard>

          <InfoCard eyebrow="Emotion Detection" title="Emotion distribution" description="Detected emotional mix across the article's wording.">
            <ProbabilityList
              items={(emotion?.distribution || []).map((item) => ({
                label: item.emotion,
                value: Math.round(Number(item.score || 0) * 100),
                tone: "accent",
              }))}
            />
          </InfoCard>
        </div>

        <div className="two-column-grid">
          <InfoCard eyebrow="Reading Complexity" title="Readability and structure" description="Useful for spotting sensational, low-quality, or unnatural writing patterns.">
            <InfoList
              items={[
                { label: "Reading Level", value: readingComplexity?.level || "Standard" },
                { label: "Estimated Reading Time", value: `${readingComplexity?.readingTimeMinutes || analysis.articleStats?.readingTimeMinutes || 1} min` },
                { label: "Grade Level", value: readingComplexity?.fleschKincaidGrade ?? "n/a" },
                { label: "Avg Sentence Length", value: `${readingComplexity?.averageSentenceLength ?? "n/a"} words` },
                {
                  label: "Lexical Diversity",
                  value: `${Math.round(Number(readingComplexity?.lexicalDiversity || analysis.articleStats?.lexicalDiversity || 0) * 100)}%`,
                },
              ]}
            />
          </InfoCard>

          <InfoCard eyebrow="Writing Style Detection" title="Tone and narrative style" description="Style cues contribute to both explanation quality and trust scoring.">
            <InfoList
              items={[
                { label: "Dominant Style", value: writingStyle?.label || "Not available" },
                { label: "Style Confidence", value: `${Math.round(Number(writingStyle?.confidence || 0) * 100)}%` },
              ]}
            />
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              {writingStyle?.rationale || "Writing style analysis is not available for this article."}
            </p>
            <TagList items={writingStyle?.indicators || []} />
          </InfoCard>
        </div>

        <div className="two-column-grid">
          <InfoCard eyebrow="Sentiment Analysis" title="Article sentiment profile" description="Sentiment, polarity, and emotional intensity extracted from the article text.">
            <InfoList
              items={[
                { label: "Label", value: analysis.sentiment?.label || "Not available" },
                { label: "Score", value: analysis.sentiment?.score ?? "n/a" },
                { label: "Emotional Intensity", value: `${Math.round(Number(analysis.sentiment?.emotionalIntensity || 0) * 100)}%` },
                { label: "Positive vs Negative", value: `${analysis.sentiment?.positiveCount || 0} / ${analysis.sentiment?.negativeCount || 0}` },
              ]}
            />
          </InfoCard>

          <InfoCard eyebrow="Claim Summary" title="Claim outcome totals" description="High-level verdict counts for extracted claims.">
            <InfoList
              items={[
                { label: "Supported Claims", value: analysis.supportedClaimsCount || 0 },
                { label: "Unverified Claims", value: analysis.unverifiedClaimsCount || 0 },
                { label: "Contradicted Claims", value: analysis.contradictedClaimsCount || 0 },
                { label: "Evidence Verdict", value: analysis.evidenceVerdict || "UNVERIFIED" },
              ]}
            />
          </InfoCard>
        </div>

        <InfoCard eyebrow="Named Entities" title="People, organizations, places, dates, and sources" description="Structured entities extracted for analyst review and dashboard analytics.">
          {entityCounts ? (
            <div className="mb-5 flex items-center gap-2">
              <Badge variant="neutral">
                <Target className="h-3.5 w-3.5" />
                {entityCounts.total} entities captured
              </Badge>
            </div>
          ) : null}

          <div className="three-column-grid">
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4">
              <strong className="text-sm font-semibold text-[var(--foreground)]">People</strong>
              <div className="mt-3">
                <TagList items={analysis.entities?.people} />
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4">
              <strong className="text-sm font-semibold text-[var(--foreground)]">Organizations</strong>
              <div className="mt-3">
                <TagList items={analysis.entities?.organizations} />
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4">
              <strong className="text-sm font-semibold text-[var(--foreground)]">Locations</strong>
              <div className="mt-3">
                <TagList items={analysis.entities?.locations} />
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4">
              <strong className="text-sm font-semibold text-[var(--foreground)]">Dates</strong>
              <div className="mt-3">
                <TagList items={analysis.entities?.dates} />
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel)] p-4 lg:col-span-2">
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[var(--accent-strong)]" />
                <strong className="text-sm font-semibold text-[var(--foreground)]">Sources</strong>
              </div>
              <div className="mt-3">
                <TagList items={analysis.entities?.sources} />
              </div>
            </div>
          </div>
        </InfoCard>

        <InfoCard eyebrow="Article Metadata" title="Source, author, dates, and model version" description="Operational metadata stored with the final analysis record.">
          <InfoList
            items={[
              { label: "Source", value: analysis.source || "Manual input" },
              { label: "Author", value: analysis.author || "Not provided" },
              { label: "Published", value: analysis.publishedAt || "Not provided" },
              { label: "Model Version", value: analysis.modelVersion || "Not available" },
              { label: "Saved", value: analysis.date || "Not available" },
              { label: "Model", value: analysis.model || "Not available" },
            ]}
          />
        </InfoCard>

        <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span className="pill-chip">
              <Sparkles className="h-3.5 w-3.5" />
              Model: {analysis.model}
            </span>
            <span className="pill-chip">
              <ArrowRight className="h-3.5 w-3.5" />
              Saved: {analysis.date}
            </span>
          </div>
          <ExportButtons analysisId={analysis.id} />
        </div>
      </CardContent>
    </Card>
  );
}
