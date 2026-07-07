export const ROUTES = {
  dashboard: {
    id: "dashboard",
    title: "Dashboard",
    description: "Executive analytics for platform performance, model health, suspicious patterns, and live fake news intelligence.",
  },
  analyze: {
    id: "analyze",
    title: "Analyze Article",
    description: "Paste article text to classify it as REAL, FAKE, or UNCERTAIN.",
  },
  "url-analyzer": {
    id: "url-analyzer",
    title: "URL Analyzer",
    description: "Fetch live article content from a URL and analyze it in one flow.",
  },
  history: {
    id: "history",
    title: "History",
    description: "Review every saved analysis with searchable evidence and confidence.",
  },
  "model-metrics": {
    id: "model-metrics",
    title: "Model Metrics",
    description: "Compare Naive Bayes, Logistic Regression, and Linear SVM results.",
  },
  "system-diagnostics": {
    id: "system-diagnostics",
    title: "System Diagnostics",
    description: "Review runtime health, configuration, storage, and model artifact diagnostics.",
  },
  about: {
    id: "about",
    title: "About",
    description: "Learn how the explainable AI and credibility engine produce each decision.",
  },
};

export const NAVIGATION_ORDER = [
  "dashboard",
  "analyze",
  "url-analyzer",
  "history",
  "model-metrics",
  "system-diagnostics",
  "about",
];

export const RESULT_META = {
  REAL: {
    badge: "REAL",
    tone: "real",
    description: "Likely legitimate reporting",
  },
  FAKE: {
    badge: "FAKE",
    tone: "fake",
    description: "Likely misleading or fabricated",
  },
  UNCERTAIN: {
    badge: "UNCERTAIN",
    tone: "uncertain",
    description: "Needs extra verification",
  },
};

export const DEMO_CREDENTIALS = {
  email: "dion@demo.com",
  password: "password123",
};
