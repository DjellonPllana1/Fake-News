import { useEffect, useState } from "react";
import { api } from "../api";

function ConfusionMatrix({ model }) {
  if (!model?.confusion_matrix_named) {
    return null;
  }

  const labels = model.labels || Object.keys(model.confusion_matrix_named);

  return (
    <div className="matrix-card">
      <strong>{model.name}</strong>
      <div className="matrix-grid">
        <div className="matrix-grid__row matrix-grid__row--header">
          <span>Actual / Predicted</span>
          {labels.map((label) => (
            <span key={`${model.id}-${label}`}>{label}</span>
          ))}
        </div>

        {labels.map((actualLabel) => (
          <div key={`${model.id}-${actualLabel}`} className="matrix-grid__row">
            <span>{actualLabel}</span>
            {labels.map((predictedLabel) => (
              <span key={`${model.id}-${actualLabel}-${predictedLabel}`}>{model.confusion_matrix_named[actualLabel]?.[predictedLabel] ?? 0}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModelMetricsPage({ refreshToken, onModelsUpdated, session }) {
  const [state, setState] = useState({
    loading: true,
    retraining: false,
    error: "",
    data: null,
  });

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
    } catch (error) {
      setState((current) => ({ ...current, retraining: false, error: error.message }));
    }
  }

  if (state.loading) {
    return <div className="panel empty-state">Loading model metrics...</div>;
  }

  if (state.error) {
    return <div className="panel empty-state">{state.error}</div>;
  }

  const data = state.data;

  if (!data?.models?.length) {
    return (
      <section className="panel empty-state">
        <h2>No trained model metrics found</h2>
        <p>{data?.message || "Run the training command to generate model comparison artifacts."}</p>
        {session?.user?.role === "Admin" ? (
          <button type="button" className="primary-button" onClick={handleRetrain} disabled={state.retraining}>
            {state.retraining ? "Training..." : "Train Models"}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="page-grid">
      <section className="panel hero-panel">
        <div className="panel__header panel__header--split">
          <div>
            <span className="eyebrow">Best Model</span>
            <h2>{data.best_model.name}</h2>
            <p>
              Generated {data.generated_at}
              {data.model_version ? ` | Version ${data.model_version}` : ""}
            </p>
          </div>

          {session?.user?.role === "Admin" ? (
            <button type="button" className="primary-button" onClick={handleRetrain} disabled={state.retraining}>
              {state.retraining ? "Training..." : "Retrain Models"}
            </button>
          ) : null}
        </div>

        <div className="metric-strip">
          <div>
            <span>Accuracy</span>
            <strong>{Math.round(data.best_model.accuracy * 100)}%</strong>
          </div>
          <div>
            <span>Precision</span>
            <strong>{Math.round(data.best_model.precision * 100)}%</strong>
          </div>
          <div>
            <span>Recall</span>
            <strong>{Math.round(data.best_model.recall * 100)}%</strong>
          </div>
          <div>
            <span>F1 Score</span>
            <strong>{Math.round(data.best_model.f1 * 100)}%</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Model Comparison</span>
            <h2>Benchmark Table</h2>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="metrics-table">
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
                  <td>{model.name}</td>
                  <td>{Math.round(model.accuracy * 100)}%</td>
                  <td>{Math.round(model.precision * 100)}%</td>
                  <td>{Math.round(model.recall * 100)}%</td>
                  <td>{Math.round(model.f1 * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Preprocessing</span>
            <h2>Pipeline Settings</h2>
          </div>
        </div>

        <div className="tag-list">
          {Object.entries(data.preprocessing || {}).map(([key, value]) => (
            <span key={key}>
              {key}: {Array.isArray(value) ? value.join(" - ") : String(value)}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Decision Policy</span>
            <h2>Uncertainty Threshold</h2>
          </div>
        </div>
        <p>
          Low-confidence articles are marked <strong>{data.decision_policy.low_confidence_label}</strong> when the best score stays below{" "}
          <strong>{Math.round(Number(data.decision_policy.confidence_threshold_default || 0) * 100)}%</strong>.
        </p>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Confusion Matrices</span>
            <h2>Per-model outcomes</h2>
          </div>
        </div>
        <div className="matrix-list">
          {data.models.map((model) => (
            <ConfusionMatrix key={model.id} model={model} />
          ))}
        </div>
      </section>
    </div>
  );
}
