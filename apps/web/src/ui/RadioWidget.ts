import { playRadioStatic } from '../core/audio/SoundSynth';

interface FrequencyProfile {
  label: string;
  name: string;
  audioProfile: string;
}

const FREQUENCIES: FrequencyProfile[] = [
  { label: '88.3', name: 'Radio Free Commons', audioProfile: 'nature_chimes' },
  { label: '94.7', name: 'The Solidarity Hour',  audioProfile: 'warm_ambient' },
  { label: '103.1', name: 'Night Dispatch FM',   audioProfile: 'chiptune' },
];

export class RadioWidget {
  private readonly el: HTMLElement;
  private freqIdx: number = 0;
  private tuning: boolean = false;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'radio-widget';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Radio Free Commons');
    this.el.innerHTML = this.buildHTML();
    this.el.hidden = true;
    root.appendChild(this.el);

    this.el.querySelector('.radio-prev')?.addEventListener('click', () => this.tune(-1));
    this.el.querySelector('.radio-next')?.addEventListener('click', () => this.tune(1));
    this.el.querySelector('.radio-close')?.addEventListener('click', () => this.hide());

    document.addEventListener('keydown', (e) => {
      if (!this.el.hidden && e.key === 'Escape') this.hide();
    });
  }

  show(): void {
    this.el.hidden = false;
    this.update();
  }

  hide(): void {
    this.el.hidden = true;
  }

  private tune(dir: -1 | 1): void {
    this.tuning = true;
    const fraction = (this.freqIdx + 0.5) / FREQUENCIES.length;
    playRadioStatic(fraction);
    setTimeout(() => {
      this.freqIdx = (this.freqIdx + dir + FREQUENCIES.length) % FREQUENCIES.length;
      this.tuning = false;
      this.update();
    }, 300);
  }

  private update(): void {
    const prof = FREQUENCIES[this.freqIdx];
    const led = this.el.querySelector<HTMLElement>('.radio-freq');
    const name = this.el.querySelector<HTMLElement>('.radio-name');
    const needle = this.el.querySelector<HTMLElement>('.radio-needle');
    if (led)    led.textContent = this.tuning ? '-- . --' : `${prof.label} FM`;
    if (name)   name.textContent = this.tuning ? '<<< tuning >>>' : prof.name;
    if (needle) {
      const pct = ((this.freqIdx + 0.5) / FREQUENCIES.length) * 100;
      needle.style.left = `${pct}%`;
    }
  }

  private buildHTML(): string {
    const prof = FREQUENCIES[this.freqIdx];
    return `
      <div class="radio-header">
        <span class="radio-brand">📻 Radio Free Commons</span>
        <button class="radio-close" aria-label="Close radio">✕</button>
      </div>
      <div class="radio-display">
        <div class="radio-freq">${prof.label} FM</div>
        <div class="radio-name">${prof.name}</div>
      </div>
      <div class="radio-dial-track">
        <div class="radio-needle" style="left:33%"></div>
        <div class="radio-dial-marks">
          ${FREQUENCIES.map(f => `<span>${f.label}</span>`).join('')}
        </div>
      </div>
      <div class="radio-controls">
        <button class="radio-prev interactive" aria-label="Previous frequency">◄</button>
        <button class="radio-next interactive" aria-label="Next frequency">►</button>
      </div>
    `;
  }
}
