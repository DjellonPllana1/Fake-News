function sanitizeString(value, maxLength = 5000) {
  return String(value || "").trim().slice(0, maxLength);
}

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

function parseLimit(value, defaultValue = 50, maxValue = 200) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.min(Math.round(parsed), maxValue);
}

function isHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildValidationResult(errors, value) {
  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}

export function validateLoginPayload(payload = {}) {
  const value = {
    email: sanitizeString(payload.email, 160).toLowerCase(),
    password: String(payload.password || ""),
  };
  const errors = [];

  if (!value.email || !value.email.includes("@")) {
    errors.push("A valid email address is required.");
  }

  if (!value.password) {
    errors.push("Password is required.");
  }

  return buildValidationResult(errors, value);
}

export function validateFetchUrlPayload(payload = {}) {
  const value = {
    url: sanitizeString(payload.url, 700),
  };
  const errors = [];

  if (!value.url || !isHttpUrl(value.url)) {
    errors.push("Please provide a valid http or https article URL.");
  }

  return buildValidationResult(errors, value);
}

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

  if (!value.text && !value.url) {
    errors.push("Provide article text or an article URL to analyze.");
  }

  if (value.url && !isHttpUrl(value.url)) {
    errors.push("The provided URL must start with http or https.");
  }

  if (value.text && value.text.length < 40 && !value.url) {
    errors.push("Article text is too short for reliable analysis.");
  }

  return buildValidationResult(errors, value);
}

export function validateHistoryQuery(query = {}) {
  return {
    search: sanitizeString(query.search || query.q, 160).toLowerCase(),
    label: sanitizeString(query.label, 40).toUpperCase(),
    limit: parseLimit(query.limit, 50, 250),
  };
}

export function validateArticlesQuery(query = {}) {
  return {
    search: sanitizeString(query.search || query.q, 160).toLowerCase(),
    label: sanitizeString(query.label, 40).toUpperCase(),
    limit: parseLimit(query.limit, 25, 100),
  };
}
