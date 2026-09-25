/**
 * ============================================================================
 * SHËRBIMI I REPUTACIONIT TË BURIMEVE (sourceReputationService.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar shërben si "regjistri i besueshmërisë" për mediat dhe portalet e lajmeve.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Ashtu si në jetën reale ku disa gazeta njihen për gazetari serioze dhe disa të tjera
 * për thashetheme e mashtrime, ky sistem mban një listë me emrat e faqeve të internetit:
 * - Burime të Besueshme (Trusted): p.sh. Reuters, BBC, agjenci të njohura lajmesh (pikë të larta).
 * - Burime të Mesme (Medium): faqe me besueshmëri mesatare.
 * - Burime të Dyshimta (Suspicious): portale që shpërndajnë klikime mashtruese (clickbait) ose gënjeshtra.
 * - Të Panjohura (Unknown): faqe të reja që nuk janë vlerësuar ende (marrin pikë neutrale 50/100).
 */

import fs from "fs";
import path from "path";

// Vendndodhja e skedarit ku ndodhet lista me portalet e vlerësuara
const registryFile = path.resolve("backend", "data", "source-reputation.json");
let cachedRegistry = null;

/**
 * Funksion ndihmës: Kufizon notën që të jetë gjithmonë midis 0 dhe 100.
 */
function clampScore(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

/**
 * Funksion ndihmës: Standardizon etiketën (Trusted, Medium, Suspicious).
 */
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

/**
 * Përcakton nivelin sipas notës me pikë:
 * - Mbi 80 pikë -> E Besueshme (Trusted)
 * - Mbi 55 pikë -> Mesatare (Medium)
 * - Nën 55 pikë -> E Dyshimtë (Suspicious)
 */
function deriveBadge(score) {
  if (score >= 80) {
    return "Trusted";
  }

  if (score >= 55) {
    return "Medium";
  }

  return "Suspicious";
}

/**
 * Pastron adresën e uebfaqes (URL-në) për të nxjerrë vetëm emrin e thjeshtë të domenit.
 * Shembull: "https://www.bbc.com/news/article123" shndërrohet thjesht në "bbc.com".
 */
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

/**
 * Formatizon të dhënat e një portali në regjistër.
 */
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

/**
 * Përgatit përgjigjen kur një portal nuk njihet fare nga sistemi.
 * Merr pikë neutrale (50 nga 100).
 */
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
    factCheckingHistory: "Ky portal nuk është regjistruar ende në listën e reputacionit.",
    notes: "",
    matchedDomain: domain || "",
  };
}

/**
 * Lexon skedarin e regjistrit nga disku dhe e ruan në memorie (Cache)
 * që serveri të mos e lexojë skedarin nga e para çdo sekondë.
 */
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

/**
 * Kontrollon nëse domeni i kërkuar përputhet me një portal të njohur
 * (përfshirë nëndomenet, p.sh. news.bbc.co.uk përputhet me bbc.co.uk).
 */
function matchesDomain(hostname, entry) {
  if (!hostname || !entry?.domain) {
    return false;
  }

  if (hostname === entry.domain || hostname.endsWith(`.${entry.domain}`)) {
    return true;
  }

  return entry.aliases.some((alias) => hostname === alias || hostname.endsWith(`.${alias}`));
}

/**
 * Kthen të gjithë regjistrin e portaleve të njohura.
 */
export function getSourceReputationRegistry() {
  return loadRegistry();
}

/**
 * FUNKSIONI KRYESOR: Gjen reputacionin e një faqeje specifike
 * Merr linkun ose emrin e portalit dhe kthen të gjitha të dhënat mbi të.
 */
export function getSourceReputation(value = "") {
  const registry = loadRegistry();
  const hostname = normalizeDomain(value);

  if (!hostname) {
    return buildUnknownReputation("");
  }

  // Kërkojmë nëse domeni ndodhet në listën tonë
  const entry = registry.domains.find((item) => matchesDomain(hostname, item));

  if (!entry) {
    return buildUnknownReputation(hostname);
  }

  // Kthejmë profilin e plotë të reputacionit të atij portali
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

/**
 * Kontrollon shpejt a është ky portal në kategorinë "I Besueshëm" (Trusted).
 */
export function isTrustedSource(value = "") {
  return getSourceReputation(value).badge === "Trusted";
}
