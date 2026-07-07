import { FileSearch, ShieldCheck, Sparkles, TextSearch } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { AnalysisResultCard } from "../components/AnalysisResultCard";
import { useNotifications } from "../components/Notifications";
import { SkeletonBlock } from "../components/Skeleton";

export function AnalyzePage({ onAnalysisSaved }) {
  const [form, setForm] = useState({
    headline: "",
    source: "",
    author: "",
    publishedAt: "",
    text: "",
    save: true,
  });
  const [state, setState] = useState({
    loading: false,
    error: "",
    result: null,
  });
  const { notify } = useNotifications();

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ loading: true, error: "", result: null });

    try {
      const data = await api.analyzeArticle({
        ...form,
        language: "English",
      });
      setState({ loading: false, error: "", result: data.analysis });
      onAnalysisSaved();
      notify({
        tone: "success",
        title: "Analysis completed",
        message: `${data.analysis.label} prediction generated with ${data.analysis.confidence}% confidence.`,
      });
    } catch (error) {
      setState({ loading: false, error: error.message, result: null });
      notify({
        tone: "error",
        title: "Analysis failed",
        message: error.message,
      });
    }
  }

  return (
    <div className="page-grid page-grid--wide">
      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="panel__header">
          <div>
            <span className="eyebrow">Manual Input</span>
            <h2>Analyze an article</h2>
            <p>Paste full article text and metadata to generate a confidence-backed credibility report.</p>
          </div>
        </div>

        <div className="form-panel__hero">
          <article className="mini-signal-card">
            <FileSearch size={18} />
            <div>
              <strong>Structured intake</strong>
              <span>Headline, source, byline, and publication context improve downstream scoring.</span>
            </div>
          </article>
          <article className="mini-signal-card">
            <TextSearch size={18} />
            <div>
              <strong>Explainable output</strong>
              <span>Probability, evidence, suspicious language, and entity metadata are returned together.</span>
            </div>
          </article>
          <article className="mini-signal-card">
            <ShieldCheck size={18} />
            <div>
              <strong>Responsible defaults</strong>
              <span>Low-confidence results become UNCERTAIN instead of forcing a weak label.</span>
            </div>
          </article>
        </div>

        <label className="field">
          <span>Headline</span>
          <input value={form.headline} onChange={(event) => updateField("headline", event.target.value)} placeholder="Enter the article headline" />
        </label>

        <label className="field">
          <span>Source</span>
          <input value={form.source} onChange={(event) => updateField("source", event.target.value)} placeholder="Publisher or source URL" />
        </label>

        <div className="field-grid field-grid--two">
          <label className="field">
            <span>Author</span>
            <input value={form.author} onChange={(event) => updateField("author", event.target.value)} placeholder="Optional author name" />
          </label>

          <label className="field">
            <span>Publication Date</span>
            <input
              value={form.publishedAt}
              onChange={(event) => updateField("publishedAt", event.target.value)}
              placeholder="Optional publication date"
            />
          </label>
        </div>

        <label className="field">
          <span>Article Text</span>
          <textarea
            rows="16"
            value={form.text}
            onChange={(event) => updateField("text", event.target.value)}
            placeholder="Paste the article body here for explainable TF-IDF analysis"
          />
        </label>

        <label className="checkbox-field">
          <input type="checkbox" checked={form.save} onChange={(event) => updateField("save", event.target.checked)} />
          <span>Save this analysis to history</span>
        </label>

        {state.error ? <div className="inline-error">{state.error}</div> : null}

        <div className="button-row">
          <button type="submit" className="primary-button" disabled={state.loading}>
            {state.loading ? "Analyzing..." : "Run Analysis"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() =>
              setForm({
                headline: "",
                source: "",
                author: "",
                publishedAt: "",
                text: "",
                save: true,
              })
            }
          >
            Reset
          </button>
        </div>
      </form>

      {state.loading ? (
        <section className="panel result-card result-card--placeholder">
          <div className="result-card__header">
            <div>
              <span className="eyebrow">Processing</span>
              <h2>Generating credibility intelligence</h2>
            </div>
            <Sparkles size={18} />
          </div>
          <div className="result-card__body">
            <SkeletonBlock className="skeleton-title" />
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line skeleton-line--short" />
            <div className="result-card__section-grid">
              <SkeletonBlock className="skeleton-card skeleton-card--result" />
              <SkeletonBlock className="skeleton-card skeleton-card--result" />
            </div>
            <SkeletonBlock className="skeleton-panel" />
          </div>
        </section>
      ) : state.result ? (
        <AnalysisResultCard analysis={state.result} />
      ) : (
        <div className="panel empty-state">
          Submit an article to see the prediction, confidence, explanation, evidence verification, and advanced NLP intelligence.
        </div>
      )}
    </div>
  );
}
