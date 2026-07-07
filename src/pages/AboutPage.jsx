import { BrainCircuit, SearchCheck, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";

function AboutFeature({ icon, title, description }) {
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

export function AboutPage() {
  return (
    <div className="page-grid">
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader
            eyebrow="Platform Summary"
            title="Verity Lens is built for transparent credibility review, not just a single classifier output."
            description="The platform combines TF-IDF model comparison, rule-based credibility scoring, source reputation, claim verification, and uncertainty-aware decisions into an analyst-ready product experience."
            badge={{ label: "Explainable AI", variant: "info" }}
          />

          <div className="three-column-grid">
            <AboutFeature
              icon={BrainCircuit}
              title="Model intelligence"
              description="Multinomial Naive Bayes, Logistic Regression, and Linear SVM are benchmarked, versioned, and surfaced with metrics."
            />
            <AboutFeature
              icon={SearchCheck}
              title="Evidence verification"
              description="Claims are extracted and compared against trusted-source coverage to identify support, contradiction, or missing evidence."
            />
            <AboutFeature
              icon={ShieldCheck}
              title="Trust scoring"
              description="Machine learning, domain reputation, writing quality, and metadata quality all contribute to the final Trust Score."
            />
          </div>
        </CardContent>
      </Card>

      <div className="two-column-grid">
        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Explainability First" title="Every prediction is unpacked" description="The frontend surfaces the full reasoning chain so users can inspect the outcome instead of trusting a black box." />
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              Every analysis returns prediction confidence, final probability distribution, influential keywords, suspicious sentences, named entities, rule
              findings, recommendations, and a plain-language explanation of why the score moved in a specific direction.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">Probability distribution</Badge>
              <Badge variant="neutral">Influential keywords</Badge>
              <Badge variant="neutral">Suspicious sentences</Badge>
              <Badge variant="neutral">Named entities</Badge>
              <Badge variant="neutral">Recommendations</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Responsible Ambiguity" title="UNCERTAIN is a product feature, not a fallback" description="The system explicitly avoids overclaiming when the model or evidence is weak." />
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              When the model and supporting evidence do not cross the configured confidence threshold, the article is labeled UNCERTAIN instead of forcing an
              overconfident verdict.
            </p>
            <div className="rounded-[24px] border border-[rgba(255,194,102,0.24)] bg-[rgba(255,194,102,0.08)] p-4 text-sm leading-7 text-[var(--foreground)]">
              This reduces false confidence and encourages additional verification when the platform does not have enough signal.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-8">
          <SectionHeader eyebrow="Architecture" title="What the platform layers do" description="Backend services stay clean and typed while the frontend turns them into an executive-grade analyst workspace." />

          <div className="three-column-grid">
            <AboutFeature
              icon={Workflow}
              title="Backend services"
              description="The Express backend is organized into routes, controllers, services, middleware, and utilities with clean response contracts."
            />
            <AboutFeature
              icon={Sparkles}
              title="Frontend workspace"
              description="The React app translates those services into dashboards, analyzers, history, exports, diagnostics, and role-aware admin operations."
            />
            <AboutFeature
              icon={ShieldCheck}
              title="Operational outputs"
              description="Manual analysis, URL ingestion, executive analytics, retraining support, and professional reporting all sit on the same platform surface."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
