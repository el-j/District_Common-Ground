import { describe, it, expect } from 'vitest';
import { buildBroadsheetHTML, type BroadsheetData } from './broadsheetHTML';

function makeData(overrides: Partial<BroadsheetData> = {}): BroadsheetData {
  return {
    headline: 'Neighbors Rally for Community Kitchen',
    subheadline: 'A quiet week turns into a busy one.',
    npcQuote: "We're all in this together.",
    npcName: 'Mira',
    foodIndex: 1,
    energyIndex: 1,
    dayNumber: 5,
    ...overrides,
  };
}

describe('buildBroadsheetHTML', () => {
  it('renders the day number, headline, quote, and attributed NPC name', () => {
    const html = buildBroadsheetHTML(makeData());
    expect(html).toContain('Day 5');
    expect(html).toContain('Neighbors Rally for Community Kitchen');
    expect(html).toContain("We're all in this together.");
    expect(html).toContain('— Mira');
  });

  it('formats a food/energy index above 1 as a positive percentage with the high class', () => {
    const html = buildBroadsheetHTML(makeData({ foodIndex: 1.2, energyIndex: 1 }));
    expect(html).toContain('+20%');
    expect(html).toContain('index-high');
  });

  it('formats an index below 1 as a negative percentage with the low class', () => {
    const html = buildBroadsheetHTML(makeData({ foodIndex: 0.8 }));
    expect(html).toContain('-20%');
    expect(html).toContain('index-low');
  });

  it('omits the AI-wire citation line when source is not set', () => {
    const html = buildBroadsheetHTML(makeData());
    expect(html).not.toContain('AI Narrative Wire');
  });

  it('shows the AI-wire citation line when source is set', () => {
    const html = buildBroadsheetHTML(makeData({ source: 'live' }));
    expect(html).toContain('AI Narrative Wire — live');
  });

  it('omits the civic-actions sidebar section when no headlines are given', () => {
    const html = buildBroadsheetHTML(makeData());
    expect(html).not.toContain('Civic Actions Nearby');
  });

  it('renders one row per civic headline when provided', () => {
    const html = buildBroadsheetHTML(makeData({ civicHeadlines: ['Tool Drive (Riverside) — tomorrow', 'Fridge Restock (Mira) — in 3 days'] }));
    expect(html).toContain('Civic Actions Nearby');
    expect(html).toContain('Tool Drive (Riverside)');
    expect(html).toContain('Fridge Restock (Mira)');
    expect((html.match(/broadsheet-civic-row/g) ?? []).length).toBe(2);
  });
});
