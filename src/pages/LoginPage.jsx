import { useState } from "react";
import { LockKeyhole, MoonStar, ShieldCheck, Sparkles, SunMedium, TrendingUp } from "lucide-react";
import { api } from "../api";
import { useNotifications } from "../components/Notifications";
import { useTheme } from "../components/ThemeProvider";
import { DEMO_CREDENTIALS } from "../constants";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";

function HighlightCard({ icon, title, description }) {
  const Icon = icon;

  return (
    <article className="metric-tile">
      <span className="metric-icon">
        <Icon className="h-4 w-4" />
      </span>
      <strong className="text-[1.2rem]">{title}</strong>
      <p className="text-sm leading-7">{description}</p>
    </article>
  );
}

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { notify } = useNotifications();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api.login({ email, password });
      notify({
        tone: "success",
        title: "Welcome back",
        message: `${data.user.name} is signed in and ready to review live credibility signals.`,
      });
      onLogin(data);
    } catch (submitError) {
      setError(submitError.message);
      notify({
        tone: "error",
        title: "Sign-in failed",
        message: submitError.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 lg:px-6 lg:py-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[6%] top-0 h-72 w-72 rounded-full bg-[rgba(104,213,255,0.16)] blur-3xl" />
        <div className="absolute bottom-[10%] right-[6%] h-72 w-72 rounded-full bg-[rgba(52,211,153,0.14)] blur-3xl" />
        <div className="absolute right-[20%] top-[24%] h-60 w-60 rounded-full bg-[rgba(255,194,102,0.12)] blur-3xl" />
      </div>

      <div className="relative z-10 grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="flex h-full flex-col justify-between space-y-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(104,213,255,0.22),rgba(255,255,255,0.08))]">
                  <Sparkles className="h-5 w-5 text-[var(--foreground)]" />
                </div>
                <div className="space-y-1">
                  <strong className="block font-display text-lg font-semibold tracking-[-0.04em]">Verity Lens</strong>
                  <span className="block text-xs text-[var(--muted-foreground)]">Professional AI misinformation operations</span>
                </div>
              </div>

              <Button type="button" variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
            </div>

            <div className="space-y-8">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">Professional Fake News Detection</Badge>
                  <Badge variant="neutral">Premium SaaS UI</Badge>
                </div>
                <h1 className="max-w-4xl font-display text-[clamp(3rem,5vw,5rem)] font-semibold tracking-[-0.08em] text-[var(--foreground)]">
                  Investigate credibility with the confidence, evidence, and polish of a modern AI platform.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[var(--muted-foreground)]">
                  Verity Lens blends model intelligence, claim verification, source reputation, and explainable reporting into a workflow that feels built for analysts instead of demos.
                </p>
              </div>

              <div className="three-column-grid">
                <HighlightCard
                  icon={ShieldCheck}
                  title="Explainable decisions"
                  description="REAL, FAKE, and UNCERTAIN outcomes with evidence-backed rationale and supporting signals."
                />
                <HighlightCard
                  icon={TrendingUp}
                  title="Executive dashboards"
                  description="Track model confidence, suspicious domains, entity trends, and platform activity in one place."
                />
                <HighlightCard
                  icon={LockKeyhole}
                  title="Operational controls"
                  description="Role-based access, export workflows, diagnostics, and retraining tools in the same workspace."
                />
              </div>
            </div>

            <div className="three-column-grid">
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Confidence policy</span>
                <strong className="text-[1.3rem]">UNCERTAIN aware</strong>
                <p className="text-sm leading-6">Low-confidence predictions are explicitly flagged for review.</p>
              </article>
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Evidence workflow</span>
                <strong className="text-[1.3rem]">Claim verification</strong>
                <p className="text-sm leading-6">Supporting and contradicting sources are surfaced with similarity scoring.</p>
              </article>
              <article className="metric-tile">
                <span className="text-sm text-[var(--muted-foreground)]">Reporting</span>
                <strong className="text-[1.3rem]">Ready to export</strong>
                <p className="text-sm leading-6">Professional PDF, CSV, and JSON outputs suitable for stakeholder review.</p>
              </article>
            </div>
          </CardContent>
        </Card>

        <Card className="self-stretch">
          <CardContent className="flex h-full items-center justify-center">
            <form className="w-full max-w-[460px] space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <span className="eyebrow">Secure Access</span>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">Sign in to the platform</h2>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">Use the seeded demo account below or your configured user credentials.</p>
              </div>

              <label className="form-field">
                <span>Email</span>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="analyst@example.com" />
              </label>

              <label className="form-field">
                <span>Password</span>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
              </label>

              {error ? <div className="callout callout-danger">{error}</div> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Launch Workspace"}
              </Button>

              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="eyebrow">Demo Credentials</span>
                    <p className="text-sm leading-6 text-[var(--muted-foreground)]">Quick access to the seeded local environment.</p>
                  </div>
                  <Badge variant="real">Admin</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] px-4 py-3">
                    <small className="block text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Email</small>
                    <strong className="mt-1 block text-sm text-[var(--foreground)]">{DEMO_CREDENTIALS.email}</strong>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel)] px-4 py-3">
                    <small className="block text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Password</small>
                    <strong className="mt-1 block text-sm text-[var(--foreground)]">{DEMO_CREDENTIALS.password}</strong>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
