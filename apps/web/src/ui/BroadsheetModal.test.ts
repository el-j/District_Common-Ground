import { describe, it, expect } from 'vitest';
import { buildBroadsheetHTML, type BroadsheetData } from './broadsheetHTML';

const BASE_DATA: BroadsheetData = {
  headline: 'District Holds Steady Amid Economic Pressure',
  subheadline: 'Neighbours, we weather this together.',
  npcQuote: 'Every bit of solidarity counts.',
  npcName: 'Mira',
  foodIndex: 1.0,
  energyIndex: 1.0,
  dayNumber: 1,
};

describe('buildBroadsheetHTML', () => {
  it('renders without throwing on baseline data', () => {
    expect(() => buildBroadsheetHTML(BASE_DATA)).not.toThrow();
  });

  it('includes the headline in output', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('District Holds Steady Amid Economic Pressure');
  });

  it('includes the day number', () => {
    const html = buildBroadsheetHTML({ ...BASE_DATA, dayNumber: 42 });
    expect(html).toContain('Day 42');
  });

  it('includes NPC quote and name', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('Every bit of solidarity counts.');
    expect(html).toContain('Mira');
  });

  it('renders dynamic scenario data — food surge headline', () => {
    const html = buildBroadsheetHTML({
      ...BASE_DATA,
      headline: 'Food Prices Surge: Kitchen Coalition Responds',
      foodIndex: 1.35,
    });
    expect(() => html).not.toThrow();
    expect(html).toContain('Food Prices Surge');
    expect(html).toContain('index-high');
  });

  it('renders dynamic scenario data — energy spike', () => {
    const html = buildBroadsheetHTML({
      ...BASE_DATA,
      headline: 'Energy Costs Spike — Solar Co-op Sees New Members',
      energyIndex: 1.28,
    });
    expect(html).toContain('Energy Costs Spike');
    expect(html).toContain('index-high');
  });

  it('marks food as index-low when foodIndex < 0.95', () => {
    const html = buildBroadsheetHTML({ ...BASE_DATA, foodIndex: 0.90 });
    expect(html).toContain('index-low');
  });

  it('marks food as index-ok at baseline', () => {
    const html = buildBroadsheetHTML({ ...BASE_DATA, foodIndex: 1.0 });
    expect(html).toContain('index-ok');
  });

  it('includes crossword clue for commons engagement', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('Commons Clue');
    expect(html).toContain('solidarity');
  });

  it('includes accessible close button', () => {
    const html = buildBroadsheetHTML(BASE_DATA);
    expect(html).toContain('broadsheet-close');
    expect(html).toContain('Begin the Day');
  });
});
