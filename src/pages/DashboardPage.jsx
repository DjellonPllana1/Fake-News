import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  CircleAlert,
  Clock3,
  Cpu,
  Database,
  Globe2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api } from "../api";
import { StatCard } from "../components/StatCard";

const chartColors = {
  real: "#77d1a7",
  fake: "#ff7b72",
  uncertain: "#f4b860",
  accent: "#6dd3c7",
  accentSoft: "#4eb2a6",
  info: "#7eb6ff",
};

function formatPercentage(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function resolveDisplayTrustScore(item = {}) {
  const candidates = [
    Number(item.trustScore || 0),
    Number(item.credibilityScore || 0),
    Number(item.evidenceAdjustedCredibilityScore || 0),
    Number(item.baseCredibilityScore || 0),
    Number(item.confidence || 0),
  ].filter((value) => Number.isFinite(value) && value > 0);

  return Math.round(candidates[0] || 0);
}

function StatusPill({ label, tone = "neutral" }) {
  return <span className={`dashboard-status-pill dashboard-status-pill--${tone}`}>{label}</span>;
}

function OverviewMetric({ icon, label, value, detail, tone = "neutral" }) {
  const Icon = icon;

  return (
    <article className={`dashboard-overview-card dashboard-overview-card--${tone}`}>
      <div className="dashboard-overview-card__icon">
        <Icon size={18} />
      </div>
      <div className="dashboard-overview-card__content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function MetricList({ items }) {
  return (
    <div className="stack-list">
      {items.map((item) => (
        <div key={item.label} className="stack-list__row">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({ items = [] }) {
  if (!items.length) {
    return <div className="empty-state empty-state--compact">No recent platform activity yet.</div>;
  }

  return (
    <div className="dashboard-activity-list">
      {items.map((item) => (
        <article key={item.id} className="dashboard-activity-item">
          <div className={`dashboard-activity-item__dot dashboard-activity-item__dot--${item.tone || "neutral"}`} />
          <div>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </div>
          <small>{item.time}</small>
        </article>
      ))}
    </div>
  );
}

function EmptyChartMessage({ message }) {
  return <div className="empty-state empty-state--compact">{message}</div>;
}

function DashboardPanel({ eyebrow, title, subtitle, children, actions = null, wide = false }) {
  return (
    <section className={`panel dashboard-panel${wide ? " dashboard-panel--wide" : ""}`}>
      <div className="panel__header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function DashboardPage({ refreshToken }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [timelineView, setTimelineView] = useState("daily");

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const data = await api.getDashboard();

        if (isActive) {
          setState({ loading: false, error: "", data });
        }
      } catch (error) {
        if (isActive) {
          setState({ loading: false, error: error.message, data: null });
        }
      }
    }

    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 30000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [refreshToken]);

  if (state.loading) {
    return <div className="panel empty-state">Loading executive dashboard...</div>;
  }

  if (state.error) {
    return <div className="panel empty-state">{state.error}</div>;
  }

  const {
    updatedAt,
    overview,
    liveStatistics,
    systemStatus,
    recentActivity,
    recentAnalyses,
    labelDistribution,
    confidenceHistogram,
    topSuspiciousKeywords,
    mostAnalyzedDomains,
    mostCommonEntities,
    modelComparison,
    predictionStatistics,
    predictionTimeline,
    weeklyStatistics,
    monthlyStatistics,
  } = state.data;

  const timelineData =
    timelineView === "weekly" ? weeklyStatistics : timelineView === "monthly" ? monthlyStatistics : predictionTimeline;
  const latestWeek = weeklyStatistics?.[weeklyStatistics.length - 1];
  const latestMonth = monthlyStatistics?.[monthlyStatistics.length - 1];

  return (
    <div className="page-grid dashboard-grid">
      <section className="panel dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__eyebrow">
            <span className="eyebrow">Executive Analytics</span>
            <StatusPill label="Live" tone="real" />
          </div>
          <h2>Executive intelligence for fake news risk, model performance, and platform health.</h2>
          <p>
            Monitor live analysis volume, model confidence, suspicious patterns, source concentration, entity trends, and operational system status from one
            responsive command center.
          </p>

          <div className="dashboard-hero__meta">
            <StatusPill label={systemStatus.statusLabel} tone={systemStatus.status === "ok" ? "real" : "uncertain"} />
            <StatusPill label={systemStatus.database.toUpperCase()} tone="neutral" />
            <StatusPill label={overview.bestModel || "Model unavailable"} tone="medium" />
            <StatusPill label={overview.modelVersion || "No model version"} tone="neutral" />
          </div>
        </div>

        <div className="dashboard-hero__summary">
          <OverviewMetric
            icon={Activity}
            label="Updated"
            value={updatedAt}
            detail="Dashboard refreshes automatically every 30 seconds"
            tone="neutral"
          />
          <OverviewMetric
            icon={BrainCircuit}
            label="Model Version"
            value={overview.modelVersion || "Unavailable"}
            detail={overview.bestModel || "Best model not available"}
            tone="medium"
          />
          <OverviewMetric
            icon={ShieldCheck}
            label="System Status"
            value={systemStatus.statusLabel}
            detail={`${systemStatus.savedAnalyses} saved analyses and ${systemStatus.datasetArticles} dataset articles`}
            tone={systemStatus.status === "ok" ? "real" : "uncertain"}
          />
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        <StatCard title="Total Analyses" value={liveStatistics.totalAnalyses} hint="All decisions captured in the platform" />
        <StatCard title="Today" value={liveStatistics.analysesToday} hint="Analyses completed in the current day" tone="real" />
        <StatCard title="This Week" value={liveStatistics.analysesThisWeek} hint="Weekly platform throughput" tone="medium" />
        <StatCard title="This Month" value={liveStatistics.analysesThisMonth} hint="Monthly workload volume" tone="neutral" />
        <StatCard title="Avg Confidence" value={`${liveStatistics.averageConfidence}%`} hint="Average confidence across all saved analyses" tone="real" />
        <StatCard title="Avg Trust" value={`${liveStatistics.averageTrustScore}%`} hint="Average final trust score across decisions" tone="medium" />
        <StatCard title="High Risk" value={liveStatistics.highRiskCount} hint="Analyses marked as high risk" tone="fake" />
        <StatCard
          title="Suspicious Domains"
          value={liveStatistics.suspiciousDomainMentions}
          hint="Analyses linked to suspicious source domains"
          tone="uncertain"
        />
      </section>

      <DashboardPanel
        eyebrow="Prediction Timeline"
        title="Decision Flow Over Time"
        subtitle="Switch between daily, weekly, and monthly trend views."
        wide
        actions={
          <div className="dashboard-toggle">
            {[
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly" },
              { id: "monthly", label: "Monthly" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dashboard-toggle__button ${timelineView === item.id ? "dashboard-toggle__button--active" : ""}`}
                onClick={() => setTimelineView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        {timelineData?.length ? (
          <div className="chart-card chart-card--tall">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="timelineReal" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.real} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={chartColors.real} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="timelineFake" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.fake} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={chartColors.fake} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="timelineUncertain" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.uncertain} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={chartColors.uncertain} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#8ea8a8" />
                <YAxis stroke="#8ea8a8" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="REAL" stackId="timeline" stroke={chartColors.real} fill="url(#timelineReal)" />
                <Area type="monotone" dataKey="FAKE" stackId="timeline" stroke={chartColors.fake} fill="url(#timelineFake)" />
                <Area type="monotone" dataKey="UNCERTAIN" stackId="timeline" stroke={chartColors.uncertain} fill="url(#timelineUncertain)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="No timeline data available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel
        eyebrow="Live Statistics"
        title="Operational Snapshot"
        subtitle="Key risk, trust, and sentiment indicators from the saved analysis stream."
      >
        <MetricList
          items={[
            { label: "High Risk Analyses", value: predictionStatistics.highRiskCount },
            { label: "Medium Risk Analyses", value: predictionStatistics.mediumRiskCount },
            { label: "Low Risk Analyses", value: predictionStatistics.lowRiskCount },
            { label: "Trusted Source Mentions", value: predictionStatistics.trustedSourceCount },
            { label: "Average Trust Score", value: predictionStatistics.averageTrustScore ?? predictionStatistics.averageCredibility },
            { label: "Average Sentiment Score", value: predictionStatistics.averageSentimentScore },
          ]}
        />
      </DashboardPanel>

      <DashboardPanel eyebrow="System Status" title="Platform Health" subtitle="Current environment, model, and platform readiness.">
        <div className="dashboard-system-grid">
          <OverviewMetric
            icon={Cpu}
            label="Model Status"
            value={systemStatus.modelStatus}
            detail={systemStatus.bestModel || "No best model available"}
            tone={systemStatus.modelStatus === "trained" ? "real" : "uncertain"}
          />
          <OverviewMetric icon={Database} label="Database" value={systemStatus.database.toUpperCase()} detail="Active persistence provider" tone="neutral" />
          <OverviewMetric
            icon={Clock3}
            label="Last Analysis"
            value={systemStatus.lastAnalysisAt || "No analyses yet"}
            detail="Most recent saved analysis timestamp"
            tone="medium"
          />
          <OverviewMetric
            icon={Sparkles}
            label="Confidence Threshold"
            value={formatPercentage((systemStatus.confidenceThreshold || 0.72) * 100)}
            detail="UNCERTAIN cut-off for low-confidence decisions"
            tone="real"
          />
        </div>
      </DashboardPanel>

      <DashboardPanel eyebrow="Recent Activity" title="Live Activity Feed" subtitle="Latest analysis and platform events.">
        <ActivityFeed items={recentActivity} />
      </DashboardPanel>

      <DashboardPanel eyebrow="Prediction Mix" title="Label Distribution" subtitle="Share of REAL, FAKE, and UNCERTAIN outcomes.">
        {labelDistribution?.length ? (
          <div className="chart-card">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={labelDistribution} dataKey="value" nameKey="label" innerRadius={70} outerRadius={108} paddingAngle={4}>
                  {labelDistribution.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={
                        entry.label === "REAL" ? chartColors.real : entry.label === "FAKE" ? chartColors.fake : chartColors.uncertain
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}`, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="No label distribution is available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Confidence Distribution" title="Confidence Spread" subtitle="Histogram of decision confidence across the platform.">
        {confidenceHistogram?.length ? (
          <div className="chart-card">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="range" stroke="#8ea8a8" />
                <YAxis stroke="#8ea8a8" />
                <Tooltip />
                <Bar dataKey="count" fill={chartColors.accent} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="No confidence data available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Model Comparison" title="Accuracy vs Recall vs F1" subtitle="Executive comparison of trained model performance.">
        {modelComparison?.length ? (
          <div className="chart-card chart-card--tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#8ea8a8" hide />
                <YAxis stroke="#8ea8a8" domain={[0, 1]} />
                <Tooltip formatter={(value) => [`${Math.round(Number(value || 0) * 100)}%`, "Score"]} />
                <Legend />
                <Bar dataKey="accuracy" fill={chartColors.info} radius={[6, 6, 0, 0]} />
                <Bar dataKey="precision" fill={chartColors.accent} radius={[6, 6, 0, 0]} />
                <Bar dataKey="recall" fill={chartColors.uncertain} radius={[6, 6, 0, 0]} />
                <Bar dataKey="f1" fill={chartColors.fake} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="Model metrics are not available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Suspicious Keywords" title="Top Suspicious Terms" subtitle="Keywords appearing most often in fake or uncertain decisions.">
        {topSuspiciousKeywords?.length ? (
          <div className="chart-card chart-card--tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSuspiciousKeywords} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="#8ea8a8" />
                <YAxis type="category" dataKey="keyword" stroke="#8ea8a8" width={110} />
                <Tooltip formatter={(value, _name, payload) => [`${value}`, `${payload?.payload?.mentions || 0} mentions`]} />
                <Bar dataKey="score" fill={chartColors.fake} radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="No suspicious keyword rankings are available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Domain Focus" title="Most Analyzed Domains" subtitle="Top domains by analysis volume and reputation concentration.">
        {mostAnalyzedDomains?.length ? (
          <div className="chart-card chart-card--tall">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mostAnalyzedDomains}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="domain" stroke="#8ea8a8" hide />
                <YAxis yAxisId="left" stroke="#8ea8a8" />
                <YAxis yAxisId="right" orientation="right" stroke="#8ea8a8" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill={chartColors.accent} radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="averageTrustScore" stroke={chartColors.uncertain} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="No domain analysis data is available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Entity Watch" title="Most Common Entities" subtitle="People, organizations, locations, and dates appearing most often in analyses.">
        {mostCommonEntities?.length ? (
          <div className="chart-card chart-card--tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostCommonEntities} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="#8ea8a8" />
                <YAxis type="category" dataKey="entity" stroke="#8ea8a8" width={120} />
                <Tooltip formatter={(value, _name, payload) => [`${value}`, payload?.payload?.category || "Entity"]} />
                <Bar dataKey="count" fill={chartColors.info} radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="No entity rankings are available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Weekly Statistics" title="Weekly Performance Trend" subtitle="Executive summary of the latest weekly analysis cycle.">
        <div className="dashboard-mini-summary">
          <OverviewMetric
            icon={CalendarDays}
            label="Latest Week"
            value={latestWeek?.label || "No weekly data"}
            detail={latestWeek ? `${latestWeek.total} analyses with ${latestWeek.averageTrustScore}% avg trust` : "Weekly analytics unavailable"}
            tone="medium"
          />
          <OverviewMetric
            icon={TrendingUp}
            label="Weekly Confidence"
            value={latestWeek ? `${latestWeek.averageConfidence}%` : "0%"}
            detail={latestWeek ? `${latestWeek.REAL} real / ${latestWeek.FAKE} fake / ${latestWeek.UNCERTAIN} uncertain` : "No weekly breakdown"}
            tone="real"
          />
        </div>
        {weeklyStatistics?.length ? (
          <div className="chart-card">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyStatistics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#8ea8a8" hide />
                <YAxis yAxisId="left" stroke="#8ea8a8" />
                <YAxis yAxisId="right" orientation="right" stroke="#8ea8a8" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total" fill={chartColors.accentSoft} radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="averageTrustScore" stroke={chartColors.real} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="Weekly statistics are not available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Monthly Statistics" title="Monthly Strategic Trend" subtitle="Longer-range platform performance and trust movement.">
        <div className="dashboard-mini-summary">
          <OverviewMetric
            icon={Globe2}
            label="Latest Month"
            value={latestMonth?.label || "No monthly data"}
            detail={latestMonth ? `${latestMonth.total} analyses and ${latestMonth.averageConfidence}% avg confidence` : "Monthly analytics unavailable"}
            tone="neutral"
          />
          <OverviewMetric
            icon={AlertTriangle}
            label="Monthly Risk Mix"
            value={latestMonth ? `${latestMonth.FAKE + latestMonth.UNCERTAIN}` : 0}
            detail={latestMonth ? "fake + uncertain outcomes in latest month" : "No monthly breakdown"}
            tone="uncertain"
          />
        </div>
        {monthlyStatistics?.length ? (
          <div className="chart-card">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyStatistics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#8ea8a8" />
                <YAxis yAxisId="left" stroke="#8ea8a8" />
                <YAxis yAxisId="right" orientation="right" stroke="#8ea8a8" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total" fill={chartColors.accent} radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="averageTrustScore" stroke={chartColors.real} strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="averageConfidence" stroke={chartColors.uncertain} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartMessage message="Monthly statistics are not available yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Recent Decisions" title="Recent Activity by Article" subtitle="Latest saved analyses with source, trust, and prediction labels." wide>
        {recentAnalyses?.length ? (
          <div className="analysis-list">
            {recentAnalyses.map((item) => (
              <article key={item.id} className="analysis-list__item">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.source}</p>
                </div>
                <div>
                  <span className={`status-badge status-badge--${item.label.toLowerCase()}`}>{item.label}</span>
                  <small>{item.confidence}% confidence</small>
                  <small>{resolveDisplayTrustScore(item)}/100 trust</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyChartMessage message="No recent analyses have been saved yet." />
        )}
      </DashboardPanel>

      <DashboardPanel eyebrow="Model Version" title="Current Model Snapshot" subtitle="Training artifact version and executive model context.">
        <MetricList
          items={[
            { label: "Best Model", value: overview.bestModel || "Not available" },
            { label: "Model Version", value: overview.modelVersion || "Not available" },
            { label: "System Status", value: systemStatus.statusLabel },
            { label: "Dataset Articles", value: overview.datasetArticles },
          ]}
        />
      </DashboardPanel>

      <DashboardPanel eyebrow="Executive Notes" title="Weekly and Monthly Rollup" subtitle="Quick rollup for leadership reporting.">
        <div className="dashboard-notes">
          <div>
            <CircleAlert size={18} />
            <p>
              Weekly analytics currently show <strong>{latestWeek?.total || 0}</strong> analyses with an average trust score of{" "}
              <strong>{latestWeek?.averageTrustScore || 0}%</strong>.
            </p>
          </div>
          <div>
            <TrendingUp size={18} />
            <p>
              Monthly performance currently shows <strong>{latestMonth?.total || 0}</strong> analyses with an average confidence of{" "}
              <strong>{latestMonth?.averageConfidence || 0}%</strong>.
            </p>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
