import { describe, it, expect } from 'vitest';
import { buildSimplePdf } from './PdfGenerator';

async function blobText(blob: Blob): Promise<string> {
  return await blob.text();
}

describe('buildSimplePdf', () => {
  it('produces a well-formed single-page PDF for short content', async () => {
    const blob = buildSimplePdf(['Hello, Commons.', '', 'A short starter kit.']);
    expect(blob.type).toBe('application/pdf');
    const text = await blobText(blob);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trim().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Type /Page');
    expect(text).toContain('(Hello, Commons.) Tj');
    // Exactly one page for short content.
    expect(text.match(/\/Type \/Page(?!s)/g)?.length).toBe(1);
  });

  it('wraps long paragraphs and splits into multiple pages when needed', async () => {
    const longParagraph = 'word '.repeat(400).trim();
    const manyLines = Array.from({ length: 80 }, (_, i) => `Line ${i}`);
    const blob = buildSimplePdf([longParagraph, ...manyLines]);
    const text = await blobText(blob);
    const pageCount = text.match(/\/Type \/Page(?!s)/g)?.length ?? 0;
    expect(pageCount).toBeGreaterThan(1);
  });

  it('escapes PDF-special characters so the byte stream stays valid', async () => {
    const blob = buildSimplePdf(['Use a backslash \\ and (parentheses) safely.']);
    const text = await blobText(blob);
    expect(text).toContain('\\\\');
    expect(text).toContain('\\(parentheses\\)');
  });
});
