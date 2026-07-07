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

function wrapText(text = "", maxLength = 92) {
  const lines = [];

  toAscii(text)
    .split(/\n/)
    .forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);

      if (!words.length) {
        lines.push("");
        return;
      }

      let line = "";

      words.forEach((word) => {
        const next = line ? `${line} ${word}` : word;

        if (next.length > maxLength) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });

      if (line) {
        lines.push(line);
      }

      lines.push("");
    });

  return lines;
}

function buildContentStream(lines = []) {
  const commands = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"];

  lines.forEach((line, index) => {
    const escaped = escapePdfText(line);
    commands.push(index === 0 ? `(${escaped}) Tj` : `T* (${escaped}) Tj`);
  });

  commands.push("ET");
  return commands.join("\n");
}

export function buildPdfDocument({ title = "Document", sections = [] }) {
  const allLines = wrapText(title.toUpperCase()).concat([""]).concat(
    sections.flatMap((section) => wrapText(`${section.heading}\n${section.body}`))
  );
  const linesPerPage = 46;
  const pages = [];

  for (let index = 0; index < allLines.length; index += linesPerPage) {
    pages.push(allLines.slice(index, index + linesPerPage));
  }

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

  const fontObjectNumber = objectNumber;
  const kids = pageObjectNumbers.map((number) => `${number} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${kids}] >> endobj`);

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = contentObjectNumbers[index];
    const content = buildContentStream(pageLines);
    objects.push(
      `${pageObjectNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >> endobj`
    );
    objects.push(`${contentObjectNumber} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj`);
  });

  objects.push(`${fontObjectNumber} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

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
