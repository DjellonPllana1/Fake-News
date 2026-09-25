/**
 * ============================================================================
 * NDËRTUESI I TABELAVE CSV PËR EXCEL (csv.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar kthen të dhënat e programit në format tabele CSV (Comma-Separated Values)
 * që mund të hapet lehtësisht nga çdo program tabelash si Microsoft Excel ose Google Sheets.
 * 
 * Si funksionon me fjalë të thjeshta:
 * 1. escapeCsvValue: Siguron që nëse një tekst ka presje, thonjëza ose rreshta të rinj,
 *    të vendoset brenda thonjëzave që Excel të mos ngatërrojë kolonat.
 * 2. buildCsv: Krijon rreshtin e parë me emrat e kolonave (Headers) dhe pastaj
 *    mbush të gjithë rreshtat e tjerë me të dhënat e artikujve.
 */

function escapeCsvValue(value) {
  const normalized = value === null || value === undefined ? "" : String(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }

  return normalized;
}

export function buildCsv(rows = [], columns = []) {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(typeof column.value === "function" ? column.value(row) : row[column.value])).join(","))
    .join("\n");

  return `${header}\n${body}`.trim();
}
