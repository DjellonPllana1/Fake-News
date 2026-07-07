import { motion } from "framer-motion";
import { FileSearch, FileText, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api";
import { AnalysisResultCard } from "../components/AnalysisResultCard";
import { SectionHeader } from "../components/SectionHeader";
import { useNotifications } from "../components/Notifications";
import { SkeletonBlock } from "../components/Skeleton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

function Field({ label, children, helper }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {helper ? <small className="text-xs leading-6 text-[var(--muted-foreground)]">{helper}</small> : null}
    </label>
  );
}

function signalItems() {
  return [
    {
      icon: FileSearch,
      title: "Structured intake",
      copy: "Headline, source, byline, publication date, and article context improve downstream scoring.",
    },
    {
      icon: Sparkles,
      title: "Explainable output",
      copy: "Probability, evidence, suspicious language, and entity metadata are returned together.",
    },
    {
      icon: ShieldCheck,
      title: "Responsible defaults",
      copy: "Low-confidence results become UNCERTAIN instead of forcing a weak label.",
    },
  ];
}

function LoadingResult() {
  return (
    <Card>
      <CardContent className="space-y-8">
        <SectionHeader eyebrow="Processing" title="Generating credibility intelligence" description="The platform is scoring the article, extracting claims, and building the explainable report." />
        <div className="three-column-grid">
          <SkeletonBlock className="h-44" />
          <SkeletonBlock className="h-44" />
          <SkeletonBlock className="h-44" />
        </div>
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-[360px]" />
        <SkeletonBlock className="h-[360px]" />
      </CardContent>
    </Card>
  );
}

const MotionDropzone = motion.div;

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
  const [dragActive, setDragActive] = useState(false);
  const { notify } = useNotifications();

  const stats = useMemo(() => {
    const text = form.text.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const characters = text.length;
    const readingTime = Math.max(1, Math.round(words / 220));

    return { words, characters, readingTime };
  }, [form.text]);

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

  function resetForm() {
    setForm({
      headline: "",
      source: "",
      author: "",
      publishedAt: "",
      text: "",
      save: true,
    });
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.includes("text") && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      notify({
        tone: "warning",
        title: "Unsupported file",
        message: "Drop a plain text, markdown, or text-like file to import article content.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("text", String(reader.result || ""));
      notify({
        tone: "info",
        title: "Text imported",
        message: `${file.name} was loaded into the article editor.`,
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="page-grid-wide">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-8">
            <SectionHeader
              eyebrow="Manual Intake"
              title="Analyze an article"
              description="Paste a full article, drop in a text file, and generate a confidence-backed credibility report with evidence and explanation."
            />

            <div className="three-column-grid">
              {signalItems().map((item) => {
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

            <div className="three-column-grid">
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Word count</span>
                <strong>{stats.words}</strong>
                <p className="text-sm leading-6">Updated in real time as you paste or drop article text.</p>
              </article>
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Characters</span>
                <strong>{stats.characters}</strong>
                <p className="text-sm leading-6">Useful for spotting incomplete or overly short submissions.</p>
              </article>
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Estimated reading time</span>
                <strong>{stats.readingTime} min</strong>
                <p className="text-sm leading-6">A quick estimate derived from the current article body.</p>
              </article>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Article Metadata" title="Source and publication details" description="These fields help the credibility engine reason about source quality, writing signals, and article context." />

            <Field label="Headline">
              <Input value={form.headline} onChange={(event) => updateField("headline", event.target.value)} placeholder="Enter the article headline" />
            </Field>

            <Field label="Source or URL" helper="Use the article publisher name or paste a source URL if you have one.">
              <Input value={form.source} onChange={(event) => updateField("source", event.target.value)} placeholder="Publisher name or https://example.com/article" />
            </Field>

            <div className="two-column-grid">
              <Field label="Author">
                <Input value={form.author} onChange={(event) => updateField("author", event.target.value)} placeholder="Optional author name" />
              </Field>

              <Field label="Publication Date">
                <Input value={form.publishedAt} onChange={(event) => updateField("publishedAt", event.target.value)} placeholder="Optional publication date" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Article Body" title="Large editor with drag and drop" description="Drop a text file anywhere in this panel or paste the article directly into the editor." />

            <MotionDropzone
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) {
                  setDragActive(false);
                }
              }}
              onDrop={handleDrop}
              animate={{ scale: dragActive ? 1.01 : 1 }}
              className={`rounded-[30px] border-2 border-dashed p-4 transition-all ${
                dragActive ? "border-[var(--border-emphasis)] bg-[rgba(104,213,255,0.08)]" : "border-[var(--border-subtle)] bg-[var(--panel-soft)]"
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="info">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Drag and drop enabled
                </Badge>
                <Badge variant="neutral">
                  <FileText className="h-3.5 w-3.5" />
                  Text and markdown files
                </Badge>
              </div>

              <Field label="Article Text">
                <Textarea
                  rows="18"
                  value={form.text}
                  onChange={(event) => updateField("text", event.target.value)}
                  placeholder="Paste the article body here for explainable TF-IDF analysis"
                  className="min-h-[360px]"
                />
              </Field>
            </MotionDropzone>

            <label className="flex items-center gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={form.save}
                onChange={(event) => updateField("save", event.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent-strong)]"
              />
              Save this analysis to history
            </label>

            {state.error ? <div className="callout callout-danger">{state.error}</div> : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={state.loading || !form.text.trim()}>
                {state.loading ? "Analyzing..." : "Run Analysis"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="space-y-4">
        {state.loading ? (
          <LoadingResult />
        ) : state.result ? (
          <AnalysisResultCard analysis={state.result} />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Explainable result will appear here"
            description="Submit an article to see the prediction, confidence, explanation, evidence verification, advanced NLP metadata, and export actions."
          />
        )}
      </div>
    </div>
  );
}
