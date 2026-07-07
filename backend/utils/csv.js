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
