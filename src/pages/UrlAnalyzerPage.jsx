import { Globe2, Radar, Sparkles, Waypoints } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { AnalysisResultCard } from "../components/AnalysisResultCard";
import { SectionHeader } from "../components/SectionHeader";
import { useNotifications } from "../components/Notifications";
import { SkeletonBlock } from "../components/Skeleton";
import { SourceReputationCard } from "../components/SourceReputationCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";
import { Input } from "../components/ui/input";

function LoadingResult({ title }) {
  return (
    <Card>
      <CardContent className="space-y-6">
        <SectionHeader eyebrow="Loading" title={title} description="The platform is fetching or evaluating the live article now." />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-72" />
      </CardContent>
    </Card>
  );
}

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

  async function handleAnalyzeSubmit(event) {
    event.preventDefault();
    await handleAnalyze();
  }

  return (
    <div className="page-grid-wide">
      <div className="space-y-4">
        <form onSubmit={handleAnalyzeSubmit}>
          <Card>
            <CardContent className="space-y-8">
              <SectionHeader
                eyebrow="Live Extraction"
                title="Analyze from URL"
                description="Fetch, preview, and evaluate a live article in a source-aware workflow designed for fast credibility review."
              />

              <div className="three-column-grid">
                {[
                  {
                    icon: Globe2,
                    title: "Source-aware intake",
                    copy: "Pull article structure, summary, author, publication date, and domain reputation first.",
                  },
                  {
                    icon: Radar,
                    title: "Evidence-forward analysis",
                    copy: "Combine live article extraction with explainable scoring and claim verification.",
                  },
                  {
                    icon: Waypoints,
                    title: "One workflow",
                    copy: "Preview extracted content, then run the full ML and credibility pipeline without leaving the page.",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <article key={item.title} className="metric-tile">
                      <span className="metric-icon">
                        <Icon className="h-4 w-4" />
                      </span>
                      <strong className="text-[1.2rem]">{item.title}</strong>
                      <p className="text-sm leading-6">{item.copy}</p>
                    </article>
                  );
                })}
              </div>

              <label className="form-field">
                <span>Article URL</span>
                <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/news/article" />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={handlePreview} disabled={state.loadingPreview || !url}>
                  {state.loadingPreview ? "Fetching..." : "Fetch Article"}
                </Button>
                <Button type="submit" disabled={state.loadingAnalysis || !url}>
                  {state.loadingAnalysis ? "Analyzing..." : "Analyze URL"}
                </Button>
              </div>

              {state.error ? <div className="callout callout-danger">{state.error}</div> : null}
            </CardContent>
          </Card>
        </form>

        {state.loadingPreview ? (
          <LoadingResult title="Extracting live article preview" />
        ) : preview ? (
          <Card>
            <CardContent className="space-y-6">
              <SectionHeader
                eyebrow="Fetched Preview"
                title={preview.title}
                description={preview.summary || "Preview summary is not available for this article."}
                actions={<Badge variant="info">{preview.source}</Badge>}
              />

              <div className="three-column-grid">
                <article className="metric-tile">
                  <span className="text-sm text-[var(--muted-foreground)]">Source</span>
                  <strong className="text-[1.25rem]">{preview.source}</strong>
                  <p className="text-sm leading-6">Publisher extracted from the live URL.</p>
                </article>
                <article className="metric-tile">
                  <span className="text-sm text-[var(--muted-foreground)]">Author</span>
                  <strong className="text-[1.25rem]">{preview.author || "Not detected"}</strong>
                  <p className="text-sm leading-6">Byline extracted during article fetch.</p>
                </article>
                <article className="metric-tile">
                  <span className="text-sm text-[var(--muted-foreground)]">Publication Date</span>
                  <strong className="text-[1.25rem]">{preview.publishedAt || "Not detected"}</strong>
                  <p className="text-sm leading-6">Used as part of the credibility metadata signals.</p>
                </article>
              </div>

              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5">
                <span className="eyebrow">Summary</span>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{preview.summary}</p>
              </div>

              <SourceReputationCard sourceReputation={preview.sourceReputation} title="Source Reputation Preview" compact />

              {preview.warning ? <div className="callout callout-warning">{preview.warning}</div> : null}
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Globe2}
            title="Preview will appear here"
            description="Fetch a URL first to preview extracted article content, author and date metadata, and source reputation context."
          />
        )}
      </div>

      <div className="space-y-4">
        {state.loadingAnalysis ? (
          <LoadingResult title="Processing live article intelligence" />
        ) : result ? (
          <AnalysisResultCard analysis={result} />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Analysis report will appear here"
            description="Run a URL analysis to see the article decision, evidence report, advanced NLP metadata, and export actions."
          />
        )}
      </div>
    </div>
  );
}
