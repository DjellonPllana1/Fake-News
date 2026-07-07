import { api } from "../api";
import { RESULT_META } from "../constants";
import { SourceReputationBadge, SourceReputationCard } from "./SourceReputationCard";

const CLAIM_VERDICT_META = {
  SUPPORTED: {
    label: "Supported",
    symbol: "\u2713",
    tone: "supported",
  },
  UNVERIFIED: {
    label: "Unverified",
    symbol: "\u26A0",
    tone: "unverified",
  },
  CONTRADICTED: {
    label: "Contradicted",
    symbol: "\u2717",
    tone: "contradicted",
  },
};

function ProbabilityRow({ label, value }) {
  const percentage = Math.round(Number(value || 0) * 100);

  return (
    <div className="probability-row">
      <div className="probability-row__label">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="probability-bar">
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function TagList({ items, renderLabel }) {
  if (!items?.length) {
    return <span className="muted-text">No additional evidence available.</span>;
  }

  return (
    <div className="tag-list">
      {items.map((item) => {
        const value = renderLabel ? renderLabel(item) : item;
        const key =
          typeof item === "string"
            ? item
            : `${item.term || item.title || item.sentence || item.claim || item.label || item.emotion || item.style}-${item.weight || item.score || item.index || item.confidence || 0}`;
        return <span key={key}>{value}</span>;
      })}
    </div>
  );
}

function EntityGroup({ title, values }) {
  return (
    <div className="entity-group">
      <strong>{title}</strong>
      <TagList items={values} />
    </div>
  );
}

function InsightTile({ label, value, detail }) {
  return (
    <article className="nlp-insight-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ScoreRows({ items = [], labelKey = "label", valueKey = "score", suffix = "%", scale = 100 }) {
  if (!items.length) {
    return <p>No structured scores are available.</p>;
  }

  return (
    <div className="probability-list">
      {items.map((item) => {
        const label = item[labelKey];
        const numericValue = Number(item[valueKey] || 0);
        const percentage = Math.round(numericValue * scale);

        return (
          <div key={`${label}-${percentage}`} className="probability-row">
            <div className="probability-row__label">
              <span>{label}</span>
              <span>
                {percentage}
                {suffix}
              </span>
            </div>
            <div className="probability-bar">
              <span style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EvidenceSourceCard({ source }) {
  return (
    <article className="evidence-source-card">
      <div className="rule-card__header">
        <strong>{source.title}</strong>
        <span>{Math.round(Number(source.similarityScore || 0) * 100)}% similar</span>
      </div>
      <p>{source.summary || source.snippet || "No summary available."}</p>
      <small>
        {source.source} {source.publishedAt ? `| ${source.publishedAt}` : ""} | {source.stance}
      </small>
    </article>
  );
}

function ClaimVerificationCard({ claim, defaultOpen = false }) {
  const meta = CLAIM_VERDICT_META[claim.verdict] || CLAIM_VERDICT_META.UNVERIFIED;

  return (
    <details className={`claim-card claim-card--${meta.tone}`} open={defaultOpen}>
      <summary className="claim-card__summary">
        <div className="claim-card__summary-main">
          <span className={`claim-verdict claim-verdict--${meta.tone}`}>
            {meta.symbol} {meta.label}
          </span>
          <strong>
            Claim {claim.index}: {claim.claim}
          </strong>
        </div>

        <div className="claim-card__summary-metrics">
          <span>{claim.confidence}% confidence</span>
          <span>{claim.evidenceCount} evidence item(s)</span>
        </div>
      </summary>

      <div className="claim-card__body">
        <div className="detail-list">
          <div className="detail-list__row">
            <span>Final Verdict</span>
            <strong>
              {meta.symbol} {meta.label}
            </strong>
          </div>
          <div className="detail-list__row">
            <span>Confidence</span>
            <strong>{claim.confidence}%</strong>
          </div>
          <div className="detail-list__row">
            <span>Similarity Score</span>
            <strong>{Math.round(Number(claim.similarityScore || 0) * 100)}%</strong>
          </div>
          <div className="detail-list__row">
            <span>Evidence Breakdown</span>
            <strong>
              {claim.supportingArticlesCount} support / {claim.contradictingArticlesCount} contradict / {claim.relatedArticlesCount} related
            </strong>
          </div>
        </div>

        <div className="claim-card__section">
          <span className="eyebrow">Explanation</span>
          <p>{claim.explanation}</p>
        </div>

        <div className="claim-card__section">
          <span className="eyebrow">Evidence</span>
          {claim.evidence?.length ? (
            <div className="evidence-source-list">
              {claim.evidence.map((source) => (
                <EvidenceSourceCard key={`${claim.id}-${source.source}-${source.title}`} source={source} />
              ))}
            </div>
          ) : (
            <div className="inline-warning">Unable to verify this claim using trusted sources.</div>
          )}
        </div>
      </div>
    </details>
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

  return (
    <section className="panel result-card">
      <div className="result-card__header">
        <div>
          <span className={`status-badge status-badge--${meta.tone}`}>{meta.badge}</span>
          <h2>{analysis.title}</h2>
          <p>{meta.description}</p>
          {sourceReputation ? <SourceReputationBadge badge={sourceReputation.badge} /> : null}
        </div>

        <div className="result-card__numbers">
          <div>
            <span>Confidence</span>
            <strong>{analysis.confidence}%</strong>
          </div>
          <div>
            <span>Trust Score</span>
            <strong>{trustScore ?? "n/a"}/100</strong>
          </div>
          <div>
            <span>Trust Level</span>
            <strong>{analysis.trustLevel || "Not available"}</strong>
          </div>
        </div>
      </div>

      {analysis.label === "UNCERTAIN" ? (
        <div className="inline-warning">This article is marked UNCERTAIN because the evidence is mixed or the confidence is below the configured threshold.</div>
      ) : null}

      <div className="result-card__body">
        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Trust Score</span>
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Final Trust Score</span>
                <strong>{trustScore ?? "n/a"}/100</strong>
              </div>
              <div className="detail-list__row">
                <span>Trust Level</span>
                <strong>{analysis.trustLevel || "Not available"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Evidence-adjusted Score</span>
                <strong>{evidenceAdjustedScore ?? "n/a"}/100</strong>
              </div>
              <div className="detail-list__row">
                <span>Risk Level</span>
                <strong>{analysis.riskLevel}</strong>
              </div>
            </div>
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Reason</span>
            <p>{analysis.trustExplanation || "No trust explanation available."}</p>
            {trustReasons.length ? <TagList items={trustReasons} /> : <p>No specific trust reasons were stored for this analysis.</p>}
          </div>
        </div>

        <div className="result-card__block">
          <span className="eyebrow">Explanation</span>
          <p>{analysis.explanation}</p>
        </div>

        <div className="result-card__block">
          <span className="eyebrow">Recommendation</span>
          <p>{analysis.recommendation || "No recommendation available."}</p>
        </div>

        <SourceReputationCard sourceReputation={sourceReputation} />

        <div className="result-card__block">
          <div className="panel__header panel__header--split">
            <div>
              <span className="eyebrow">Advanced NLP</span>
              <h3>Language, Topic, and Style Intelligence</h3>
            </div>
            <span className="muted-text">Stored metadata profile</span>
          </div>

          <div className="nlp-insight-grid">
            <InsightTile
              label="Language"
              value={languageInfo?.name || analysis.language || "Unknown"}
              detail={
                languageInfo?.confidence
                  ? `${Math.round(Number(languageInfo.confidence || 0) * 100)}% detection confidence`
                  : "Automatic language detection"
              }
            />
            <InsightTile
              label="Article Category"
              value={articleCategory?.label || "General"}
              detail={articleCategory?.primaryTopic || "Primary editorial category"}
            />
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
            <InsightTile
              label="Dominant Emotion"
              value={emotion?.dominant || "neutral"}
              detail={emotion?.summary || "Emotion profile detected from language cues"}
            />
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Language and Category</span>
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Detected Language</span>
                <strong>{languageInfo?.name || analysis.language || "Unknown"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Language Confidence</span>
                <strong>{Math.round(Number(languageInfo?.confidence || 0) * 100)}%</strong>
              </div>
              <div className="detail-list__row">
                <span>Article Category</span>
                <strong>{articleCategory?.label || "General"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Primary Topic</span>
                <strong>{topicDetection?.primary?.label || "General News"}</strong>
              </div>
            </div>
            <p>{articleCategory?.rationale || "Topical classification is based on headline/body keyword patterns."}</p>
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Reading Complexity</span>
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Reading Level</span>
                <strong>{readingComplexity?.level || "Standard"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Estimated Reading Time</span>
                <strong>{readingComplexity?.readingTimeMinutes || analysis.articleStats?.readingTimeMinutes || 1} min</strong>
              </div>
              <div className="detail-list__row">
                <span>Grade Level</span>
                <strong>{readingComplexity?.fleschKincaidGrade ?? "n/a"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Avg Sentence Length</span>
                <strong>{readingComplexity?.averageSentenceLength ?? "n/a"} words</strong>
              </div>
              <div className="detail-list__row">
                <span>Lexical Diversity</span>
                <strong>{Math.round(Number(readingComplexity?.lexicalDiversity || analysis.articleStats?.lexicalDiversity || 0) * 100)}%</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Topic Detection</span>
            <TagList
              items={topicDetection?.distribution || []}
              renderLabel={(item) => `${item.label} (${Math.round(Number(item.confidence || item.strength || 0) * 100)}%)`}
            />
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Emotion Detection</span>
            <ScoreRows
              items={(emotion?.distribution || []).map((item) => ({
                label: item.emotion,
                score: item.score,
              }))}
            />
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Writing Style Detection</span>
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Dominant Style</span>
                <strong>{writingStyle?.label || "Not available"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Style Confidence</span>
                <strong>{Math.round(Number(writingStyle?.confidence || 0) * 100)}%</strong>
              </div>
            </div>
            <p>{writingStyle?.rationale || "Writing style analysis is not available for this article."}</p>
            <TagList items={writingStyle?.indicators || []} />
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Keyword Extraction</span>
            <TagList
              items={keywordMetadata?.items || []}
              renderLabel={(item) => `${item.term} (${Math.round(Number(item.score || 0))})${item.source ? ` · ${item.source}` : ""}`}
            />
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Claim Summary</span>
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Supported Claims</span>
                <strong>{analysis.supportedClaimsCount || 0}</strong>
              </div>
              <div className="detail-list__row">
                <span>Unverified Claims</span>
                <strong>{analysis.unverifiedClaimsCount || 0}</strong>
              </div>
              <div className="detail-list__row">
                <span>Contradicted Claims</span>
                <strong>{analysis.contradictedClaimsCount || 0}</strong>
              </div>
              <div className="detail-list__row">
                <span>Evidence Verdict</span>
                <strong>{analysis.evidenceVerdict || "UNVERIFIED"}</strong>
              </div>
            </div>
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Evidence Verification</span>
            {evidence?.hasEvidence ? (
              <div className="detail-list">
                <div className="detail-list__row">
                  <span>Trusted Sources Found</span>
                  <strong>{analysis.trustedSourcesFound?.length || 0}</strong>
                </div>
                <div className="detail-list__row">
                  <span>Supporting Articles</span>
                  <strong>{analysis.supportingArticlesCount || 0}</strong>
                </div>
                <div className="detail-list__row">
                  <span>Contradicting Articles</span>
                  <strong>{analysis.contradictingArticlesCount || 0}</strong>
                </div>
                <div className="detail-list__row">
                  <span>Similarity Score</span>
                  <strong>{Math.round(Number(analysis.similarityScore || 0) * 100)}%</strong>
                </div>
                <div className="detail-list__row">
                  <span>Evidence Confidence</span>
                  <strong>{Math.round(Number(analysis.evidenceConfidence || 0) * 100)}%</strong>
                </div>
                <div className="detail-list__row">
                  <span>Evidence-adjusted Score</span>
                  <strong>{evidenceAdjustedScore ?? "n/a"}/100</strong>
                </div>
              </div>
            ) : (
              <div className="inline-warning">Unable to verify this claim using trusted sources.</div>
            )}
          </div>
        </div>

        <div className="result-card__block">
          <div className="panel__header panel__header--split">
            <div>
              <span className="eyebrow">Trust Signals</span>
              <h3>Weighted Credibility Components</h3>
            </div>
            <span className="muted-text">{trustSignals.length} configurable factors</span>
          </div>

          <div className="rule-list">
            {trustSignals.length ? (
              trustSignals.map((signal) => (
                <article key={signal.key} className="rule-card">
                  <div className="rule-card__header">
                    <strong>{signal.title}</strong>
                    <span>
                      {signal.score}/100 | weight {signal.weight}
                    </span>
                  </div>
                  <p>{signal.score >= 60 ? signal.positiveReason : signal.cautionReason}</p>
                  <small>{signal.evidence}</small>
                </article>
              ))
            ) : (
              <p>No trust signal breakdown is available.</p>
            )}
          </div>
        </div>

        <div className="result-card__block">
          <div className="panel__header panel__header--split">
            <div>
              <span className="eyebrow">Claim Verification</span>
              <h3>Expanded Claim Checks</h3>
            </div>
            <span className="muted-text">{claimAnalyses.length} extracted claims</span>
          </div>

          <div className="claim-list">
            {claimAnalyses.length ? (
              claimAnalyses.map((claim, index) => <ClaimVerificationCard key={claim.id || claim.index} claim={claim} defaultOpen={index === 0} />)
            ) : (
              <div className="inline-warning">No individual factual claims could be extracted from this article.</div>
            )}
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Trusted Source Names</span>
            <TagList items={analysis.trustedSourcesFound} />
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Article Summary</span>
            <p>{analysis.summary || "No summary available."}</p>
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Metadata</span>
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Source</span>
                <strong>{analysis.source || "Manual input"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Author</span>
                <strong>{analysis.author || "Not provided"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Published</span>
                <strong>{analysis.publishedAt || "Not provided"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Model Version</span>
                <strong>{analysis.modelVersion || "Not available"}</strong>
              </div>
            </div>
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Final Probability Distribution</span>
            <div className="probability-list">
              {Object.entries(finalProbabilities).length ? (
                Object.entries(finalProbabilities).map(([label, value]) => <ProbabilityRow key={label} label={label} value={value} />)
              ) : (
                <p>No probability data available.</p>
              )}
            </div>
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Raw ML Probabilities</span>
            <div className="probability-list">
              {Object.entries(modelProbabilities).length ? (
                Object.entries(modelProbabilities).map(([label, value]) => <ProbabilityRow key={label} label={label} value={value} />)
              ) : (
                <p>No model probability data available.</p>
              )}
            </div>
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Influential Keywords</span>
            <TagList
              items={analysis.influentialKeywords}
              renderLabel={(item) => `${item.term} (${Math.round(Number(item.weight || 0) * 100)}%)${item.direction === "opposes" ? " opposes" : ""}`}
            />
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Extracted Keywords</span>
            <TagList items={analysis.keywords} />
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Suspicious Sentences</span>
            <div className="sentence-list">
              {analysis.suspiciousSentences?.length ? (
                analysis.suspiciousSentences.map((item, index) => (
                  <article key={`${item.sentence}-${index}`} className="sentence-card">
                    <strong>{Math.round(Number(item.score || 0) * 100)}% suspicion</strong>
                    <p>{item.sentence}</p>
                    <small>{item.reasons?.join(", ") || "Model warning"}</small>
                  </article>
                ))
              ) : (
                <p>No strongly suspicious sentences were highlighted.</p>
              )}
            </div>
          </div>
        </div>

        <div className="result-card__section-grid">
          <div className="result-card__block">
            <span className="eyebrow">Credibility Rule Findings</span>
            <div className="rule-list">
              {analysis.ruleFindings?.length ? (
                analysis.ruleFindings
                  .filter((item) => Number(item.score || 0) > 0)
                  .slice(0, 6)
                  .map((item) => (
                    <article key={item.id} className="rule-card">
                      <div className="rule-card__header">
                        <strong>{item.title}</strong>
                        <span>{Math.round(Number(item.score || 0) * 100)}%</span>
                      </div>
                      <p>{item.message}</p>
                      <small>{item.evidence}</small>
                    </article>
                  ))
              ) : (
                <p>No strong rule-based credibility concerns were detected.</p>
              )}
            </div>
          </div>

          <div className="result-card__block">
            <span className="eyebrow">Sentiment Analysis</span>
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Label</span>
                <strong>{analysis.sentiment?.label || "Not available"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Score</span>
                <strong>{analysis.sentiment?.score ?? "n/a"}</strong>
              </div>
              <div className="detail-list__row">
                <span>Emotional Intensity</span>
                <strong>{Math.round(Number(analysis.sentiment?.emotionalIntensity || 0) * 100)}%</strong>
              </div>
              <div className="detail-list__row">
                <span>Positive vs Negative</span>
                <strong>
                  {analysis.sentiment?.positiveCount || 0} / {analysis.sentiment?.negativeCount || 0}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="result-card__block">
          <span className="eyebrow">Named Entities</span>
          {entityCounts ? (
            <div className="detail-list">
              <div className="detail-list__row">
                <span>Entities Captured</span>
                <strong>{entityCounts.total}</strong>
              </div>
            </div>
          ) : null}
          <div className="entity-grid">
            <EntityGroup title="People" values={analysis.entities?.people} />
            <EntityGroup title="Organizations" values={analysis.entities?.organizations} />
            <EntityGroup title="Locations" values={analysis.entities?.locations} />
            <EntityGroup title="Dates" values={analysis.entities?.dates} />
            <EntityGroup title="Sources" values={analysis.entities?.sources} />
          </div>
        </div>
      </div>

      <div className="result-card__footer">
        <div className="result-card__footer-meta">
          <span>Model: {analysis.model}</span>
          <span>Saved: {analysis.date}</span>
        </div>

        {analysis.id ? (
          <div className="result-card__actions">
            <button type="button" className="ghost-button" onClick={() => api.downloadAnalysisCsv(analysis.id)}>
              Export CSV
            </button>
            <button type="button" className="ghost-button" onClick={() => api.downloadAnalysisJson(analysis.id)}>
              Export JSON
            </button>
            <button type="button" className="ghost-button" onClick={() => api.downloadAnalysisPdf(analysis.id)}>
              Export PDF
            </button>
          </div>
        ) : null}
      </div>

      {analysis.warning ? <div className="inline-warning">{analysis.warning}</div> : null}
    </section>
  );
}
