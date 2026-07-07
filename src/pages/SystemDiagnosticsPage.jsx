import { useEffect, useState } from "react";
import { api } from "../api";
import { TableSkeleton } from "../components/Skeleton";

function formatValue(value) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

function KeyValueGrid({ title, values }) {
  return (
    <section className="panel list-panel">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Diagnostics</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="stack-list">
        {Object.entries(values || {}).map(([key, value]) => (
          <div key={key} className="stack-list__row">
            <span>{key}</span>
            <strong>{formatValue(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SystemDiagnosticsPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });

  useEffect(() => {
    let isActive = true;

    async function loadDiagnostics() {
      try {
        const data = await api.getSystemDiagnostics();

        if (isActive) {
          setState({ loading: false, error: "", data });
        }
      } catch (error) {
        if (isActive) {
          setState({ loading: false, error: error.message, data: null });
        }
      }
    }

    loadDiagnostics();

    return () => {
      isActive = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="page-grid">
        <section className="panel hero-panel">
          <TableSkeleton rows={4} />
        </section>
        <section className="panel list-panel">
          <TableSkeleton rows={6} />
        </section>
        <section className="panel list-panel">
          <TableSkeleton rows={6} />
        </section>
      </div>
    );
  }

  if (state.error) {
    return <div className="panel empty-state">{state.error}</div>;
  }

  const data = state.data;

  return (
    <div className="page-grid">
      <section className="panel hero-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">System Health</span>
            <h2>{String(data.status || "unknown").toUpperCase()}</h2>
            <p>Use this page to inspect runtime health, model artifacts, and deployment configuration.</p>
          </div>
        </div>

        <div className="metric-strip">
          <div>
            <span>Node</span>
            <strong>{data.runtime?.nodeVersion || "n/a"}</strong>
          </div>
          <div>
            <span>DB Client</span>
            <strong>{data.configuration?.dbClient || "n/a"}</strong>
          </div>
          <div>
            <span>Best Model</span>
            <strong>{data.model?.bestModel || "n/a"}</strong>
          </div>
          <div>
            <span>Model Version</span>
            <strong>{data.model?.version || "n/a"}</strong>
          </div>
        </div>
      </section>

      <KeyValueGrid title="Runtime" values={data.runtime} />
      <KeyValueGrid title="Configuration" values={data.configuration} />
      <KeyValueGrid title="Storage" values={data.storage} />
      <KeyValueGrid title="Model" values={data.model} />
    </div>
  );
}
