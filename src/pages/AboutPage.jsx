import { BrainCircuit, SearchCheck, ShieldCheck } from "lucide-react";

function AboutFeature({ icon, title, description }) {
  return (
    <article className="feature-card">
      <div className="feature-card__icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </article>
  );
}

export function AboutPage() {
  return (
    <div className="page-grid">
      <section className="panel hero-panel">
        <span className="eyebrow">Platform Summary</span>
        <h2>Verity Lens is built for transparent credibility review, not just a single classifier output.</h2>
        <p>
          The platform combines TF-IDF model comparison, rule-based credibility scoring, source reputation, claim verification, and uncertainty-aware decisions
          into an analyst-ready product experience.
        </p>

        <div className="feature-grid">
          <AboutFeature
            icon={<BrainCircuit size={18} />}
            title="Model intelligence"
            description="Multinomial Naive Bayes, Logistic Regression, and Linear SVM are benchmarked, versioned, and surfaced with metrics."
          />
          <AboutFeature
            icon={<SearchCheck size={18} />}
            title="Evidence verification"
            description="Claims are extracted and compared against trusted-source coverage to identify support, contradiction, or missing evidence."
          />
          <AboutFeature
            icon={<ShieldCheck size={18} />}
            title="Trust scoring"
            description="Machine learning, domain reputation, writing quality, and metadata quality all contribute to the final Trust Score."
          />
        </div>
      </section>

      <section className="panel prose-panel">
        <h3>Explainability first</h3>
        <p>
          Every analysis returns prediction confidence, final probability distribution, influential keywords, suspicious sentences, named entities, rule
          findings, recommendations, and a plain-language explanation of why the score moved in a specific direction.
        </p>

        <h3>Responsible ambiguity</h3>
        <p>
          When the model and supporting evidence do not cross the configured confidence threshold, the article is labeled UNCERTAIN instead of forcing an
          overconfident verdict.
        </p>
      </section>

      <section className="panel prose-panel">
        <h3>What the backend does</h3>
        <p>
          The Express backend is organized into routes, controllers, services, middleware, and utilities. Core flows validate payloads, keep response shapes
          consistent, and isolate ML, NLP, evidence, trust, export, and diagnostics logic behind clean service boundaries.
        </p>

        <h3>What the frontend does</h3>
        <p>
          The React application turns those services into a working analyst interface: modern dashboards, searchable history, export tools, system diagnostics,
          and role-aware admin operations.
        </p>

        <h3>Core product outcomes</h3>
        <p>Manual article analysis with explainable scoring, sentiment, keywords, entities, and recommendations.</p>
        <p>URL ingestion with extraction preview, source reputation context, and one-click credibility review.</p>
        <p>Executive analytics, model metrics, retraining support, health checks, diagnostics, and professional reporting exports.</p>
      </section>
    </div>
  );
}
