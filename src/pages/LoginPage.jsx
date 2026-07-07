import { LockKeyhole, MoonStar, ShieldCheck, Sparkles, SunMedium } from "lucide-react";
import { api } from "../api";
import { useNotifications } from "../components/Notifications";
import { useTheme } from "../components/ThemeProvider";
import { DEMO_CREDENTIALS } from "../constants";
import { useState } from "react";

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
    <div className="auth-layout">
      <div className="auth-layout__ambient auth-layout__ambient--one" />
      <div className="auth-layout__ambient auth-layout__ambient--two" />

      <section className="auth-hero">
        <div className="auth-hero__topbar">
          <div className="brand-mark">
            <div className="brand-mark__icon">
              <Sparkles size={18} />
            </div>
            <div>
              <strong>Verity Lens</strong>
              <span>Professional AI misinformation operations</span>
            </div>
          </div>

          <button type="button" className="toolbar-button" onClick={toggleTheme}>
            {theme === "dark" ? <SunMedium size={18} /> : <MoonStar size={18} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>

        <span className="eyebrow">Professional Fake News Detection</span>
        <h1>Investigate credibility with the confidence, evidence, and product polish of a modern AI SaaS platform.</h1>
        <p>
          Verity Lens blends model intelligence, claim verification, source reputation, and explainable reporting into a workflow that feels built for analysts
          instead of demos.
        </p>

        <div className="auth-highlights auth-highlights--grid">
          <div>
            <ShieldCheck size={18} />
            <div>
              <strong>Explainable decisions</strong>
              <span>REAL, FAKE, and UNCERTAIN outcomes with evidence-backed rationale.</span>
            </div>
          </div>
          <div>
            <Sparkles size={18} />
            <div>
              <strong>Analyst-grade dashboards</strong>
              <span>Executive charts, trend monitoring, trust scoring, and source intelligence.</span>
            </div>
          </div>
          <div>
            <LockKeyhole size={18} />
            <div>
              <strong>Secure operations</strong>
              <span>Role-based access, exports, diagnostics, and retraining in one interface.</span>
            </div>
          </div>
        </div>

        <div className="auth-metrics">
          <article className="auth-metric-card">
            <span>Confidence policy</span>
            <strong>UNCERTAIN aware</strong>
            <small>Low-confidence predictions are explicitly flagged for review.</small>
          </article>
          <article className="auth-metric-card">
            <span>Evidence workflow</span>
            <strong>Claim verification</strong>
            <small>Supporting and contradicting sources are surfaced alongside similarity scoring.</small>
          </article>
          <article className="auth-metric-card">
            <span>Reporting</span>
            <strong>Ready to export</strong>
            <small>Professional PDF, CSV, and JSON outputs suitable for stakeholder review.</small>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        <form className="panel auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__intro">
            <span className="eyebrow">Secure Access</span>
            <h2>Sign in to the platform</h2>
            <p>Use the seeded demo account below or your configured user credentials.</p>
          </div>

          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="analyst@example.com" />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
          </label>

          {error ? <div className="inline-error">{error}</div> : null}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Signing in..." : "Launch Workspace"}
          </button>

          <div className="credential-card">
            <span className="eyebrow">Demo Credentials</span>
            <div className="credential-card__grid">
              <div>
                <small>Email</small>
                <strong>{DEMO_CREDENTIALS.email}</strong>
              </div>
              <div>
                <small>Password</small>
                <strong>{DEMO_CREDENTIALS.password}</strong>
              </div>
              <div>
                <small>Role</small>
                <strong>Admin</strong>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
