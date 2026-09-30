export interface BroadsheetData {
  headline: string;
  subheadline: string;
  npcQuote: string;
  npcName: string;
  foodIndex: number;
  energyIndex: number;
  dayNumber: number;
  civicHeadlines?: string[];
  /** Set only when the headline came from the live AI narrative pipeline
   *  ("live" | "cached"); omitted for the hardcoded-template fallback. */
  source?: string;
}

export function buildBroadsheetHTML(data: BroadsheetData): string {
  const foodPct = ((data.foodIndex - 1) * 100).toFixed(0);
  const energyPct = ((data.energyIndex - 1) * 100).toFixed(0);
  const foodSign = data.foodIndex >= 1 ? '+' : '';
  const energySign = data.energyIndex >= 1 ? '+' : '';
  const foodClass = data.foodIndex > 1.1 ? 'index-high' : data.foodIndex < 0.95 ? 'index-low' : 'index-ok';
  const energyClass = data.energyIndex > 1.1 ? 'index-high' : data.energyIndex < 0.95 ? 'index-low' : 'index-ok';

  const clue = clueForDay(data.dayNumber);
  return `
    <div class="broadsheet-masthead">
      <h1 id="broadsheet-title" class="broadsheet-name">The Daily District Ground</h1>
      <div class="broadsheet-dateline">Day ${data.dayNumber} · Evening Edition — Your Neighbourhood Matters</div>
    </div>
    <div class="broadsheet-columns">
      <div class="broadsheet-col broadsheet-main">
        <h2 class="broadsheet-headline">${data.headline}</h2>
        ${data.source ? `<p class="broadsheet-citation">📡 AI Narrative Wire — ${data.source}</p>` : ''}
        <p class="broadsheet-sub">${data.subheadline}</p>
        <blockquote class="broadsheet-quote">
          "${data.npcQuote}"
          <cite>— ${data.npcName}</cite>
        </blockquote>
      </div>
      <div class="broadsheet-col broadsheet-sidebar">
        <div class="broadsheet-barometer">
          <h3>District Barometer</h3>
          <div class="barometer-row">
            <span>🧺 Food</span>
            <span class="${foodClass}">${foodSign}${foodPct}%</span>
          </div>
          <div class="barometer-row">
            <span>⚡ Energy</span>
            <span class="${energyClass}">${energySign}${energyPct}%</span>
          </div>
        </div>
        <div class="broadsheet-commons-clue">
          <h3>Commons Clue (+5 Energy)</h3>
          <p class="commons-clue-hint">Across: ${clue.hint}</p>
          <input class="commons-clue-input" type="text" maxlength="${clue.answer.length + 2}" placeholder="${'_'.repeat(clue.answer.length)}"
            aria-label="Commons Clue answer" autocomplete="off" spellcheck="false" />
          <div class="commons-clue-feedback" aria-live="polite"></div>
        </div>
        ${data.civicHeadlines && data.civicHeadlines.length > 0 ? `
        <div class="broadsheet-civic">
          <h3>Civic Actions Nearby</h3>
          ${data.civicHeadlines.map(h => `<p class="broadsheet-civic-row">📣 ${h}</p>`).join('')}
        </div>` : ''}
      </div>
    </div>
    <button class="broadsheet-close" type="button">Begin the Day →</button>
  `;
}

// 2026-09-29 launch audit §3.10 — the clue used to be the same word every
// day (a free +5 energy once known). It now rotates through the pool by day.
export interface CommonsClue { answer: string; hint: string }

export const COMMONS_CLUES: readonly CommonsClue[] = [
  { answer: 'solidarity', hint: 'Mutual support between neighbours (10)' },
  { answer: 'commons', hint: 'Resources a community holds and shares (7)' },
  { answer: 'mutualaid', hint: 'Neighbours helping neighbours, no strings attached (6,3)' },
  { answer: 'cooperative', hint: 'A business owned by its workers or members (11)' },
  { answer: 'assembly', hint: 'Where the neighbourhood decides together (8)' },
  { answer: 'tenantunion', hint: 'Renters organising together (6,5)' },
  { answer: 'landtrust', hint: 'Community ____ _____: land held in common, affordable forever (4,5)' },
  { answer: 'fridge', hint: 'Take what you need, leave what you can: the community ______ (6)' },
  { answer: 'resilience', hint: "A district's ability to recover from shocks (10)" },
  { answer: 'library', hint: 'The Tool _______ lends instead of sells (7)' },
  { answer: 'garden', hint: 'A shared plot where neighbours grow food (6)' },
  { answer: 'union', hint: 'Workers organised for a better deal (5)' },
  { answer: 'trust', hint: 'What neighbours build by showing up (5)' },
  { answer: 'solar', hint: 'Power from the rooftops (5)' },
];

export function clueForDay(day: number): CommonsClue {
  const n = COMMONS_CLUES.length;
  return COMMONS_CLUES[(((day - 1) % n) + n) % n]!;
}

/** Case-, space- and punctuation-insensitive: "Mutual Aid" = "mutualaid". */
export function isClueAnswer(clue: CommonsClue, input: string): boolean {
  return input.toLowerCase().replace(/[^a-z]/g, '') === clue.answer;
}
