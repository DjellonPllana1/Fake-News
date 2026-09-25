/**
 * ============================================================================
 * RREGULLAT E KONTROLLIT DHE PASTRIMIT TË TË DHËNAVE (validation.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar kontrollon me imtësi çdo të dhënë që vjen nga përdoruesi
 * përpara se sistemi ta pranojë atë.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Ashtu si një doganier që kontrollon dokumentet para kalimit:
 * - A është emaili i shkruar siç duhet me shenjën "@"?
 * - A është fjalëkalimi i plotësuar?
 * - A është linku i vërtetë me "http://" ose "https://"?
 * - A ka artikulli të paktën 40 shkronja që të mund të analizohet?
 * Nëse diçka mungon, ky funksion kthen menjëherë një mesazh të qartë gabimi.
 */

/**
 * Funksion ndihmës: Pastron tekstin dhe pret shkronjat e tepërta
 * që tejkalojnë gjatësinë e lejuar (maxLength).
 */
function sanitizeString(value, maxLength = 5000) {
  return String(value || "").trim().slice(0, maxLength);
}

/**
 * Funksion ndihmës: Shndërron vlerat në të vërtetë (true) ose e rreme (false).
 */
function parseBoolean(value, defaultValue = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return defaultValue;
}

/**
 * Funksion ndihmës: Siguron që numri i artikujve të kërkuar të jetë brenda kufijve normalë.
 */
function parseLimit(value, defaultValue = 50, maxValue = 200) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.min(Math.round(parsed), maxValue);
}

/**
 * Kontrollon nëse teksti është një link i vërtetë interneti (fillon me http ose https).
 */
function isHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Bashkon gabimet dhe vlerat e pastruara në një objekt të vetëm.
 */
function buildValidationResult(errors, value) {
  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}

/**
 * 1. KONTROLLI I TË DHËNAVE TË HYRJES (Login)
 * Kontrollon emailin dhe fjalëkalimin kur përdoruesi do të kyçet.
 */
export function validateLoginPayload(payload = {}) {
  const value = {
    email: sanitizeString(payload.email, 160).toLowerCase(),
    password: String(payload.password || ""),
  };
  const errors = [];

  if (!value.email || !value.email.includes("@")) {
    errors.push("Kërkohet një adresë e saktë emaili.");
  }

  if (!value.password) {
    errors.push("Fjalëkalimi është i detyrueshëm.");
  }

  return buildValidationResult(errors, value);
}

/**
 * 2. KONTROLLI I LINKUT TË ARTIKULLIT (URL)
 * Sigurohet që linku i futur të jetë një adresë uebi e vlefshme.
 */
export function validateFetchUrlPayload(payload = {}) {
  const value = {
    url: sanitizeString(payload.url, 700),
  };
  const errors = [];

  if (!value.url || !isHttpUrl(value.url)) {
    errors.push("Ju lutem vendosni një link të vlefshëm interneti (http ose https).");
  }

  return buildValidationResult(errors, value);
}

/**
 * 3. KONTROLLI I ARTIKULLIT PËR ANALIZË
 * Sigurohet që përdoruesi të ketë dhënë ose tekstin e artikullit, ose linkun e tij.
 */
export function validateAnalyzePayload(payload = {}) {
  const value = {
    headline: sanitizeString(payload.headline, 220),
    source: sanitizeString(payload.source, 220),
    url: sanitizeString(payload.url, 700),
    text: sanitizeString(payload.text, 20000),
    author: sanitizeString(payload.author, 180),
    publishedAt: sanitizeString(payload.publishedAt, 120),
    language: sanitizeString(payload.language || "English", 40) || "English",
    model: sanitizeString(payload.model, 120) || "Automatic Best Model",
    save: parseBoolean(payload.save, true),
  };
  const errors = [];

  // Duhet patjetër të paktën njëra: ose teksti ose linku
  if (!value.text && !value.url) {
    errors.push("Vendosni tekstin e artikullit ose linkun e tij për ta analizuar.");
  }

  if (value.url && !isHttpUrl(value.url)) {
    errors.push("Linku i dhënë duhet të fillojë me http ose https.");
  }

  if (value.text && value.text.length < 40 && !value.url) {
    errors.push("Teksti i artikullit është tepër i shkurtër për të dhënë një rezultat të saktë.");
  }

  return buildValidationResult(errors, value);
}

/**
 * 4. KONTROLLI I FILTRAVE TË HISTORIKUT
 */
export function validateHistoryQuery(query = {}) {
  return {
    search: sanitizeString(query.search || query.q, 160).toLowerCase(),
    label: sanitizeString(query.label, 40).toUpperCase(),
    limit: parseLimit(query.limit, 50, 250),
  };
}

/**
 * 5. KONTROLLI I FILTRAVE TË ARTIKUJVE NGA DATASETI
 */
export function validateArticlesQuery(query = {}) {
  return {
    search: sanitizeString(query.search || query.q, 160).toLowerCase(),
    label: sanitizeString(query.label, 40).toUpperCase(),
    limit: parseLimit(query.limit, 25, 100),
  };
}
