export function AboutPage() {
  return (
    <div className="page-grid">
      <section className="panel hero-panel">
        <span className="eyebrow">Platform Summary</span>
        <h2>Verity Lens is built for transparent fake news detection, not just single-label guesses.</h2>
        <p>
          The platform preprocesses article text, compares three TF-IDF classifiers, combines the best model with a rule-based credibility engine, and returns
          an UNCERTAIN outcome when confidence is too low for a responsible call.
        </p>
      </section>

      <section className="panel prose-panel">
        <h3>What the backend does</h3>
        <p>
          The Express backend is organized into routes, controllers, services, middleware, and utilities. Every response follows a consistent JSON envelope and
          all core flows use validation before they reach the business logic.
        </p>

        <h3>How model decisions work</h3>
        <p>
          During training, the platform evaluates Multinomial Naive Bayes, Logistic Regression, and Linear SVM. The best model is saved automatically together
          with confusion matrices, weighted classification metrics, preprocessing metadata, and version information.
        </p>

        <h3>How explainability works</h3>
        <p>
          Every analysis returns class probabilities, influential keywords, suspicious sentences, sentiment, named entities, metadata gaps, and rule findings so
          reviewers can understand why the final Trust Score moved up or down.
        </p>

        <h3>How trust scoring works</h3>
        <p>
          The final Trust Score blends ML probability, clickbait and language signals, writing quality, author and publication metadata, domain reputation, article
          length, and source reliability into a configurable 0-100 score with plain-language reasons.
        </p>

        <h3>Why UNCERTAIN matters</h3>
        <p>
          News detection should not force a hard decision when the evidence is weak. A configurable confidence threshold in the environment file makes that
          behavior explicit and easier to tune for different operating contexts.
        </p>
      </section>

      <section className="panel prose-panel">
        <h3>Core Features</h3>
        <p>Manual article analysis with summary, sentiment, entities, influential keywords, suspicious sentences, and recommendation guidance.</p>
        <p>URL-based extraction for direct article fetching with author and publication date detection where available.</p>
        <p>Saved analysis history with search, CSV export, and PDF export.</p>
        <p>Dashboard analytics, model metrics, retraining support, health checks, and system diagnostics.</p>
      </section>
    </div>
  );
}
