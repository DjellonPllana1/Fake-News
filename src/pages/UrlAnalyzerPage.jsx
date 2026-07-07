import { Globe2, Radar, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { AnalysisResultCard } from "../components/AnalysisResultCard";
import { useNotifications } from "../components/Notifications";
import { SkeletonBlock } from "../components/Skeleton";
import { SourceReputationCard } from "../components/SourceReputationCard";

export function UrlAnalyzerPage({ onAnalysisSaved }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [state, setState] = useState({
    loadingPreview: false,
    loadingAnalysis: false,
    error: "",
  });
  const { notify } = useNotifications();

  async function handlePreview() {
    setState({ loadingPreview: true, loadingAnalysis: false, error: "" });

    try {
      const data = await api.fetchUrl({ url });
      setPreview(data.article);
      setState({ loadingPreview: false, loadingAnalysis: false, error: "" });
      notify({
        tone: "info",
        title: "Article fetched",
        message: "URL extraction completed. You can now review the preview or run a full analysis.",
      });
    } catch (error) {
      setState({ loadingPreview: false, loadingAnalysis: false, error: error.message });
      setPreview(null);
      notify({
        tone: "error",
        title: "Fetch failed",
        message: error.message,
      });
    }
  }

  async function handleAnalyze() {
    setState({ loadingPreview: false, loadingAnalysis: true, error: "" });

    try {
      const data = await api.analyzeArticle({
        url,
        author: preview?.author || "",
        publishedAt: preview?.publishedAt || "",
        save: true,
        language: "English",
      });
      setResult(data.analysis);
      onAnalysisSaved();
      setState({ loadingPreview: false, loadingAnalysis: false, error: "" });
      notify({
        tone: "success",
        title: "URL analysis completed",
        message: `${data.analysis.label} prediction generated with ${data.analysis.confidence}% confidence.`,
      });
    } catch (error) {
      setState({ loadingPreview: false, loadingAnalysis: false, error: error.message });
      setResult(null);
      notify({
        tone: "error",
        title: "URL analysis failed",
        message: error.message,
      });
    }
  }

  return (
    <div className="page-grid page-grid--wide">
      <section className="panel form-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Live Extraction</span>
            <h2>Analyze from URL</h2>
            <p>Fetch, profile, and evaluate a live article in a single analyst workflow.</p>
          </div>
        </div>

        <div className="form-panel__hero">
          <article className="mini-signal-card">
            <Globe2 size={18} />
            <div>
              <strong>Source-aware intake</strong>
              <span>Pull article structure, summary, author, publication date, and domain reputation first.</span>
            </div>
          </article>
          <article className="mini-signal-card">
            <Radar size={18} />
            <div>
              <strong>Evidence-forward analysis</strong>
              <span>Combine live article extraction with explainable scoring and claim verification.</span>
            </div>
          </article>
        </div>

        <label className="field">
          <span>Article URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/news/article" />
        </label>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={handlePreview} disabled={state.loadingPreview || !url}>
            {state.loadingPreview ? "Fetching..." : "Fetch Article"}
          </button>
          <button type="button" className="primary-button" onClick={handleAnalyze} disabled={state.loadingAnalysis || !url}>
            {state.loadingAnalysis ? "Analyzing..." : "Analyze URL"}
          </button>
        </div>

        {state.error ? <div className="inline-error">{state.error}</div> : null}

        {state.loadingPreview ? (
          <div className="preview-card">
            <SkeletonBlock className="skeleton-title" />
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line skeleton-line--short" />
            <SkeletonBlock className="skeleton-card skeleton-card--result" />
          </div>
        ) : preview ? (
          <div className="preview-card">
            <span className="eyebrow">Fetched Preview</span>
            <strong>{preview.title}</strong>
            <p>{preview.summary}</p>
            <small>{preview.source}</small>
            <small>{preview.author ? `Author: ${preview.author}` : "Author not detected"}</small>
            <small>{preview.publishedAt ? `Published: ${preview.publishedAt}` : "Publication date not detected"}</small>
            <SourceReputationCard sourceReputation={preview.sourceReputation} title="Source Reputation Preview" compact />
            {preview.warning ? <div className="inline-warning">{preview.warning}</div> : null}
          </div>
        ) : (
          <div className="empty-state empty-state--compact">Fetch a URL first to preview extracted article content and source context.</div>
        )}
      </section>

      {state.loadingAnalysis ? (
        <section className="panel result-card result-card--placeholder">
          <div className="result-card__header">
            <div>
              <span className="eyebrow">Evaluating</span>
              <h2>Processing live article intelligence</h2>
            </div>
            <Sparkles size={18} />
          </div>
          <div className="result-card__body">
            <SkeletonBlock className="skeleton-title" />
            <SkeletonBlock className="skeleton-line" />
            <div className="result-card__section-grid">
              <SkeletonBlock className="skeleton-card skeleton-card--result" />
              <SkeletonBlock className="skeleton-card skeleton-card--result" />
            </div>
            <SkeletonBlock className="skeleton-panel" />
          </div>
        </section>
      ) : result ? (
        <AnalysisResultCard analysis={result} />
      ) : (
        <div className="panel empty-state">Run a URL analysis to see the article decision, evidence report, and advanced NLP metadata.</div>
      )}
    </div>
  );
}
