const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN_X = 40;
const PAGE_MARGIN_BOTTOM = 40;
const HEADER_HEIGHT = 82;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 18;

const COLORS = {
  ink: "#10263A",
  muted: "#5E7485",
  brand: "#11324A",
  accent: "#2E86AB",
  accentSoft: "#D8EEF8",
  panel: "#F5F8FB",
  border: "#D7E2EA",
  success: "#2A9D8F",
  warning: "#D4A72C",
  danger: "#D96C6C",
  white: "#FFFFFF",
};

function toAscii(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function escapePdfText(value = "") {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function hexToRgb(hex = "#000000") {
  const normalized = String(hex || "#000000").replace("#", "").trim();
  const expanded = normalized.length === 3 ? normalized.split("").map((item) => `${item}${item}`).join("") : normalized.padEnd(6, "0").slice(0, 6);
  const red = Number.parseInt(expanded.slice(0, 2), 16) / 255;
  const green = Number.parseInt(expanded.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(expanded.slice(4, 6), 16) / 255;

  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function estimateTextWidth(text = "", fontSize = 11) {
  const normalized = toAscii(text);
  let width = 0;

  for (const character of normalized) {
    if (character === " ") {
      width += fontSize * 0.28;
    } else if (/[A-Z0-9]/.test(character)) {
      width += fontSize * 0.58;
    } else if (/[il.,:;|]/.test(character)) {
      width += fontSize * 0.24;
    } else {
      width += fontSize * 0.5;
    }
  }

  return width;
}

function wrapTextToWidth(text = "", maxWidth = 500, fontSize = 11) {
  const paragraphs = toAscii(text).split(/\n/);
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      return;
    }

    let line = "";

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;

      if (estimateTextWidth(nextLine, fontSize) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = nextLine;
      }
    });

    if (line) {
      lines.push(line);
    }

    lines.push("");
  });

  while (lines.length && !lines[lines.length - 1]) {
    lines.pop();
  }

  return lines;
}

function drawRect(commands, { x, y, width, height, fillColor = null, strokeColor = null, lineWidth = 1 }) {
  if (fillColor) {
    commands.push(`${hexToRgb(fillColor)} rg`);
  }

  if (strokeColor) {
    commands.push(`${hexToRgb(strokeColor)} RG`);
    commands.push(`${lineWidth} w`);
  }

  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${fillColor && strokeColor ? "B" : fillColor ? "f" : "S"}`);
}

function drawLine(commands, { x1, y1, x2, y2, color = COLORS.border, lineWidth = 1 }) {
  commands.push(`${hexToRgb(color)} RG`);
  commands.push(`${lineWidth} w`);
  commands.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
}

function drawText(commands, { text = "", x = 0, y = 0, size = 11, font = "F1", color = COLORS.ink }) {
  const sanitized = escapePdfText(toAscii(text));
  commands.push(`BT /${font} ${size} Tf ${hexToRgb(color)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${sanitized}) Tj ET`);
}

function drawWrappedText(commands, { text = "", x = 0, y = 0, maxWidth = 500, size = 11, font = "F1", color = COLORS.ink, leading = null }) {
  const lines = wrapTextToWidth(text, maxWidth, size);
  const lineHeight = leading || size * 1.45;
  let cursorY = y;

  lines.forEach((line) => {
    drawText(commands, {
      text: line,
      x,
      y: cursorY,
      size,
      font,
      color,
    });
    cursorY -= lineHeight;
  });

  return cursorY;
}

function createPdfObjects(pages = []) {
  const objects = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");

  const pageObjectNumbers = [];
  const contentObjectNumbers = [];
  let objectNumber = 3;

  pages.forEach(() => {
    pageObjectNumbers.push(objectNumber);
    objectNumber += 1;
    contentObjectNumbers.push(objectNumber);
    objectNumber += 1;
  });

  const fontRegularObjectNumber = objectNumber;
  objectNumber += 1;
  const fontBoldObjectNumber = objectNumber;
  const kids = pageObjectNumbers.map((number) => `${number} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${kids}] >> endobj`);

  pages.forEach((page, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = contentObjectNumbers[index];
    const content = page.commands.join("\n");

    objects.push(
      `${pageObjectNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularObjectNumber} 0 R /F2 ${fontBoldObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >> endobj`
    );
    objects.push(`${contentObjectNumber} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj`);
  });

  objects.push(`${fontRegularObjectNumber} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);
  objects.push(`${fontBoldObjectNumber} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj`);

  return objects;
}

function finalizePdf(objects = []) {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefPosition = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function createPage(report, pageNumber) {
  const page = {
    number: pageNumber,
    commands: [],
  };

  drawRect(page.commands, {
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    fillColor: COLORS.brand,
  });
  drawRect(page.commands, {
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT - 8,
    width: PAGE_WIDTH,
    height: 8,
    fillColor: COLORS.accent,
  });
  drawText(page.commands, {
    text: report.brand || "Verity Lens",
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 36,
    size: 20,
    font: "F2",
    color: COLORS.white,
  });
  drawText(page.commands, {
    text: report.headerLabel || "AI Research Report",
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 58,
    size: 9.5,
    font: "F1",
    color: "#D9E8F2",
  });
  drawText(page.commands, {
    text: `Generated ${report.generatedAt || ""}`,
    x: PAGE_WIDTH - 180,
    y: PAGE_HEIGHT - 46,
    size: 9.5,
    font: "F1",
    color: "#D9E8F2",
  });
  drawLine(page.commands, {
    x1: PAGE_MARGIN_X,
    y1: 28,
    x2: PAGE_WIDTH - PAGE_MARGIN_X,
    y2: 28,
    color: COLORS.border,
    lineWidth: 0.8,
  });
  drawText(page.commands, {
    text: report.footerNote || "Verity Lens AI credibility report",
    x: PAGE_MARGIN_X,
    y: 16,
    size: 8.5,
    font: "F1",
    color: COLORS.muted,
  });
  drawText(page.commands, {
    text: `Page ${pageNumber}`,
    x: PAGE_WIDTH - 78,
    y: 16,
    size: 8.5,
    font: "F1",
    color: COLORS.muted,
  });

  return page;
}

function drawMetricCard(commands, { x, y, width, height, label, value, detail, accentColor }) {
  drawRect(commands, {
    x,
    y,
    width,
    height,
    fillColor: COLORS.panel,
    strokeColor: COLORS.border,
    lineWidth: 0.9,
  });
  drawRect(commands, {
    x,
    y: y + height - 5,
    width,
    height: 5,
    fillColor: accentColor || COLORS.accent,
  });
  drawText(commands, {
    text: label,
    x: x + 14,
    y: y + height - 24,
    size: 9.5,
    font: "F1",
    color: COLORS.muted,
  });
  drawText(commands, {
    text: value,
    x: x + 14,
    y: y + height - 48,
    size: 18,
    font: "F2",
    color: COLORS.ink,
  });
  drawWrappedText(commands, {
    text: detail || "",
    x: x + 14,
    y: y + 16,
    maxWidth: width - 28,
    size: 8.5,
    font: "F1",
    color: COLORS.muted,
    leading: 10.5,
  });
}

function drawBarChart(commands, { x, y, width, height, title, items = [], maxValue = 100 }) {
  drawRect(commands, {
    x,
    y,
    width,
    height,
    fillColor: COLORS.panel,
    strokeColor: COLORS.border,
    lineWidth: 0.9,
  });
  drawText(commands, {
    text: title,
    x: x + 14,
    y: y + height - 24,
    size: 11,
    font: "F2",
    color: COLORS.ink,
  });

  const chartTop = y + height - 52;
  const barHeight = 16;
  const gap = 16;
  const labelWidth = 108;
  const barWidth = width - labelWidth - 34;

  items.slice(0, 5).forEach((item, index) => {
    const currentY = chartTop - index * (barHeight + gap);
    const safeValue = Math.max(0, Number(item.value || 0));
    const percentage = maxValue > 0 ? Math.min(1, safeValue / maxValue) : 0;

    drawText(commands, {
      text: item.label,
      x: x + 14,
      y: currentY + 3,
      size: 9,
      font: "F1",
      color: COLORS.muted,
    });
    drawRect(commands, {
      x: x + labelWidth,
      y: currentY,
      width: barWidth,
      height: barHeight,
      fillColor: COLORS.accentSoft,
    });
    drawRect(commands, {
      x: x + labelWidth,
      y: currentY,
      width: Math.max(6, barWidth * percentage),
      height: barHeight,
      fillColor: item.color || COLORS.accent,
    });
    drawText(commands, {
      text: item.displayValue || `${Math.round(safeValue)}%`,
      x: x + labelWidth + barWidth - 36,
      y: currentY + 3,
      size: 8.5,
      font: "F2",
      color: COLORS.ink,
    });
  });
}

function renderSectionChunks(report, state, section) {
  const pageContentWidth = PAGE_WIDTH - PAGE_MARGIN_X * 2;
  const heading = toAscii(section.heading || "Section");
  const titleFontSize = 13;
  const bodyFontSize = 10;
  const bodyLeading = 13.5;
  const bodyLines = wrapTextToWidth(section.body || "", pageContentWidth - 32, bodyFontSize);
  let remainingLines = [...bodyLines];
  let firstChunk = true;

  while (remainingLines.length || firstChunk) {
    const page = state.page;
    const availableHeight = state.cursorY - PAGE_MARGIN_BOTTOM;

    if (availableHeight < 110) {
      state.page = createPage(report, state.pages.length + 1);
      state.pages.push(state.page);
      state.cursorY = CONTENT_TOP;
    }

    const maxLines = Math.max(4, Math.floor((state.cursorY - PAGE_MARGIN_BOTTOM - 42) / bodyLeading) - 2);
    const chunk = remainingLines.splice(0, maxLines);
    const cardHeight = 34 + Math.max(chunk.length, 2) * bodyLeading + 20;

    if (state.cursorY - cardHeight < PAGE_MARGIN_BOTTOM) {
      state.page = createPage(report, state.pages.length + 1);
      state.pages.push(state.page);
      state.cursorY = CONTENT_TOP;
    }

    const cardY = state.cursorY - cardHeight;

    drawRect(page.commands, {
      x: PAGE_MARGIN_X,
      y: cardY,
      width: pageContentWidth,
      height: cardHeight,
      fillColor: section.tone === "accent" ? "#EDF7FC" : COLORS.panel,
      strokeColor: COLORS.border,
      lineWidth: 0.9,
    });
    drawText(page.commands, {
      text: firstChunk ? heading : `${heading} (continued)`,
      x: PAGE_MARGIN_X + 16,
      y: state.cursorY - 24,
      size: titleFontSize,
      font: "F2",
      color: COLORS.ink,
    });
    drawWrappedText(page.commands, {
      text: chunk.join("\n"),
      x: PAGE_MARGIN_X + 16,
      y: state.cursorY - 44,
      maxWidth: pageContentWidth - 32,
      size: bodyFontSize,
      font: "F1",
      color: COLORS.ink,
      leading: bodyLeading,
    });

    state.cursorY = cardY - 16;
    firstChunk = false;
  }
}

export function buildPdfDocument({ title = "Document", sections = [] }) {
  const report = {
    brand: "Verity Lens",
    headerLabel: "Plain Document Export",
    title,
    subtitle: "",
    metaLine: "",
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    footerNote: "Verity Lens document export",
    metricCards: [],
    charts: [],
    sections,
  };

  return buildAcademicReportPdf(report);
}

export function buildAcademicReportPdf(report = {}) {
  const normalizedReport = {
    brand: report.brand || "Verity Lens",
    headerLabel: report.headerLabel || "AI Research Report",
    title: report.title || "Untitled Report",
    subtitle: report.subtitle || "",
    metaLine: report.metaLine || "",
    generatedAt: report.generatedAt || new Date().toISOString().slice(0, 16).replace("T", " "),
    footerNote: report.footerNote || "Generated by Verity Lens for academic and professional review",
    metricCards: Array.isArray(report.metricCards) ? report.metricCards : [],
    charts: Array.isArray(report.charts) ? report.charts : [],
    sections: Array.isArray(report.sections) ? report.sections : [],
  };

  const pages = [];
  let page = createPage(normalizedReport, 1);
  pages.push(page);

  drawRect(page.commands, {
    x: PAGE_MARGIN_X,
    y: 600,
    width: PAGE_WIDTH - PAGE_MARGIN_X * 2,
    height: 110,
    fillColor: COLORS.brand,
  });
  drawText(page.commands, {
    text: normalizedReport.headerLabel,
    x: PAGE_MARGIN_X + 18,
    y: 682,
    size: 10,
    font: "F1",
    color: "#CFE3F0",
  });
  let heroY = drawWrappedText(page.commands, {
    text: normalizedReport.title,
    x: PAGE_MARGIN_X + 18,
    y: 656,
    maxWidth: PAGE_WIDTH - PAGE_MARGIN_X * 2 - 36,
    size: 23,
    font: "F2",
    color: COLORS.white,
    leading: 26,
  });
  drawWrappedText(page.commands, {
    text: normalizedReport.subtitle,
    x: PAGE_MARGIN_X + 18,
    y: heroY - 4,
    maxWidth: PAGE_WIDTH - PAGE_MARGIN_X * 2 - 36,
    size: 10,
    font: "F1",
    color: "#DCEAF3",
    leading: 12.5,
  });
  drawText(page.commands, {
    text: normalizedReport.metaLine,
    x: PAGE_MARGIN_X + 18,
    y: 614,
    size: 9.5,
    font: "F1",
    color: "#DCEAF3",
  });

  const metricCards = normalizedReport.metricCards.slice(0, 4);
  const metricCardWidth = (PAGE_WIDTH - PAGE_MARGIN_X * 2 - 18) / 2;
  const metricCardHeight = 74;

  metricCards.forEach((card, index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    drawMetricCard(page.commands, {
      x: PAGE_MARGIN_X + column * (metricCardWidth + 18),
      y: 500 - row * 92,
      width: metricCardWidth,
      height: metricCardHeight,
      label: card.label,
      value: card.value,
      detail: card.detail,
      accentColor: card.accentColor,
    });
  });

  const chartBaseY = metricCards.length > 2 ? 314 : 406;
  normalizedReport.charts.slice(0, 2).forEach((chart, index) => {
    drawBarChart(page.commands, {
      x: PAGE_MARGIN_X + index * ((PAGE_WIDTH - PAGE_MARGIN_X * 2 - 18) / 2 + 18),
      y: chartBaseY,
      width: (PAGE_WIDTH - PAGE_MARGIN_X * 2 - 18) / 2,
      height: 150,
      title: chart.title,
      items: chart.items || [],
      maxValue: chart.maxValue || 100,
    });
  });

  if (normalizedReport.sections.length) {
    const abstractSection = normalizedReport.sections[0];
    const abstractY = 92;
    const abstractHeight = 188;
    drawRect(page.commands, {
      x: PAGE_MARGIN_X,
      y: abstractY,
      width: PAGE_WIDTH - PAGE_MARGIN_X * 2,
      height: abstractHeight,
      fillColor: COLORS.panel,
      strokeColor: COLORS.border,
      lineWidth: 0.9,
    });
    drawText(page.commands, {
      text: abstractSection.heading,
      x: PAGE_MARGIN_X + 16,
      y: abstractY + abstractHeight - 24,
      size: 13,
      font: "F2",
      color: COLORS.ink,
    });
    drawWrappedText(page.commands, {
      text: abstractSection.body,
      x: PAGE_MARGIN_X + 16,
      y: abstractY + abstractHeight - 46,
      maxWidth: PAGE_WIDTH - PAGE_MARGIN_X * 2 - 32,
      size: 10,
      font: "F1",
      color: COLORS.ink,
      leading: 13.5,
    });
  }

  const remainingSections = normalizedReport.sections.slice(1);

  if (remainingSections.length) {
    const state = {
      pages,
      page: createPage(normalizedReport, 2),
      cursorY: CONTENT_TOP,
    };

    pages.push(state.page);
    remainingSections.forEach((section) => {
      renderSectionChunks(normalizedReport, state, section);
    });
  }

  return finalizePdf(createPdfObjects(pages));
}
