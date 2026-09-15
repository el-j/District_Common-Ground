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
const GO_ROOT = new URL('../../../../api/internal/', import.meta.url).pathname;
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

  /**
   * M9 follow-up (audit 2026-09-15): the Go backend's `FASCIST_AGITATION`
   * archetype constant slipped past this audit for over a milestone because
   * it lives in an underscore-joined identifier — `\b` treats `_` as a word
   * character, so the original regex-based scan (correct for prose) never
   * matched inside `FASCIST_AGITATION` even if it had scanned Go source.
   * This check uses plain substring matching instead, specifically to catch
   * SNAKE_CASE identifiers a word-boundary regex would miss.
   */
  it('contains zero instances of banned root terms in Go source (substring match, catches SNAKE_CASE identifiers)', () => {
    // internal/pulse/news.go's keyword-classification table is the one deliberate
    // exception: it recognises real-world news text ABOUT far-right activity so the
    // game can react to it — those keywords are input-side classification, never
    // echoed to a player, unlike every other Go identifier/string this scans.
    const inputClassificationFiles = ['internal/pulse/news.go', 'internal/pulse/economy_test.go'];
    const files = collectFiles(GO_ROOT, ['.go']).filter(
      file => !inputClassificationFiles.some(exempt => file.endsWith(exempt)),
    );
    const bannedSubstrings = ['fascis', 'comrade', 'cadre', 'far-right', 'far right', 'alt-right', 'alt right'];
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8').toLowerCase();
      for (const term of bannedSubstrings) {
        if (content.includes(term)) {
          offenders.push(`${file} matched "${term}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
