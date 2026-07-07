import fs from "fs";
import path from "path";

const registryFile = path.resolve("backend", "data", "source-reputation.json");
let cachedRegistry = null;

function clampScore(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeBadge(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "trusted") {
    return "Trusted";
  }

  if (normalized === "medium") {
    return "Medium";
  }

  if (normalized === "suspicious") {
    return "Suspicious";
  }

  return "Unknown";
}

function deriveBadge(score) {
  if (score >= 80) {
    return "Trusted";
  }

  if (score >= 55) {
    return "Medium";
  }

  return "Suspicious";
}

function normalizeDomain(value = "") {
  const input = String(value || "").trim().toLowerCase();

  if (!input) {
    return "";
  }

  if (!input.includes(".") && !input.startsWith("http://") && !input.startsWith("https://")) {
    const parts = input.split(/\s+/).filter(Boolean);

    if (parts.length > 1) {
      return "";
    }
  }

  try {
    const hostname = new URL(input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`).hostname;
    return hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return input
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      .trim();
  }
}

function normalizeEntry(entry = {}, index = 0) {
  const domain = normalizeDomain(entry.domain || entry.host || "");
  const aliases = [...new Set((Array.isArray(entry.aliases) ? entry.aliases : []).map(normalizeDomain).filter(Boolean))];
  const trustScore = clampScore(entry.trustScore);
  const badge = normalizeBadge(entry.badge) !== "Unknown" ? normalizeBadge(entry.badge) : deriveBadge(trustScore);

  return {
    id: entry.id || `source-domain-${index + 1}`,
    domain,
    aliases,
    trustScore,
    badge,
    badgeTone: badge.toLowerCase(),
    politicalBias: String(entry.politicalBias || "Unknown").trim(),
    country: String(entry.country || "Unknown").trim(),
    reliability: String(entry.reliability || "Unknown").trim(),
    factCheckingHistory: String(entry.factCheckingHistory || "No fact-checking history note is available for this domain.").trim(),
    notes: String(entry.notes || "").trim(),
  };
}

function buildUnknownReputation(domain = "") {
  return {
    known: false,
    domain: domain || "Unknown domain",
    trustScore: 50,
    badge: "Unknown",
    badgeTone: "unknown",
    politicalBias: "Unknown",
    country: "Unknown",
    reliability: "Unknown",
    factCheckingHistory: "This domain is not yet listed in the local source reputation registry.",
    notes: "",
    matchedDomain: domain || "",
  };
}

function loadRegistry() {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  try {
    const content = fs.readFileSync(registryFile, "utf8");
    const parsed = JSON.parse(content);
    cachedRegistry = {
      meta: parsed.meta || {},
      domains: (parsed.domains || []).map(normalizeEntry).filter((entry) => entry.domain),
    };
  } catch {
    cachedRegistry = {
      meta: {
        name: "Verity Lens Source Reputation Registry",
        version: 1,
      },
      domains: [],
    };
  }

  return cachedRegistry;
}

function matchesDomain(hostname, entry) {
  if (!hostname || !entry?.domain) {
    return false;
  }

  if (hostname === entry.domain || hostname.endsWith(`.${entry.domain}`)) {
    return true;
  }

  return entry.aliases.some((alias) => hostname === alias || hostname.endsWith(`.${alias}`));
}

export function getSourceReputationRegistry() {
  return loadRegistry();
}

export function getSourceReputation(value = "") {
  const registry = loadRegistry();
  const hostname = normalizeDomain(value);

  if (!hostname) {
    return buildUnknownReputation("");
  }

  const entry = registry.domains.find((item) => matchesDomain(hostname, item));

  if (!entry) {
    return buildUnknownReputation(hostname);
  }

  return {
    known: true,
    domain: entry.domain,
    trustScore: entry.trustScore,
    badge: entry.badge,
    badgeTone: entry.badgeTone,
    politicalBias: entry.politicalBias,
    country: entry.country,
    reliability: entry.reliability,
    factCheckingHistory: entry.factCheckingHistory,
    notes: entry.notes,
    matchedDomain: hostname,
    aliases: entry.aliases,
  };
}

export function isTrustedSource(value = "") {
  return getSourceReputation(value).badge === "Trusted";
}
