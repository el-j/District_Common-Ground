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

  return `
    <div class="broadsheet-masthead">
      <h1 id="broadsheet-title" class="broadsheet-name">The Daily District Ground</h1>
      <div class="broadsheet-dateline">Day ${data.dayNumber} — Your Neighbourhood Matters</div>
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
          <p class="commons-clue-hint">Across: Mutual support between neighbors (9)</p>
          <input class="commons-clue-input" type="text" maxlength="9" placeholder="_________"
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
