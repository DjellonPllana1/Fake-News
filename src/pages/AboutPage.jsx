// ============================================================
// AboutPage.jsx - Faqja "Rreth Platformës"
// ============================================================
// Kjo faqe shpjegon se çfarë është Verity Lens dhe si funksionon.
// Shfaq informacione mbi:
//   - Modelet e inteligjencës artificiale (ML) të përdorura
//   - Si funksionon verifikimi i provave (evidence verification)
//   - Si llogaritet Nota e Besimit (Trust Score)
//   - Arkitekturën e aplikacionit (backend + frontend)
// ============================================================

import { BrainCircuit, SearchCheck, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";

// AboutFeature - Kartela e veçorisë (feature card)
// Shfaq ikonën, titullin dhe përshkrimin e një veçorie të platformës
function AboutFeature({ icon, title, description }) {
  const Icon = icon;

  return (
    <article className="metric-tile">
      {/* Ikona dekorative */}
      <span className="metric-icon">
        <Icon className="h-4 w-4" />
      </span>
      {/* Titulli i veçorisë */}
      <strong className="text-[1.2rem]">{title}</strong>
      {/* Përshkrimi i veçorisë */}
      <p className="text-sm leading-7">{description}</p>
    </article>
  );
}

// AboutPage - Faqja kryesore "Rreth Nesh"
export function AboutPage() {
  return (
    <div className="page-grid">
      {/* Seksioni i parë: Përmbledhja e platformës */}
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader
            eyebrow="Platform Summary"
            title="Verity Lens is built for transparent credibility review, not just a single classifier output."
            description="The platform combines TF-IDF model comparison, rule-based credibility scoring, source reputation, claim verification, and uncertainty-aware decisions into an analyst-ready product experience."
            badge={{ label: "Explainable AI", variant: "info" }}
          />

          {/* Tre kartela me veçoritë kryesore */}
          <div className="three-column-grid">
            {/* Veçoria 1: Inteligjenca e Modelit ML */}
            <AboutFeature
              icon={BrainCircuit}
              title="Model intelligence"
              description="Multinomial Naive Bayes, Logistic Regression, and Linear SVM are benchmarked, versioned, and surfaced with metrics."
            />
            {/* Veçoria 2: Verifikimi i Provave */}
            <AboutFeature
              icon={SearchCheck}
              title="Evidence verification"
              description="Claims are extracted and compared against trusted-source coverage to identify support, contradiction, or missing evidence."
            />
            {/* Veçoria 3: Nota e Besimit */}
            <AboutFeature
              icon={ShieldCheck}
              title="Trust scoring"
              description="Machine learning, domain reputation, writing quality, and metadata quality all contribute to the final Trust Score."
            />
          </div>
        </CardContent>
      </Card>

      {/* Seksioni i dytë: dy karta krah për krah */}
      <div className="two-column-grid">
        {/* Karta 1: Shpjegueshmëria (Explainability) */}
        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Explainability First" title="Every prediction is unpacked" description="The frontend surfaces the full reasoning chain so users can inspect the outcome instead of trusting a black box." />
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              {/* Çdo analizë kthen: besimin, fjalët kryesore, fjalitë e dyshimta, etj. */}
              Every analysis returns prediction confidence, final probability distribution, influential keywords, suspicious sentences, named entities, rule
              findings, recommendations, and a plain-language explanation of why the score moved in a specific direction.
            </p>
            {/* Etiketat e veçorive të shpjegueshmërisë */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">Probability distribution</Badge>
              <Badge variant="neutral">Influential keywords</Badge>
              <Badge variant="neutral">Suspicious sentences</Badge>
              <Badge variant="neutral">Named entities</Badge>
              <Badge variant="neutral">Recommendations</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Karta 2: Pasiguria e Qëllimshme (UNCERTAIN) */}
        <Card>
          <CardContent className="space-y-6">
            <SectionHeader eyebrow="Responsible Ambiguity" title="UNCERTAIN is a product feature, not a fallback" description="The system explicitly avoids overclaiming when the model or evidence is weak." />
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              {/* Kur besimi i modelit është i ulët, artikulli shënohet UNCERTAIN */}
              When the model and supporting evidence do not cross the configured confidence threshold, the article is labeled UNCERTAIN instead of forcing an
              overconfident verdict.
            </p>
            {/* Shënim portokalli shpjegues */}
            <div className="rounded-[24px] border border-[rgba(255,194,102,0.24)] bg-[rgba(255,194,102,0.08)] p-4 text-sm leading-7 text-[var(--foreground)]">
              This reduces false confidence and encourages additional verification when the platform does not have enough signal.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seksioni i tretë: Arkitektura e platformës */}
      <Card>
        <CardContent className="space-y-8">
          <SectionHeader eyebrow="Architecture" title="What the platform layers do" description="Backend services stay clean and typed while the frontend turns them into an executive-grade analyst workspace." />

          {/* Tre kartela të arkitekturës */}
          <div className="three-column-grid">
            {/* Shërbimi backend (Express.js) */}
            <AboutFeature
              icon={Workflow}
              title="Backend services"
              description="The Express backend is organized into routes, controllers, services, middleware, and utilities with clean response contracts."
            />
            {/* Ndërfaqja e frontend-it (React) */}
            <AboutFeature
              icon={Sparkles}
              title="Frontend workspace"
              description="The React app translates those services into dashboards, analyzers, history, exports, diagnostics, and role-aware admin operations."
            />
            {/* Rezultatet operative */}
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
