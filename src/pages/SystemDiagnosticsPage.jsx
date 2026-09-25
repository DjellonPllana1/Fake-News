// ============================================================
// SystemDiagnosticsPage.jsx - Faqja e Diagnostikës së Sistemit
// ============================================================
// Kjo faqe shfaq informacionin teknik mbi gjendjen e sistemit:
//   - Runtime: versioni i Node.js
//   - Databaza: lloji i klientit të bazës së të dhënave
//   - Modeli ML: modeli i ngarkuar aktualisht
//   - Konfigurimet e tjera të sistemit
//
// Shfaqet vetëm për administratorët ose teknikët.
// ============================================================

import { useEffect, useState } from "react";
import { Activity, Database, HeartPulse, ServerCog } from "lucide-react";
import { api } from "../api";
import { InfoList } from "../components/InfoList";
import { SectionHeader } from "../components/SectionHeader";
import { TableSkeleton } from "../components/Skeleton";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";

// formatValue - Konverto vlerën në tekst të lexueshëm
// Raste speciale:
//   boolean → "Yes" ose "No" (jo true/false)
//   null/undefined/"" → "Not available"
//   çdo gjë tjetër → string
function formatValue(value) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

// KeyValueSection - Seksion me çifte çelës-vlerë
// Shfaq informacionin në formatin Etiketë → Vlerë
// Parametrat:
//   title   - Titulli i seksionit
//   eyebrow - Teksti i vogël mbi titull
//   values  - Objekti me çifte çelës-vlerë (p.sh. { nodeVersion: "20.0.0" })
//   icon    - Ikona e seksionit
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
            // Ikona dekorative djathtas
            <span className="metric-icon">
              <Icon className="h-4 w-4" />
            </span>
          }
        />

        {/* Shfaq çdo çelës-vlerë nga objekti "values" */}
        <InfoList
          items={Object.entries(values || {}).map(([key, value]) => ({
            label: key,             // Emri i çelësit (p.sh. "nodeVersion")
            value: formatValue(value),  // Vlera e formatuar
          }))}
        />
      </CardContent>
    </Card>
  );
}

// SystemDiagnosticsPage - Faqja kryesore e Diagnostikës
export function SystemDiagnosticsPage() {
  // state - Gjendja e faqes: ngarkim, gabim, ose të dhëna
  const [state, setState] = useState({
    loading: true,   // Po ngarkohet fillimisht
    error: "",        // Mesazhi i gabimit (bosh nëse s'ka gabim)
    data: null,       // Të dhënat e diagnostikës (null derisa të ngarkohen)
  });

  // useEffect - Ngarko të dhënat kur faqja hapet
  useEffect(() => {
    // isActive parandalon përditësimin e gjendjes nëse komponenti zhduket
    let isActive = true;

    // loadDiagnostics - Funksioni asinkron që ngarkon diagnostikën
    async function loadDiagnostics() {
      try {
        // Dërgo kërkesë te API-ja e diagnostikës
        const data = await api.getSystemDiagnostics();

        // Nëse komponenti ende ekziston, ruaj të dhënat
        if (isActive) {
          setState({ loading: false, error: "", data });
        }
      } catch (error) {
        // Nëse ka gabim dhe komponenti ende ekziston, ruaj gabimin
        if (isActive) {
          setState({ loading: false, error: error.message, data: null });
        }
      }
    }

    loadDiagnostics();  // Ekzekuto ngarkimin

    // Kthim: kur komponenti zhduket, shëno si joaktiv
    return () => {
      isActive = false;
    };
  }, []);  // [] = ekzekutohet vetëm një herë, kur faqja hapet

  // Nëse po ngarkohet, shfaq skeletin e ngarkimit
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

  // Nëse ka gabim, shfaq mesazhin e gjendjes bosh
  if (state.error) {
    return <EmptyState icon={ServerCog} title="Unable to load diagnostics" description={state.error} />;
  }

  // Të dhënat janë ngarkuar me sukses
  const data = state.data;

  return (
    <div className="page-grid">
      {/* Seksioni kryesor me statusin e sistemit */}
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader
            eyebrow="System Health"
            // Titulli shfaq statusin: "OK" ose "ERROR"
            title={String(data.status || "unknown").toUpperCase()}
            description="Inspect runtime health, model artifacts, storage, and deployment configuration from one diagnostics surface."
            // Badge jeshile nëse OK, portokalli nëse jo
            badge={{ label: data.status === "ok" ? "Healthy" : "Attention", variant: data.status === "ok" ? "real" : "uncertain" }}
          />

          {/* Katër metrika kryesore */}
          <div className="four-column-grid">
            {/* Versioni i Node.js */}
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">Node Runtime</span>
              <strong>{data.runtime?.nodeVersion || "n/a"}</strong>
              <p className="text-sm leading-6">Application runtime version reported by the backend.</p>
            </article>
            {/* Lloji i bazës së të dhënave */}
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">DB Client</span>
              <strong>{data.configuration?.dbClient || "n/a"}</strong>
              <p className="text-sm leading-6">Current persistence provider backing the platform.</p>
            </article>
            {/* Modeli ML më i mirë */}
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">Best Model</span>
              <strong>{data.model?.bestModel || "n/a"}</strong>
              <p className="text-sm leading-6">Best model artifact currently loaded by the backend.</p>
            </article>
            {/* Versioni i modelit */}
            <article className="metric-tile">
              <span className="text-sm text-[var(--muted-foreground)]">Model Version</span>
              <strong>{data.model?.version || "n/a"}</strong>
              <p className="text-sm leading-6">Version metadata returned from the model artifacts.</p>
            </article>
          </div>

          {/* Etiketat e statusit */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status i API-së */}
            <Badge variant={data.status === "ok" ? "real" : "uncertain"}>
              <HeartPulse className="h-3.5 w-3.5" />
              API {String(data.status || "unknown").toUpperCase()}
            </Badge>
            {/* Klienti i bazës së të dhënave */}
            <Badge variant="neutral">
              <Database className="h-3.5 w-3.5" />
              {data.configuration?.dbClient || "Database n/a"}
            </Badge>
            {/* Modeli aktiv */}
            <Badge variant="info">
              <Activity className="h-3.5 w-3.5" />
              Model {data.model?.bestModel || "Unavailable"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detaje: Runtime dhe Konfigurimet */}
      <div className="two-column-grid">
        <KeyValueSection title="Runtime" eyebrow="Runtime" values={data.runtime} icon={ServerCog} />
        <KeyValueSection title="Configuration" eyebrow="Configuration" values={data.configuration} icon={Activity} />
      </div>

      {/* Detaje: Ruajtja dhe Modeli */}
      <div className="two-column-grid">
        <KeyValueSection title="Storage" eyebrow="Storage" values={data.storage} icon={Database} />
        <KeyValueSection title="Model" eyebrow="Model" values={data.model} icon={HeartPulse} />
      </div>
    </div>
  );
}
