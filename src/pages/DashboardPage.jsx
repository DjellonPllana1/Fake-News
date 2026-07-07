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
import { DashboardSkeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";

const chartColors = {
  real: "#4ade80",
  fake: "#ff6f8d",
  uncertain: "#ffc266",
  accent: "#68d5ff",
  accentSoft: "#36b9ff",
  info: "#93c5fd",
  grid: "rgba(148, 163, 184, 0.16)",
  axis: "#94a7bd",
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

function StatusBadge({ label, tone = "neutral" }) {
  return <Badge variant={tone}>{label}</Badge>;
}

function OverviewMetric({ icon, label, value, detail, tone = "neutral" }) {
  const Icon = icon;

  const toneClass =
    tone === "real"
      ? "text-[var(--success)]"
      : tone === "fake"
        ? "text-[var(--danger)]"
        : tone === "uncertain"
          ? "text-[var(--warning)]"
          : "text-[var(--accent-strong)]";

  return (
    <article className="metric-tile">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
          <strong className="text-[1.55rem]">{value}</strong>
        </div>
        <span className={`metric-icon ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-sm leading-6">{detail}</p>
    </article>
  );
}

function MetricList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-2 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] px-4 py-3 md:flex-row md:items-center md:justify-between"
        >
          <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
          <strong className="text-sm font-semibold text-[var(--foreground)]">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({ items = [] }) {
  if (!items.length) {
    return <EmptyState icon={Sparkles} title="No recent activity" description="Platform activity will appear here as analyses are saved and models are updated." className="min-h-[220px]" />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 h-3 w-3 rounded-full ${
                  item.tone === "real"
                    ? "bg-[var(--success)]"
                    : item.tone === "fake"
                      ? "bg-[var(--danger)]"
                      : item.tone === "medium" || item.tone === "uncertain"
                        ? "bg-[var(--warning)]"
                        : "bg-[var(--accent-strong)]"
                }`}
              />
              <div className="space-y-1">
                <strong className="block text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item.text}</p>
              </div>
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">{item.time}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function DashboardPanel({ eyebrow, title, subtitle, children, actions = null, className = "" }) {
  return (
    <Card className={className}>
      <CardContent className="space-y-6">
        <SectionHeader eyebrow={eyebrow} title={title} description={subtitle} actions={actions} />
        {children}
      </CardContent>
    </Card>
  );
}

function ChartFrame({ children, tall = false }) {
  return <div className={`chart-shell ${tall ? "chart-shell--tall" : ""}`}>{children}</div>;
}

function ChartEmpty({ message }) {
  return <EmptyState title="No chart data yet" description={message} className="min-h-[260px]" />;
}

export function DashboardPage({ refreshToken }) {
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: "",
    data: null,
  });
  const [timelineView, setTimelineView] = useState("daily");
  const [manualRefreshToken, setManualRefreshToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setState((current) => {
        const hasExistingData = Boolean(current.data);

        return {
          ...current,
          loading: hasExistingData ? current.loading : true,
          refreshing: hasExistingData,
          error: "",
        };
      });

      try {
        const data = await api.getDashboard();

        if (isActive) {
          setState({ loading: false, refreshing: false, error: "", data });
        }
      } catch (error) {
        if (isActive) {
          setState((current) => ({
            loading: false,
            refreshing: false,
            error: error.message,
            data: current.data,
          }));
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, [refreshToken, manualRefreshToken]);

  if (state.loading) {
    return <DashboardSkeleton />;
  }

  if (state.error && !state.data) {
    return (
      <EmptyState
        icon={CircleAlert}
        title="Unable to load the executive dashboard"
        description={state.error}
      />
    );
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
    <div className="page-grid">
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader
            eyebrow="Executive Analytics"
            title="Executive intelligence for fake news risk, model performance, and platform health."
            description="Monitor live analysis volume, model confidence, suspicious patterns, source concentration, entity trends, and operational system status from one responsive command center."
            badge={{ label: "Live", variant: "real" }}
            actions={
              <Button type="button" variant="outline" onClick={() => setManualRefreshToken((current) => current + 1)} disabled={state.refreshing}>
                <Activity className="h-4 w-4" />
                {state.refreshing ? "Refreshing..." : "Refresh Dashboard"}
              </Button>
            }
          />

          {state.error ? <div className="callout callout-danger">{state.error}</div> : null}

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={systemStatus.statusLabel} tone={systemStatus.status === "ok" ? "real" : "uncertain"} />
            <StatusBadge label={systemStatus.database.toUpperCase()} tone="neutral" />
            <StatusBadge label={overview.bestModel || "Model unavailable"} tone="medium" />
            <StatusBadge label={overview.modelVersion || "No model version"} tone="neutral" />
          </div>

          <div className="three-column-grid">
            <OverviewMetric icon={Activity} label="Updated" value={updatedAt} detail="Dashboard data refreshes only when you request it or when new analyses are saved." tone="neutral" />
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
        </CardContent>
      </Card>

      <section className="stats-grid">
        <StatCard title="Total Analyses" value={liveStatistics.totalAnalyses} hint="All decisions captured in the platform" icon={Activity} />
        <StatCard title="Today" value={liveStatistics.analysesToday} hint="Analyses completed in the current day" tone="real" icon={CalendarDays} />
        <StatCard title="This Week" value={liveStatistics.analysesThisWeek} hint="Weekly platform throughput" tone="medium" icon={TrendingUp} />
        <StatCard title="This Month" value={liveStatistics.analysesThisMonth} hint="Monthly workload volume" tone="neutral" icon={Clock3} />
        <StatCard title="Avg Confidence" value={`${liveStatistics.averageConfidence}%`} hint="Average confidence across all saved analyses" tone="real" icon={BrainCircuit} />
        <StatCard title="Avg Trust" value={`${liveStatistics.averageTrustScore}%`} hint="Average final trust score across decisions" tone="medium" icon={ShieldCheck} />
        <StatCard title="High Risk" value={liveStatistics.highRiskCount} hint="Analyses marked as high risk" tone="fake" icon={AlertTriangle} />
        <StatCard
          title="Suspicious Domains"
          value={liveStatistics.suspiciousDomainMentions}
          hint="Analyses linked to suspicious source domains"
          tone="uncertain"
          icon={Globe2}
        />
      </section>

      <DashboardPanel
        eyebrow="Prediction Timeline"
        title="Decision flow over time"
        subtitle="Switch between daily, weekly, and monthly trend views."
        actions={
          <div className="flex flex-wrap gap-2">
            {[
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly" },
              { id: "monthly", label: "Monthly" },
            ].map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={timelineView === item.id ? "default" : "outline"}
                size="sm"
                onClick={() => setTimelineView(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        }
      >
        {timelineData?.length ? (
          <ChartFrame tall>
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
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="label" stroke={chartColors.axis} />
                <YAxis stroke={chartColors.axis} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="REAL" stackId="timeline" stroke={chartColors.real} fill="url(#timelineReal)" />
                <Area type="monotone" dataKey="FAKE" stackId="timeline" stroke={chartColors.fake} fill="url(#timelineFake)" />
                <Area type="monotone" dataKey="UNCERTAIN" stackId="timeline" stroke={chartColors.uncertain} fill="url(#timelineUncertain)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        ) : (
          <ChartEmpty message="No timeline data is available yet." />
        )}
      </DashboardPanel>

      <div className="two-column-grid">
        <DashboardPanel eyebrow="Live Statistics" title="Operational Snapshot" subtitle="Key risk, trust, and sentiment indicators from the saved analysis stream.">
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
          <div className="two-column-grid">
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
      </div>

      <div className="two-column-grid">
        <DashboardPanel eyebrow="Recent Activity" title="Live activity feed" subtitle="Latest analysis and platform events.">
          <ActivityFeed items={recentActivity} />
        </DashboardPanel>

        <DashboardPanel eyebrow="Recent Decisions" title="Recent saved analyses" subtitle="Latest decisions with source, trust, and prediction labels.">
          {recentAnalyses?.length ? (
            <div className="space-y-3">
              {recentAnalyses.map((item) => (
                <article key={item.id} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <strong className="block text-sm font-semibold text-[var(--foreground)]">{item.title}</strong>
                      <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item.source}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={item.label === "REAL" ? "real" : item.label === "FAKE" ? "fake" : "uncertain"}>{item.label}</Badge>
                      <Badge variant="neutral">{item.confidence}% confidence</Badge>
                      <Badge variant="neutral">{resolveDisplayTrustScore(item)}/100 trust</Badge>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ChartEmpty message="No recent analyses have been saved yet." />
          )}
        </DashboardPanel>
      </div>

      <div className="two-column-grid">
        <DashboardPanel eyebrow="Prediction Mix" title="Label distribution" subtitle="Share of REAL, FAKE, and UNCERTAIN outcomes.">
          {labelDistribution?.length ? (
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={labelDistribution} dataKey="value" nameKey="label" innerRadius={72} outerRadius={108} paddingAngle={4}>
                    {labelDistribution.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={entry.label === "REAL" ? chartColors.real : entry.label === "FAKE" ? chartColors.fake : chartColors.uncertain}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="No label distribution is available yet." />
          )}
        </DashboardPanel>

        <DashboardPanel eyebrow="Confidence Distribution" title="Confidence spread" subtitle="Histogram of decision confidence across the platform.">
          {confidenceHistogram?.length ? (
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceHistogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="range" stroke={chartColors.axis} />
                  <YAxis stroke={chartColors.axis} />
                  <Tooltip />
                  <Bar dataKey="count" fill={chartColors.accent} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="No confidence data available yet." />
          )}
        </DashboardPanel>
      </div>

      <div className="two-column-grid">
        <DashboardPanel eyebrow="Model Comparison" title="Accuracy vs Recall vs F1" subtitle="Executive comparison of trained model performance.">
          {modelComparison?.length ? (
            <ChartFrame tall>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="name" stroke={chartColors.axis} hide />
                  <YAxis stroke={chartColors.axis} domain={[0, 1]} />
                  <Tooltip formatter={(value) => [`${Math.round(Number(value || 0) * 100)}%`, "Score"]} />
                  <Legend />
                  <Bar dataKey="accuracy" fill={chartColors.info} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="precision" fill={chartColors.accent} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="recall" fill={chartColors.uncertain} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="f1" fill={chartColors.fake} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="Model metrics are not available yet." />
          )}
        </DashboardPanel>

        <DashboardPanel eyebrow="Suspicious Keywords" title="Top suspicious terms" subtitle="Keywords appearing most often in fake or uncertain decisions.">
          {topSuspiciousKeywords?.length ? (
            <ChartFrame tall>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSuspiciousKeywords} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis type="number" stroke={chartColors.axis} />
                  <YAxis type="category" dataKey="keyword" stroke={chartColors.axis} width={110} />
                  <Tooltip formatter={(value, _name, payload) => [`${value}`, `${payload?.payload?.mentions || 0} mentions`]} />
                  <Bar dataKey="score" fill={chartColors.fake} radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="No suspicious keyword rankings are available yet." />
          )}
        </DashboardPanel>
      </div>

      <div className="two-column-grid">
        <DashboardPanel eyebrow="Domain Focus" title="Most analyzed domains" subtitle="Top domains by analysis volume and reputation concentration.">
          {mostAnalyzedDomains?.length ? (
            <ChartFrame tall>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mostAnalyzedDomains}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="domain" stroke={chartColors.axis} hide />
                  <YAxis yAxisId="left" stroke={chartColors.axis} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartColors.axis} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill={chartColors.accent} radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="averageTrustScore" stroke={chartColors.uncertain} strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="No domain analysis data is available yet." />
          )}
        </DashboardPanel>

        <DashboardPanel eyebrow="Entity Watch" title="Most common entities" subtitle="People, organizations, locations, and dates appearing most often in analyses.">
          {mostCommonEntities?.length ? (
            <ChartFrame tall>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostCommonEntities} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis type="number" stroke={chartColors.axis} />
                  <YAxis type="category" dataKey="entity" stroke={chartColors.axis} width={120} />
                  <Tooltip formatter={(value, _name, payload) => [`${value}`, payload?.payload?.category || "Entity"]} />
                  <Bar dataKey="count" fill={chartColors.info} radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="No entity rankings are available yet." />
          )}
        </DashboardPanel>
      </div>

      <div className="two-column-grid">
        <DashboardPanel eyebrow="Weekly Statistics" title="Weekly performance trend" subtitle="Executive summary of the latest weekly analysis cycle.">
          <div className="two-column-grid">
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
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyStatistics}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="label" stroke={chartColors.axis} hide />
                  <YAxis yAxisId="left" stroke={chartColors.axis} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartColors.axis} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total" fill={chartColors.accentSoft} radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="averageTrustScore" stroke={chartColors.real} strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="Weekly statistics are not available yet." />
          )}
        </DashboardPanel>

        <DashboardPanel eyebrow="Monthly Statistics" title="Monthly strategic trend" subtitle="Longer-range platform performance and trust movement.">
          <div className="two-column-grid">
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
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyStatistics}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="label" stroke={chartColors.axis} />
                  <YAxis yAxisId="left" stroke={chartColors.axis} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartColors.axis} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total" fill={chartColors.accent} radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="averageTrustScore" stroke={chartColors.real} strokeWidth={3} />
                  <Line yAxisId="right" type="monotone" dataKey="averageConfidence" stroke={chartColors.uncertain} strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartEmpty message="Monthly statistics are not available yet." />
          )}
        </DashboardPanel>
      </div>

      <div className="two-column-grid">
        <DashboardPanel eyebrow="Model Version" title="Current model snapshot" subtitle="Training artifact version and executive model context.">
          <MetricList
            items={[
              { label: "Best Model", value: overview.bestModel || "Not available" },
              { label: "Model Version", value: overview.modelVersion || "Not available" },
              { label: "System Status", value: systemStatus.statusLabel },
              { label: "Dataset Articles", value: overview.datasetArticles },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel eyebrow="Executive Notes" title="Weekly and monthly rollup" subtitle="Quick rollup for leadership reporting.">
          <div className="space-y-3">
            <article className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-4 w-4 text-[var(--accent-strong)]" />
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  Weekly analytics currently show <strong className="text-[var(--foreground)]">{latestWeek?.total || 0}</strong> analyses with an average trust
                  score of <strong className="text-[var(--foreground)]">{latestWeek?.averageTrustScore || 0}%</strong>.
                </p>
              </div>
            </article>
            <article className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 h-4 w-4 text-[var(--accent-strong)]" />
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  Monthly performance currently shows <strong className="text-[var(--foreground)]">{latestMonth?.total || 0}</strong> analyses with an average
                  confidence of <strong className="text-[var(--foreground)]">{latestMonth?.averageConfidence || 0}%</strong>.
                </p>
              </div>
            </article>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
