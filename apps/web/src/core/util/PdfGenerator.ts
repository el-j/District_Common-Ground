/**
 * Minimal, dependency-free PDF writer for simple single-font text documents.
 * The project's CSP/build conventions avoid pulling in a PDF library for one
 * feature — this hand-writes a valid PDF 1.4 byte stream (objects + xref
 * table + trailer) the same way SoundSynth.ts hand-writes audio instead of
 * shipping sample files.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15;
const CHARS_PER_LINE = 92;
const MAX_LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

function escapePdfText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapParagraph(text: string): string[] {
  if (text === '') return [''];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > CHARS_PER_LINE) {
    let cut = remaining.lastIndexOf(' ', CHARS_PER_LINE);
    if (cut <= 0) cut = CHARS_PER_LINE;
    lines.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  lines.push(remaining);
  return lines;
}

/** Builds a valid multi-page PDF Blob from a flat list of paragraphs (an empty string renders a blank line). */
export function buildSimplePdf(paragraphs: string[]): Blob {
  const allLines = paragraphs.flatMap(wrapParagraph);

  const pages: string[][] = [];
  for (let i = 0; i < allLines.length; i += MAX_LINES_PER_PAGE) {
    pages.push(allLines.slice(i, i + MAX_LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push(['']);

  const numPages = pages.length;
  const fontObjNum = 3;
  const firstPageObjNum = 4;
  const firstContentObjNum = firstPageObjNum + numPages;
  const maxObjNum = firstContentObjNum + numPages - 1;

  const objects: string[] = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  const kids = Array.from({ length: numPages }, (_, i) => `${firstPageObjNum + i} 0 R`).join(' ');
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>`;
  objects[fontObjNum] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  for (let i = 0; i < numPages; i++) {
    const pageObjNum = firstPageObjNum + i;
    const contentObjNum = firstContentObjNum + i;
    objects[pageObjNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>`;

    const y = PAGE_HEIGHT - MARGIN;
    const streamLines: string[] = ['BT', `/F1 ${FONT_SIZE} Tf`, `${LINE_HEIGHT} TL`, `${MARGIN} ${y} Td`];
    pages[i].forEach((line, li) => {
      if (li > 0) streamLines.push('T*');
      streamLines.push(`(${escapePdfText(line)}) Tj`);
    });
    streamLines.push('ET');
    const stream = streamLines.join('\n');
    objects[contentObjNum] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let n = 1; n <= maxObjNum; n++) {
    offsets[n] = pdf.length;
    pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${maxObjNum + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObjNum; n++) {
    pdf += `${offsets[n].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjNum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadPdf(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
