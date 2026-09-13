export interface BroadsheetData {
  headline: string;
  subheadline: string;
  npcQuote: string;
  npcName: string;
  foodIndex: number;
  energyIndex: number;
  dayNumber: number;
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
        <div class="broadsheet-crossword">
          <h3>Commons Clue (+5 Energy)</h3>
          <p class="crossword-clue">Across: Mutual support between neighbors (9)</p>
          <input class="crossword-input" type="text" maxlength="9" placeholder="_________"
            aria-label="Crossword answer" autocomplete="off" spellcheck="false" />
          <div class="crossword-feedback" aria-live="polite"></div>
        </div>
      </div>
    </div>
    <button class="broadsheet-close" type="button">Begin the Day →</button>
  `;
}
