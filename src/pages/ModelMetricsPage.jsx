import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { BrainCircuit, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../api";
import { SectionHeader } from "../components/SectionHeader";
import { useNotifications } from "../components/Notifications";
import { TableSkeleton } from "../components/Skeleton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";

const chartColors = {
  accuracy: "#93c5fd",
  precision: "#68d5ff",
  recall: "#ffc266",
  f1: "#ff6f8d",
  grid: "rgba(148, 163, 184, 0.16)",
  axis: "#94a7bd",
};

function MetricCard({ label, value, detail }) {
  return (
    <article className="metric-tile">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <strong>{value}</strong>
      <p className="text-sm leading-6">{detail}</p>
    </article>
  );
}

function ConfusionMatrix({ model }) {
  if (!model?.confusion_matrix_named) {
    return null;
  }

  const labels = model.labels || Object.keys(model.confusion_matrix_named);

  return (
    <article className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <strong className="block text-base font-semibold text-[var(--foreground)]">{model.name}</strong>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Actual vs predicted outcomes for the latest evaluation run.</p>
        </div>
        <Badge variant={model.id === "best" ? "real" : "neutral"}>{Math.round(Number(model.f1 || 0) * 100)}% F1</Badge>
      </div>

      <div className="overflow-auto">
        <div className="grid min-w-[420px] gap-2">
          <div className="grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] gap-2">
            <span className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Actual / Predicted
            </span>
            {labels.map((label) => (
              <span
                key={`${model.id}-${label}`}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]"
              >
                {label}
              </span>
            ))}
          </div>

          {labels.map((actualLabel) => (
            <div key={`${model.id}-${actualLabel}`} className="grid grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] gap-2">
              <span className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] px-3 py-3 text-sm font-medium text-[var(--foreground)]">
                {actualLabel}
              </span>
              {labels.map((predictedLabel) => (
                <span
                  key={`${model.id}-${actualLabel}-${predictedLabel}`}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] px-3 py-3 text-center text-sm font-semibold text-[var(--foreground)]"
                >
                  {model.confusion_matrix_named[actualLabel]?.[predictedLabel] ?? 0}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function ModelMetricsPage({ refreshToken, onModelsUpdated, session }) {
  const [state, setState] = useState({
    loading: true,
    retraining: false,
    error: "",
    data: null,
  });
  const { notify } = useNotifications();

  useEffect(() => {
    let isActive = true;

    async function loadMetrics() {
      try {
        const data = await api.getModelMetrics();

        if (isActive) {
          setState((current) => ({
            ...current,
            loading: false,
            error: "",
            data,
          }));
        }
      } catch (error) {
        if (isActive) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message,
            data: null,
          }));
        }
      }
    }

    loadMetrics();

    return () => {
      isActive = false;
    };
  }, [refreshToken]);

  async function handleRetrain() {
    if (session?.user?.role !== "Admin") {
      setState((current) => ({ ...current, error: "Only admin users can retrain models." }));
      notify({
        tone: "warning",
        title: "Restricted action",
        message: "Only admin users can retrain models.",
      });
      return;
    }

    setState((current) => ({ ...current, retraining: true, error: "" }));

    try {
      await api.retrainModels();
      onModelsUpdated();
      const data = await api.getModelMetrics();
      setState((current) => ({
        ...current,
        retraining: false,
        loading: false,
        error: "",
        data,
      }));
      notify({
        tone: "success",
        title: "Models retrained",
        message: "Updated metrics and the best-model artifact are now loaded in the dashboard.",
      });
    } catch (error) {
      setState((current) => ({ ...current, retraining: false, error: error.message }));
      notify({
        tone: "error",
        title: "Retraining failed",
        message: error.message,
      });
    }
  }

  const comparisonData = useMemo(() => {
    if (!state.data?.models?.length) {
      return [];
    }

    return state.data.models.map((model) => ({
      name: model.name,
      accuracy: Math.round(Number(model.accuracy || 0) * 100),
      precision: Math.round(Number(model.precision || 0) * 100),
      recall: Math.round(Number(model.recall || 0) * 100),
      f1: Math.round(Number(model.f1 || 0) * 100),
    }));
  }, [state.data]);

  if (state.loading) {
    return (
      <div className="page-grid">
        <Card>
          <CardContent className="space-y-6">
            <TableSkeleton rows={5} />
          </CardContent>
        </Card>
        <div className="two-column-grid">
          <Card>
            <CardContent className="space-y-6">
              <TableSkeleton rows={6} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-6">
              <TableSkeleton rows={6} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state.error && !state.data) {
    return <EmptyState icon={BrainCircuit} title="Unable to load model metrics" description={state.error} />;
  }

  const data = state.data;

  if (!data?.models?.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No trained model metrics found"
        description={data?.message || "Run the training command to generate model comparison artifacts."}
      >
        {session?.user?.role === "Admin" ? (
          <Button type="button" onClick={handleRetrain} disabled={state.retraining}>
            {state.retraining ? "Training..." : "Train Models"}
          </Button>
        ) : null}
      </EmptyState>
    );
  }

  return (
    <div className="page-grid">
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader
            eyebrow="Best Model"
            title={data.best_model.name}
            description={`Generated ${data.generated_at}${data.model_version ? ` | Version ${data.model_version}` : ""}`}
            actions={
              session?.user?.role === "Admin" ? (
                <Button type="button" onClick={handleRetrain} disabled={state.retraining}>
                  <RotateCcw className="h-4 w-4" />
                  {state.retraining ? "Training..." : "Retrain Models"}
                </Button>
              ) : null
            }
          />

          {state.error ? <div className="callout callout-danger">{state.error}</div> : null}

          <div className="four-column-grid">
            <MetricCard label="Accuracy" value={`${Math.round(data.best_model.accuracy * 100)}%`} detail="Overall correctness on the evaluation split." />
            <MetricCard label="Precision" value={`${Math.round(data.best_model.precision * 100)}%`} detail="How often positive predictions were actually correct." />
            <MetricCard label="Recall" value={`${Math.round(data.best_model.recall * 100)}%`} detail="How much of the target class signal the model captured." />
            <MetricCard label="F1 Score" value={`${Math.round(data.best_model.f1 * 100)}%`} detail="Balanced score used for best-model selection." />
          </div>
        </CardContent>
      </Card>

      <div className="two-column-grid">
        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Model Comparison" title="Benchmark chart" description="Accuracy, precision, recall, and F1 across all trained models." />
            <div className="chart-shell chart-shell--tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="name" stroke={chartColors.axis} />
                  <YAxis stroke={chartColors.axis} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accuracy" fill={chartColors.accuracy} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="precision" fill={chartColors.precision} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="recall" fill={chartColors.recall} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="f1" fill={chartColors.f1} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Performance Shape" title="Metric radar" description="At-a-glance shape of each model's strengths and tradeoffs." />
            <div className="chart-shell chart-shell--tall">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={comparisonData}>
                  <PolarGrid stroke={chartColors.grid} />
                  <PolarAngleAxis dataKey="name" tick={{ fill: chartColors.axis, fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fill: chartColors.axis, fontSize: 11 }} domain={[0, 100]} />
                  <Radar name="Accuracy" dataKey="accuracy" stroke={chartColors.accuracy} fill={chartColors.accuracy} fillOpacity={0.15} />
                  <Radar name="F1" dataKey="f1" stroke={chartColors.f1} fill={chartColors.f1} fillOpacity={0.12} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <SectionHeader eyebrow="Benchmark Table" title="All trained models" description="Comparable scores for every model evaluated during the latest training run." />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Accuracy</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1</th>
                </tr>
              </thead>
              <tbody>
                {data.models.map((model) => (
                  <tr key={model.id}>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{model.name}</span>
                        {model.name === data.best_model.name ? <Badge variant="real">Best</Badge> : null}
                      </div>
                    </td>
                    <td>{Math.round(model.accuracy * 100)}%</td>
                    <td>{Math.round(model.precision * 100)}%</td>
                    <td>{Math.round(model.recall * 100)}%</td>
                    <td>{Math.round(model.f1 * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="two-column-grid">
        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Preprocessing" title="Pipeline settings" description="Current text processing and feature engineering configuration." />
            <div className="tag-cloud">
              {Object.entries(data.preprocessing || {}).map(([key, value]) => (
                <span key={key}>
                  {key}: {Array.isArray(value) ? value.join(" - ") : String(value)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Decision Policy" title="Uncertainty threshold" description="Low-confidence articles are explicitly surfaced for human review." />
            <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="uncertain">{data.decision_policy.low_confidence_label}</Badge>
                <Badge variant="neutral">
                  Threshold {Math.round(Number(data.decision_policy.confidence_threshold_default || 0) * 100)}%
                </Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
                If the best model score stays below the configured threshold, the article is marked as UNCERTAIN instead of forcing an overconfident label.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <SectionHeader eyebrow="Confusion Matrices" title="Per-model outcomes" description="Detailed actual vs predicted counts for each evaluated model." />
          <div className="page-grid">
            {data.models.map((model) => (
              <ConfusionMatrix key={model.id} model={model} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <SectionHeader eyebrow="Model Readiness" title="Current production snapshot" description="Operational context for the currently selected best model artifact." />
          <div className="three-column-grid">
            <MetricCard label="Best Model" value={data.best_model.name} detail="Automatically selected from the benchmark run." />
            <MetricCard label="Model Version" value={data.model_version || "Not available"} detail="Version identifier returned by the latest training pipeline." />
            <MetricCard label="Policy" value={data.decision_policy.low_confidence_label} detail="Low-confidence fallback label used by the frontend and backend." />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="real">
              <ShieldCheck className="h-3.5 w-3.5" />
              Production-ready artifact loaded
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
