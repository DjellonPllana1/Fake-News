import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Download, RefreshCw, Settings2, ShieldCheck, Users } from "lucide-react";
import { api } from "../api";
import { SectionHeader } from "../components/SectionHeader";
import { useNotifications } from "../components/Notifications";
import { ListPageSkeleton, TableSkeleton } from "../components/Skeleton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

function SummaryCard({ label, value, detail }) {
  return (
    <article className="metric-tile">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <strong>{value}</strong>
      <p className="text-sm leading-6">{detail}</p>
    </article>
  );
}

function KeyValueRows({ values = {} }) {
  return (
    <div className="space-y-3">
      {Object.entries(values).map(([key, value]) => (
        <div
          key={key}
          className="flex flex-col gap-2 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] px-4 py-3 md:flex-row md:items-center md:justify-between"
        >
          <span className="text-sm text-[var(--muted-foreground)]">{key}</span>
          <strong className="text-sm font-semibold text-[var(--foreground)]">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "Not available")}</strong>
        </div>
      ))}
    </div>
  );
}

function labelVariant(label) {
  if (label === "REAL" || label === "Active") {
    return "real";
  }

  if (label === "FAKE" || label === "Inactive") {
    return "fake";
  }

  if (label === "UNCERTAIN") {
    return "uncertain";
  }

  return "neutral";
}

export function AdminDashboardPage() {
  const [dashboardState, setDashboardState] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [datasetState, setDatasetState] = useState({
    loading: false,
    error: "",
    items: [],
    total: 0,
  });
  const [analysisState, setAnalysisState] = useState({
    loading: false,
    error: "",
    items: [],
    total: 0,
  });
  const [datasetFilters, setDatasetFilters] = useState({
    search: "",
    label: "",
  });
  const [analysisFilters, setAnalysisFilters] = useState({
    search: "",
    label: "",
  });
  const deferredDatasetSearch = useDeferredValue(datasetFilters.search);
  const deferredAnalysisSearch = useDeferredValue(analysisFilters.search);
  const [userDrafts, setUserDrafts] = useState({});
  const [configDraft, setConfigDraft] = useState(null);
  const [actionState, setActionState] = useState({
    savingUser: "",
    retraining: false,
    savingConfig: false,
    deletingDataset: "",
    deletingAnalysis: "",
  });
  const { notify } = useNotifications();

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.getAdminDashboard();
      setDashboardState({
        loading: false,
        error: "",
        data,
      });
      setUserDrafts(
        Object.fromEntries(
          (data.users || []).map((user) => [
            user.email,
            {
              role: user.role,
              status: user.status,
            },
          ])
        )
      );
      setConfigDraft(data.configuration?.editable || null);
      setDatasetState({
        loading: false,
        error: "",
        items: data.datasets?.items || [],
        total: data.datasets?.summary?.total || 0,
      });
      setAnalysisState({
        loading: false,
        error: "",
        items: data.analyses?.items || [],
        total: data.analyses?.total || 0,
      });
    } catch (error) {
      setDashboardState({
        loading: false,
        error: error.message,
        data: null,
      });
      notify({
        tone: "error",
        title: "Admin dashboard unavailable",
        message: error.message,
      });
    }
  }, [notify]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    let isActive = true;

    async function loadDatasets() {
      setDatasetState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const data = await api.getAdminDatasets({
          search: deferredDatasetSearch,
          label: datasetFilters.label,
          limit: 25,
        });

        if (isActive) {
          setDatasetState({
            loading: false,
            error: "",
            items: data.items || [],
            total: data.total || 0,
          });
        }
      } catch (error) {
        if (isActive) {
          setDatasetState((current) => ({
            ...current,
            loading: false,
            error: error.message,
          }));
        }
      }
    }

    if (!dashboardState.data) {
      return undefined;
    }

    loadDatasets();

    return () => {
      isActive = false;
    };
  }, [dashboardState.data, deferredDatasetSearch, datasetFilters.label]);

  useEffect(() => {
    let isActive = true;

    async function loadAnalyses() {
      setAnalysisState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const data = await api.getAdminAnalyses({
          search: deferredAnalysisSearch,
          label: analysisFilters.label,
          limit: 25,
        });

        if (isActive) {
          setAnalysisState({
            loading: false,
            error: "",
            items: data.history || [],
            total: data.total || 0,
          });
        }
      } catch (error) {
        if (isActive) {
          setAnalysisState((current) => ({
            ...current,
            loading: false,
            error: error.message,
          }));
        }
      }
    }

    if (!dashboardState.data) {
      return undefined;
    }

    loadAnalyses();

    return () => {
      isActive = false;
    };
  }, [dashboardState.data, deferredAnalysisSearch, analysisFilters.label]);

  async function handleSaveUser(email) {
    setActionState((current) => ({ ...current, savingUser: email }));

    try {
      await api.updateAdminUser(email, userDrafts[email]);
      await loadDashboard();
      notify({
        tone: "success",
        title: "User updated",
        message: `${email} was updated successfully.`,
      });
    } catch (error) {
      setDashboardState((current) => ({
        ...current,
        error: error.message,
      }));
      notify({
        tone: "error",
        title: "User update failed",
        message: error.message,
      });
    } finally {
      setActionState((current) => ({ ...current, savingUser: "" }));
    }
  }

  async function handleRetrainModels() {
    setActionState((current) => ({ ...current, retraining: true }));

    try {
      await api.retrainAdminModels();
      await loadDashboard();
      notify({
        tone: "success",
        title: "Models retrained",
        message: "Admin retraining completed and dashboard data has been refreshed.",
      });
    } catch (error) {
      setDashboardState((current) => ({
        ...current,
        error: error.message,
      }));
      notify({
        tone: "error",
        title: "Retraining failed",
        message: error.message,
      });
    } finally {
      setActionState((current) => ({ ...current, retraining: false }));
    }
  }

  async function handleSaveConfig(event) {
    event.preventDefault();
    setActionState((current) => ({ ...current, savingConfig: true }));

    try {
      const data = await api.updateAdminConfiguration(configDraft);
      setConfigDraft(data.editable || configDraft);
      await loadDashboard();
      notify({
        tone: "success",
        title: "Configuration saved",
        message: "Admin configuration changes are now active.",
      });
    } catch (error) {
      setDashboardState((current) => ({
        ...current,
        error: error.message,
      }));
      notify({
        tone: "error",
        title: "Configuration save failed",
        message: error.message,
      });
    } finally {
      setActionState((current) => ({ ...current, savingConfig: false }));
    }
  }

  async function handleDeleteDataset(articleId) {
    if (!window.confirm("Delete this dataset article?")) {
      return;
    }

    setActionState((current) => ({ ...current, deletingDataset: articleId }));

    try {
      await api.deleteAdminDataset(articleId);
      await loadDashboard();
      notify({
        tone: "success",
        title: "Dataset record deleted",
        message: `${articleId} was removed from the dataset.`,
      });
    } catch (error) {
      setDatasetState((current) => ({
        ...current,
        error: error.message,
      }));
      notify({
        tone: "error",
        title: "Dataset deletion failed",
        message: error.message,
      });
    } finally {
      setActionState((current) => ({ ...current, deletingDataset: "" }));
    }
  }

  async function handleDeleteAnalysis(analysisId) {
    if (!window.confirm("Delete this saved analysis?")) {
      return;
    }

    setActionState((current) => ({ ...current, deletingAnalysis: analysisId }));

    try {
      await api.deleteAdminAnalysis(analysisId);
      await loadDashboard();
      notify({
        tone: "success",
        title: "Analysis deleted",
        message: `${analysisId} was removed from saved history.`,
      });
    } catch (error) {
      setAnalysisState((current) => ({
        ...current,
        error: error.message,
      }));
      notify({
        tone: "error",
        title: "Analysis deletion failed",
        message: error.message,
      });
    } finally {
      setActionState((current) => ({ ...current, deletingAnalysis: "" }));
    }
  }

  if (dashboardState.loading) {
    return (
      <div className="page-grid">
        <Card>
          <CardContent className="space-y-6">
            <TableSkeleton rows={5} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-6">
            <TableSkeleton rows={6} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-6">
            <ListPageSkeleton items={3} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (dashboardState.error && !dashboardState.data) {
    return <EmptyState icon={ShieldCheck} title="Admin dashboard unavailable" description={dashboardState.error} />;
  }

  const data = dashboardState.data;
  const overview = data.overview || {};
  const modelVersions = data.models?.versions || [];
  const apiLogs = data.apiLogs || [];
  const editableConfig = configDraft || data.configuration?.editable || {};

  return (
    <div className="page-grid">
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader
            eyebrow="Admin Control Center"
            title="Operate users, datasets, models, diagnostics, and configuration with role-protected controls."
            description="Only admin accounts can access this dashboard and perform retraining, deletion, or configuration changes."
            actions={
              <Button type="button" variant="outline" onClick={loadDashboard}>
                <RefreshCw className="h-4 w-4" />
                Refresh Admin Data
              </Button>
            }
          />

          {editableConfig.adminBanner ? <div className="callout callout-warning">{editableConfig.adminBanner}</div> : null}
          {dashboardState.error ? <div className="callout callout-danger">{dashboardState.error}</div> : null}

          <div className="flex flex-wrap gap-2">
            <Badge variant="real">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin access enabled
            </Badge>
            <Badge variant="info">{overview.bestModel || "Best model unavailable"}</Badge>
            <Badge variant="neutral">{overview.modelVersion || "No version stored"}</Badge>
          </div>

          <div className="three-column-grid">
            <SummaryCard label="Users" value={overview.totalUsers || 0} detail={`${overview.activeUsers || 0} active accounts`} />
            <SummaryCard label="Dataset" value={overview.datasetArticles || 0} detail="articles available for training" />
            <SummaryCard label="Analyses" value={overview.savedAnalyses || 0} detail="saved article decisions" />
            <SummaryCard label="API Logs" value={overview.apiLogEntries || 0} detail="recent request logs captured in memory" />
            <SummaryCard label="Best Model" value={overview.bestModel || "Unavailable"} detail={overview.modelVersion || "No version stored"} />
            <SummaryCard label="Model Status" value={overview.modelStatus || "unknown"} detail={overview.lastAnalysisAt || "No saved analyses yet"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <SectionHeader eyebrow="Manage Users" title="Role-based authorization" description="Update account roles and statuses without exposing password data." />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(data.users || []).map((user) => (
                  <tr key={user.email}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <Select
                        value={userDrafts[user.email]?.role || user.role}
                        disabled={editableConfig.allowUserRoleEditing === false}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.email]: {
                              ...current[user.email],
                              role: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="Admin">Admin</option>
                        <option value="Analyst">Analyst</option>
                        <option value="User">User</option>
                      </Select>
                    </td>
                    <td>
                      <Select
                        value={userDrafts[user.email]?.status || user.status}
                        disabled={editableConfig.allowUserRoleEditing === false}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.email]: {
                              ...current[user.email],
                              status: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </Select>
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={actionState.savingUser === user.email || editableConfig.allowUserRoleEditing === false}
                        onClick={() => handleSaveUser(user.email)}
                      >
                        {actionState.savingUser === user.email ? "Saving..." : "Save"}
                      </Button>
                    </td>
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
            <SectionHeader
              eyebrow="Models"
              title="Manage ML models"
              description="Inspect versions, production status, and retrain the saved model artifact."
              actions={
                <Button
                  type="button"
                  onClick={handleRetrainModels}
                  disabled={actionState.retraining || editableConfig.allowModelRetrain === false}
                >
                  <RefreshCw className="h-4 w-4" />
                  {actionState.retraining ? "Retraining..." : "Retrain Models"}
                </Button>
              }
            />

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Version</th>
                    <th>Accuracy</th>
                    <th>F1</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modelVersions.map((model) => (
                    <tr key={model.id}>
                      <td>{model.name}</td>
                      <td>{model.version}</td>
                      <td>{Math.round(Number(model.accuracy || 0) * 100)}%</td>
                      <td>{Math.round(Number(model.f1 || 0) * 100)}%</td>
                      <td>
                        <Badge variant={labelVariant(model.status)}>{model.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Runtime Diagnostics" title="Environment snapshot" description="Server-side runtime details returned in the admin dashboard payload." />
            <KeyValueRows values={data.configuration?.runtime || {}} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <SectionHeader eyebrow="Application Configuration" title="Editable admin settings" description="Operational settings that affect page sizes, banners, and permissions." />

          <form className="space-y-5" onSubmit={handleSaveConfig}>
            <div className="three-column-grid">
              <label className="form-field">
                <span>Dashboard Refresh Seconds</span>
                <Input
                  type="number"
                  value={editableConfig.dashboardRefreshSeconds ?? 30}
                  onChange={(event) => setConfigDraft((current) => ({ ...current, dashboardRefreshSeconds: Number(event.target.value || 30) }))}
                />
              </label>

              <label className="form-field">
                <span>History Page Size</span>
                <Input
                  type="number"
                  value={editableConfig.historyPageSize ?? 100}
                  onChange={(event) => setConfigDraft((current) => ({ ...current, historyPageSize: Number(event.target.value || 100) }))}
                />
              </label>

              <label className="form-field">
                <span>Admin Page Size</span>
                <Input
                  type="number"
                  value={editableConfig.adminPageSize ?? 25}
                  onChange={(event) => setConfigDraft((current) => ({ ...current, adminPageSize: Number(event.target.value || 25) }))}
                />
              </label>
            </div>

            <div className="two-column-grid">
              <label className="form-field">
                <span>API Log View Limit</span>
                <Input
                  type="number"
                  value={editableConfig.apiLogViewLimit ?? 100}
                  onChange={(event) => setConfigDraft((current) => ({ ...current, apiLogViewLimit: Number(event.target.value || 100) }))}
                />
              </label>

              <label className="form-field">
                <span>Admin Banner</span>
                <Input
                  value={editableConfig.adminBanner ?? ""}
                  onChange={(event) => setConfigDraft((current) => ({ ...current, adminBanner: event.target.value }))}
                  placeholder="Optional admin warning or maintenance message"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["allowDatasetDeletion", "Allow dataset deletion"],
                ["allowAnalysisDeletion", "Allow analysis deletion"],
                ["allowModelRetrain", "Allow model retraining"],
                ["allowUserRoleEditing", "Allow user role editing"],
                ["maintenanceMode", "Maintenance mode banner"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={Boolean(editableConfig[key])}
                    onChange={(event) => setConfigDraft((current) => ({ ...current, [key]: event.target.checked }))}
                    className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent-strong)]"
                  />
                  {label}
                </label>
              ))}
            </div>

            <Button type="submit" disabled={actionState.savingConfig}>
              <Settings2 className="h-4 w-4" />
              {actionState.savingConfig ? "Saving..." : "Save Configuration"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="two-column-grid">
        <Card>
          <CardContent className="space-y-6">
            <SectionHeader
              eyebrow="Datasets"
              title={`Manage datasets (${datasetState.total})`}
              description="Search local training articles, review summaries, delete entries, and download CSV exports."
              actions={
                <Button type="button" variant="outline" onClick={() => api.downloadAdminDatasetsCsv(datasetFilters)}>
                  <Download className="h-4 w-4" />
                  Download Datasets
                </Button>
              }
            />

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <label className="form-field">
                <span>Search datasets</span>
                <Input
                  value={datasetFilters.search}
                  onChange={(event) => setDatasetFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search by title, source, or subject"
                />
              </label>
              <label className="form-field">
                <span>Label</span>
                <Select value={datasetFilters.label} onChange={(event) => setDatasetFilters((current) => ({ ...current, label: event.target.value }))}>
                  <option value="">All Labels</option>
                  <option value="REAL">REAL</option>
                  <option value="FAKE">FAKE</option>
                </Select>
              </label>
            </div>

            {datasetState.error ? <div className="callout callout-danger">{datasetState.error}</div> : null}
            {datasetState.loading ? <ListPageSkeleton items={2} /> : null}

            {!datasetState.loading ? (
              datasetState.items.length ? (
                <div className="space-y-3">
                  {datasetState.items.map((item) => (
                    <article key={item.id} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <strong className="block text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
                          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                            {item.source} | {item.subject}
                          </p>
                        </div>
                        <Badge variant={labelVariant(item.label)}>{item.label}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.summary || item.preview}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-[var(--muted-foreground)]">{item.date || "No date"}</span>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={actionState.deletingDataset === item.id || editableConfig.allowDatasetDeletion === false}
                          onClick={() => handleDeleteDataset(item.id)}
                        >
                          {actionState.deletingDataset === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Download} title="No dataset records found" description="Try adjusting the dataset search or label filter." className="min-h-[220px]" />
              )
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Analysis History" title={`View and delete analyses (${analysisState.total})`} description="Search saved predictions, inspect labels, and remove records when necessary." />

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <label className="form-field">
                <span>Search analyses</span>
                <Input
                  value={analysisFilters.search}
                  onChange={(event) => setAnalysisFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search saved analyses"
                />
              </label>
              <label className="form-field">
                <span>Label</span>
                <Select value={analysisFilters.label} onChange={(event) => setAnalysisFilters((current) => ({ ...current, label: event.target.value }))}>
                  <option value="">All Labels</option>
                  <option value="REAL">REAL</option>
                  <option value="FAKE">FAKE</option>
                  <option value="UNCERTAIN">UNCERTAIN</option>
                </Select>
              </label>
            </div>

            {analysisState.error ? <div className="callout callout-danger">{analysisState.error}</div> : null}
            {analysisState.loading ? <ListPageSkeleton items={2} /> : null}

            {!analysisState.loading ? (
              analysisState.items.length ? (
                <div className="space-y-3">
                  {analysisState.items.map((item) => (
                    <article key={item.id} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <strong className="block text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
                          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item.source}</p>
                        </div>
                        <Badge variant={labelVariant(item.label)}>{item.label}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.summary || item.textPreview || "No summary stored."}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="neutral">{item.confidence}% confidence</Badge>
                        <Badge variant="neutral">{item.modelVersion || item.model}</Badge>
                        <Badge variant="neutral">{item.trustScore || item.credibilityScore || 0}/100 trust</Badge>
                        <Badge variant="neutral">{item.date}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button type="button" variant="outline" onClick={() => api.downloadAnalysisPdf(item.id)}>
                          Export PDF
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={actionState.deletingAnalysis === item.id || editableConfig.allowAnalysisDeletion === false}
                          onClick={() => handleDeleteAnalysis(item.id)}
                        >
                          {actionState.deletingAnalysis === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Users} title="No saved analyses found" description="Try adjusting the analysis search or label filter." className="min-h-[220px]" />
              )
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="two-column-grid">
        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="API Logs" title="Recent request activity" description="Method, route, status, duration, and user email captured in memory." />
            <div className="space-y-3">
              {apiLogs.map((log) => (
                <article key={log.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
                  <strong className="block text-sm font-semibold text-[var(--foreground)]">
                    {log.method} {log.path}
                  </strong>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    {log.statusCode} | {log.durationMs} ms | {log.userEmail}
                  </p>
                  <small className="mt-2 block text-xs text-[var(--muted-foreground)]">{log.timestamp}</small>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="System Diagnostics" title="Operational snapshot" description="Runtime values returned by the admin dashboard for quick inspection." />
            <KeyValueRows values={data.diagnostics?.runtime || {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
