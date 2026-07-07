import { useDeferredValue, useEffect, useState } from "react";
import { api } from "../api";

function SummaryCard({ label, value, detail }) {
  return (
    <div className="admin-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function KeyValueRows({ values = {} }) {
  return (
    <div className="stack-list">
      {Object.entries(values).map(([key, value]) => (
        <div key={key} className="stack-list__row">
          <span>{key}</span>
          <strong>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "Not available")}</strong>
        </div>
      ))}
    </div>
  );
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

  async function loadDashboard() {
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
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

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
    } catch (error) {
      setDashboardState((current) => ({
        ...current,
        error: error.message,
      }));
    } finally {
      setActionState((current) => ({ ...current, savingUser: "" }));
    }
  }

  async function handleRetrainModels() {
    setActionState((current) => ({ ...current, retraining: true }));

    try {
      await api.retrainAdminModels();
      await loadDashboard();
    } catch (error) {
      setDashboardState((current) => ({
        ...current,
        error: error.message,
      }));
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
    } catch (error) {
      setDashboardState((current) => ({
        ...current,
        error: error.message,
      }));
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
    } catch (error) {
      setDatasetState((current) => ({
        ...current,
        error: error.message,
      }));
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
    } catch (error) {
      setAnalysisState((current) => ({
        ...current,
        error: error.message,
      }));
    } finally {
      setActionState((current) => ({ ...current, deletingAnalysis: "" }));
    }
  }

  if (dashboardState.loading) {
    return <div className="panel empty-state">Loading admin dashboard...</div>;
  }

  if (dashboardState.error && !dashboardState.data) {
    return <div className="panel empty-state">{dashboardState.error}</div>;
  }

  const data = dashboardState.data;
  const overview = data.overview || {};
  const modelVersions = data.models?.versions || [];
  const apiLogs = data.apiLogs || [];
  const editableConfig = configDraft || data.configuration?.editable || {};

  return (
    <div className="page-grid admin-grid">
      <section className="panel admin-hero">
        <div className="panel__header panel__header--split">
          <div>
            <span className="eyebrow">Admin Control Center</span>
            <h2>Operate users, datasets, models, diagnostics, and configuration with role-protected controls.</h2>
            <p>Only admin accounts can access this dashboard and perform model retraining, deletion, or configuration changes.</p>
          </div>
          <button type="button" className="secondary-button" onClick={loadDashboard}>
            Refresh Admin Data
          </button>
        </div>

        {editableConfig.adminBanner ? <div className="inline-warning">{editableConfig.adminBanner}</div> : null}
        {dashboardState.error ? <div className="inline-error">{dashboardState.error}</div> : null}

        <div className="metric-strip">
          <SummaryCard label="Users" value={overview.totalUsers || 0} detail={`${overview.activeUsers || 0} active accounts`} />
          <SummaryCard label="Dataset" value={overview.datasetArticles || 0} detail="articles available for training" />
          <SummaryCard label="Analyses" value={overview.savedAnalyses || 0} detail="saved article decisions" />
          <SummaryCard label="API Logs" value={overview.apiLogEntries || 0} detail="recent request logs captured in memory" />
          <SummaryCard label="Best Model" value={overview.bestModel || "Unavailable"} detail={overview.modelVersion || "No version stored"} />
          <SummaryCard label="Model Status" value={overview.modelStatus || "unknown"} detail={overview.lastAnalysisAt || "No saved analyses yet"} />
        </div>
      </section>

      <section className="panel admin-panel admin-panel--wide">
        <div className="panel__header panel__header--split">
          <div>
            <span className="eyebrow">Manage Users</span>
            <h2>Role-Based Authorization</h2>
            <p>Update account roles and statuses without exposing password data.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="metrics-table">
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
                    <select
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
                    </select>
                  </td>
                  <td>
                    <select
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
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={actionState.savingUser === user.email || editableConfig.allowUserRoleEditing === false}
                      onClick={() => handleSaveUser(user.email)}
                    >
                      {actionState.savingUser === user.email ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel admin-panel">
        <div className="panel__header panel__header--split">
          <div>
            <span className="eyebrow">Models</span>
            <h2>Manage ML Models</h2>
            <p>Inspect versions, production status, and retrain the saved model artifact.</p>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={actionState.retraining || editableConfig.allowModelRetrain === false}
            onClick={handleRetrainModels}
          >
            {actionState.retraining ? "Retraining..." : "Retrain Models"}
          </button>
        </div>

        <div className="table-wrapper">
          <table className="metrics-table">
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
                  <td>{model.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel admin-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Application Configuration</span>
            <h2>Editable Admin Settings</h2>
          </div>
        </div>

        <form className="admin-config-form" onSubmit={handleSaveConfig}>
          <label className="field">
            <span>Dashboard Refresh Seconds</span>
            <input
              type="number"
              value={editableConfig.dashboardRefreshSeconds ?? 30}
              onChange={(event) => setConfigDraft((current) => ({ ...current, dashboardRefreshSeconds: Number(event.target.value || 30) }))}
            />
          </label>

          <label className="field">
            <span>History Page Size</span>
            <input
              type="number"
              value={editableConfig.historyPageSize ?? 100}
              onChange={(event) => setConfigDraft((current) => ({ ...current, historyPageSize: Number(event.target.value || 100) }))}
            />
          </label>

          <label className="field">
            <span>Admin Page Size</span>
            <input
              type="number"
              value={editableConfig.adminPageSize ?? 25}
              onChange={(event) => setConfigDraft((current) => ({ ...current, adminPageSize: Number(event.target.value || 25) }))}
            />
          </label>

          <label className="field">
            <span>API Log View Limit</span>
            <input
              type="number"
              value={editableConfig.apiLogViewLimit ?? 100}
              onChange={(event) => setConfigDraft((current) => ({ ...current, apiLogViewLimit: Number(event.target.value || 100) }))}
            />
          </label>

          <label className="field">
            <span>Admin Banner</span>
            <input
              value={editableConfig.adminBanner ?? ""}
              onChange={(event) => setConfigDraft((current) => ({ ...current, adminBanner: event.target.value }))}
              placeholder="Optional admin warning or maintenance message"
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(editableConfig.allowDatasetDeletion)}
              onChange={(event) => setConfigDraft((current) => ({ ...current, allowDatasetDeletion: event.target.checked }))}
            />
            <span>Allow dataset deletion</span>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(editableConfig.allowAnalysisDeletion)}
              onChange={(event) => setConfigDraft((current) => ({ ...current, allowAnalysisDeletion: event.target.checked }))}
            />
            <span>Allow analysis deletion</span>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(editableConfig.allowModelRetrain)}
              onChange={(event) => setConfigDraft((current) => ({ ...current, allowModelRetrain: event.target.checked }))}
            />
            <span>Allow model retraining</span>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(editableConfig.allowUserRoleEditing)}
              onChange={(event) => setConfigDraft((current) => ({ ...current, allowUserRoleEditing: event.target.checked }))}
            />
            <span>Allow user role editing</span>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(editableConfig.maintenanceMode)}
              onChange={(event) => setConfigDraft((current) => ({ ...current, maintenanceMode: event.target.checked }))}
            />
            <span>Maintenance mode banner</span>
          </label>

          <button type="submit" className="primary-button" disabled={actionState.savingConfig}>
            {actionState.savingConfig ? "Saving..." : "Save Configuration"}
          </button>
        </form>
      </section>

      <section className="panel admin-panel admin-panel--wide">
        <div className="panel__header panel__header--split">
          <div>
            <span className="eyebrow">Datasets</span>
            <h2>Manage Datasets</h2>
            <p>Search local training articles, review summaries, delete entries, and download CSV exports.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => api.downloadAdminDatasetsCsv(datasetFilters)}>
            Download Datasets
          </button>
        </div>

        <div className="filter-row">
          <input
            value={datasetFilters.search}
            onChange={(event) => setDatasetFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search datasets by title, source, or subject"
          />
          <select value={datasetFilters.label} onChange={(event) => setDatasetFilters((current) => ({ ...current, label: event.target.value }))}>
            <option value="">All Labels</option>
            <option value="REAL">REAL</option>
            <option value="FAKE">FAKE</option>
          </select>
        </div>

        {datasetState.error ? <div className="inline-error">{datasetState.error}</div> : null}
        <div className="history-total">Showing {datasetState.total} dataset articles</div>
        <div className="history-list">
          {datasetState.loading ? <div className="empty-state empty-state--compact">Loading dataset records...</div> : null}
          {datasetState.items.map((item) => (
            <article key={item.id} className="history-card">
              <div className="history-card__header">
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.source} | {item.subject}
                  </span>
                </div>
                <span className={`status-badge status-badge--${String(item.label || "real").toLowerCase()}`}>{item.label}</span>
              </div>
              <p>{item.summary || item.preview}</p>
              <div className="history-card__footer">
                <span>{item.date || "No date"}</span>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={actionState.deletingDataset === item.id || editableConfig.allowDatasetDeletion === false}
                  onClick={() => handleDeleteDataset(item.id)}
                >
                  {actionState.deletingDataset === item.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel admin-panel admin-panel--wide">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Analysis History</span>
            <h2>View and Delete Analyses</h2>
            <p>Search saved predictions, inspect labels, and remove records when necessary.</p>
          </div>
        </div>

        <div className="filter-row">
          <input
            value={analysisFilters.search}
            onChange={(event) => setAnalysisFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search saved analyses"
          />
          <select value={analysisFilters.label} onChange={(event) => setAnalysisFilters((current) => ({ ...current, label: event.target.value }))}>
            <option value="">All Labels</option>
            <option value="REAL">REAL</option>
            <option value="FAKE">FAKE</option>
            <option value="UNCERTAIN">UNCERTAIN</option>
          </select>
        </div>

        {analysisState.error ? <div className="inline-error">{analysisState.error}</div> : null}
        <div className="history-total">Showing {analysisState.total} analysis records</div>
        <div className="history-list">
          {analysisState.loading ? <div className="empty-state empty-state--compact">Loading analyses...</div> : null}
          {analysisState.items.map((item) => (
            <article key={item.id} className="history-card">
              <div className="history-card__header">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.source}</span>
                </div>
                <span className={`status-badge status-badge--${item.label.toLowerCase()}`}>{item.label}</span>
              </div>
              <p>{item.summary || item.textPreview || "No summary stored."}</p>
              <div className="history-card__metrics">
                <span>{item.confidence}% confidence</span>
                <span>{item.modelVersion || item.model}</span>
                <span>{item.trustScore || item.credibilityScore || 0}/100 trust</span>
                <span>{item.date}</span>
              </div>
              <div className="history-card__footer">
                <button type="button" className="secondary-button" onClick={() => api.downloadAnalysisPdf(item.id)}>
                  Export PDF
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={actionState.deletingAnalysis === item.id || editableConfig.allowAnalysisDeletion === false}
                  onClick={() => handleDeleteAnalysis(item.id)}
                >
                  {actionState.deletingAnalysis === item.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel admin-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">API Logs</span>
            <h2>Recent Request Activity</h2>
          </div>
        </div>

        <div className="admin-log-list">
          {apiLogs.map((log) => (
            <article key={log.id} className="admin-log-item">
              <strong>
                {log.method} {log.path}
              </strong>
              <span>
                {log.statusCode} | {log.durationMs} ms | {log.userEmail}
              </span>
              <small>{log.timestamp}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel admin-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">System Diagnostics</span>
            <h2>Operational Snapshot</h2>
          </div>
        </div>
        <KeyValueRows values={data.diagnostics?.runtime || {}} />
      </section>

      <section className="panel admin-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Runtime Configuration</span>
            <h2>Environment Diagnostics</h2>
          </div>
        </div>
        <KeyValueRows values={data.configuration?.runtime || {}} />
      </section>
    </div>
  );
}
