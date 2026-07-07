import { useState } from "react";
import { api } from "../api";
import { AnalysisResultCard } from "../components/AnalysisResultCard";
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

  async function handlePreview() {
    setState({ loadingPreview: true, loadingAnalysis: false, error: "" });

    try {
      const data = await api.fetchUrl({ url });
      setPreview(data.article);
      setState({ loadingPreview: false, loadingAnalysis: false, error: "" });
    } catch (error) {
      setState({ loadingPreview: false, loadingAnalysis: false, error: error.message });
      setPreview(null);
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
    } catch (error) {
      setState({ loadingPreview: false, loadingAnalysis: false, error: error.message });
      setResult(null);
    }
  }

  return (
    <div className="page-grid page-grid--wide">
      <section className="panel form-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Live Extraction</span>
            <h2>Analyze from URL</h2>
          </div>
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

        {preview ? (
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
          <div className="empty-state empty-state--compact">Fetch a URL first to preview extracted article content.</div>
        )}
      </section>

      {result ? (
        <AnalysisResultCard analysis={result} />
      ) : (
        <div className="panel empty-state">Run a URL analysis to see the article decision, evidence report, and advanced NLP metadata.</div>
      )}
    </div>
  );
}
