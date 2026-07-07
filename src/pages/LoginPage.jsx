import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../api";
import { DEMO_CREDENTIALS } from "../constants";

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api.login({ email, password });
      onLogin(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <span className="eyebrow">Professional Fake News Detection</span>
        <h1>Separate verified reporting from misinformation with clearer model evidence.</h1>
        <p>
          Verity Lens compares multiple TF-IDF models, applies a configurable uncertainty threshold, and returns confidence-backed explanations that are easier
          to review.
        </p>

        <div className="auth-highlights">
          <div>
            <ShieldCheck size={18} />
            <span>REAL, FAKE, or UNCERTAIN outcomes</span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>Saved analysis history and recent activity</span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>Model comparison across three classifiers</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="panel auth-form" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">Secure Access</span>
            <h2>Log in to the platform</h2>
            <p>Use the seeded demo account below or your own configured user.</p>
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
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="credential-card">
            <span className="eyebrow">Demo Credentials</span>
            <strong>{DEMO_CREDENTIALS.email}</strong>
            <p>Password: {DEMO_CREDENTIALS.password}</p>
            <p>Role: Admin</p>
          </div>
        </form>
      </section>
    </div>
  );
}
