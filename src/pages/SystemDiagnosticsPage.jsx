import { useEffect, useState } from "react";
import { Activity, Database, HeartPulse, ServerCog } from "lucide-react";
import { api } from "../api";
import { InfoList } from "../components/InfoList";
import { SectionHeader } from "../components/SectionHeader";
import { TableSkeleton } from "../components/Skeleton";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";

function formatValue(value) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

function KeyValueSection({ title, eyebrow, values, icon }) {
  const Icon = icon;

  return (
    <Card>
      <CardContent className="space-y-6">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description="Structured system data returned directly from the diagnostics endpoint."
          actions={
            <span className="metric-icon">
              <Icon className="h-4 w-4" />
            </span>
          }
        />

        <InfoList
          items={Object.entries(values || {}).map(([key, value]) => ({
            label: key,
            value: formatValue(value),
          }))}
        />
      </CardContent>
    </Card>
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

  if (state.error) {
    return <EmptyState icon={ServerCog} title="Unable to load diagnostics" description={state.error} />;
  }

  const data = state.data;

  return (
    <div className="page-grid">
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader
            eyebrow="System Health"
            title={String(data.status || "unknown").toUpperCase()}
            description="Inspect runtime health, model artifacts, storage, and deployment configuration from one diagnostics surface."
            badge={{ label: data.status === "ok" ? "Healthy" : "Attention", variant: data.status === "ok" ? "real" : "uncertain" }}
          />

          <div className="four-column-grid">
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">Node Runtime</span>
              <strong>{data.runtime?.nodeVersion || "n/a"}</strong>
              <p className="text-sm leading-6">Application runtime version reported by the backend.</p>
            </article>
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">DB Client</span>
              <strong>{data.configuration?.dbClient || "n/a"}</strong>
              <p className="text-sm leading-6">Current persistence provider backing the platform.</p>
            </article>
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">Best Model</span>
              <strong>{data.model?.bestModel || "n/a"}</strong>
              <p className="text-sm leading-6">Best model artifact currently loaded by the backend.</p>
            </article>
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">Model Version</span>
              <strong>{data.model?.version || "n/a"}</strong>
              <p className="text-sm leading-6">Version metadata returned from the model artifacts.</p>
            </article>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={data.status === "ok" ? "real" : "uncertain"}>
              <HeartPulse className="h-3.5 w-3.5" />
              API {String(data.status || "unknown").toUpperCase()}
            </Badge>
            <Badge variant="neutral">
              <Database className="h-3.5 w-3.5" />
              {data.configuration?.dbClient || "Database n/a"}
            </Badge>
            <Badge variant="info">
              <Activity className="h-3.5 w-3.5" />
              Model {data.model?.bestModel || "Unavailable"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="two-column-grid">
        <KeyValueSection title="Runtime" eyebrow="Runtime" values={data.runtime} icon={ServerCog} />
        <KeyValueSection title="Configuration" eyebrow="Configuration" values={data.configuration} icon={Activity} />
      </div>

      <div className="two-column-grid">
        <KeyValueSection title="Storage" eyebrow="Storage" values={data.storage} icon={Database} />
        <KeyValueSection title="Model" eyebrow="Model" values={data.model} icon={HeartPulse} />
      </div>
    </div>
  );
}
