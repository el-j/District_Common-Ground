import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';

/**
 * M16 Test 16.3 — Universal Empathy Design lexicon audit.
 * Scans all shipped source/content files for polarizing ideological jargon
 * (see docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md's
 * lexicon transformation table). Antagonists must be named by concrete bad
 * actions ("Predatory Speculators", "Outside Agitators", "Division & Hate"),
 * never by ideological labels.
 */

const SRC_ROOT = new URL('../../', import.meta.url).pathname;
const DATA_ROOT = new URL('../../../public/assets/data/', import.meta.url).pathname;
const SELF = 'lexiconAudit.test.ts';

function extname(fileName: string): string {
	const i = fileName.lastIndexOf('.');
	return i === -1 ? '' : fileName.slice(i);
}

function join(dir: string, name: string): string {
	return dir.endsWith('/') ? `${dir}${name}` : `${dir}/${name}`;
}

const BANNED_TERMS = [
  /\bfascis[mt]s?\b/i,
  /\banti-?fascis[mt]s?\b/i,
  /\bfar[- ]right\b/i,
  /\balt[- ]right\b/i,
  /\bcomrades?\b/i,
  /\bcadres?\b/i,
];

function collectFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectFiles(full, exts));
    } else if (exts.includes(extname(entry)) && entry !== SELF) {
      out.push(full);
    }
  }
  return out;
}

describe('Universal Lexicon Audit (Test 16.3)', () => {
  it('contains zero instances of polarizing ideological labels in TS source', () => {
    const files = collectFiles(SRC_ROOT, ['.ts']);
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of BANNED_TERMS) {
        if (pattern.test(content)) {
          offenders.push(`${file} matched ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('contains zero instances of polarizing ideological labels in game content JSON', () => {
    const files = collectFiles(DATA_ROOT, ['.json']);
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of BANNED_TERMS) {
        if (pattern.test(content)) {
          offenders.push(`${file} matched ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
