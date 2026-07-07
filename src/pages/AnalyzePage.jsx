import { useState } from "react";
import { api } from "../api";
import { AnalysisResultCard } from "../components/AnalysisResultCard";

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
    } catch (error) {
      setState({ loading: false, error: error.message, result: null });
    }
  }

  return (
    <div className="page-grid page-grid--wide">
      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="panel__header">
          <div>
            <span className="eyebrow">Manual Input</span>
            <h2>Analyze an article</h2>
          </div>
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
            placeholder="Paste the article body here for TF-IDF analysis"
          />
        </label>

        <label className="checkbox-field">
          <input type="checkbox" checked={form.save} onChange={(event) => updateField("save", event.target.checked)} />
          <span>Save this analysis to history</span>
        </label>

        {state.error ? <div className="inline-error">{state.error}</div> : null}

        <button type="submit" className="primary-button" disabled={state.loading}>
          {state.loading ? "Analyzing..." : "Analyze Article"}
        </button>
      </form>

      {state.result ? (
        <AnalysisResultCard analysis={state.result} />
      ) : (
        <div className="panel empty-state">Submit an article to see the prediction, confidence, explanation, and advanced NLP metadata.</div>
      )}
    </div>
  );
}
