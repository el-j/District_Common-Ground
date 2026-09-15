import { playRadioStatic, getRadioAnalyser } from '../core/audio/SoundSynth';

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
  private readonly getHeadlines?: () => string[];
  private freqIdx: number = 0;
  private tuning: boolean = false;
  private waveformCanvas: HTMLCanvasElement | null = null;
  private waveformRAF: number | null = null;

  constructor(root: HTMLElement, getHeadlines?: () => string[]) {
    this.getHeadlines = getHeadlines;
    this.el = document.createElement('div');
    this.el.className = 'radio-widget';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Radio Free Commons');
    this.el.innerHTML = this.buildHTML();
    this.el.hidden = true;
    root.appendChild(this.el);

    this.waveformCanvas = this.el.querySelector<HTMLCanvasElement>('.radio-waveform');

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
    this.updateTicker();
    this.startWaveform();
  }

  hide(): void {
    this.el.hidden = true;
    this.stopWaveform();
  }

  /** M21 §9 — draws a live waveform tapped off SoundSynth's shared AnalyserNode.
   * The widget previously had zero visual audio feedback at all. Silently
   * no-ops (draws a flat line) before the user's first click/keypress
   * unlocks the AudioContext, since `getRadioAnalyser()` returns null then. */
  private startWaveform(): void {
    this.stopWaveform();
    const canvas = this.waveformCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      this.waveformRAF = requestAnimationFrame(draw);
      const width = canvas.clientWidth || 220;
      const height = canvas.clientHeight || 32;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const analyser = getRadioAnalyser();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#66dd88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      if (!analyser) {
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      const step = canvas.width / data.length;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255;
        const y = v * canvas.height;
        if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * step, y);
      }
      ctx.stroke();
    };
    draw();
  }

  private stopWaveform(): void {
    if (this.waveformRAF !== null) {
      cancelAnimationFrame(this.waveformRAF);
      this.waveformRAF = null;
    }
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

  private updateTicker(): void {
    const track = this.el.querySelector<HTMLElement>('.radio-ticker-track');
    const wrap = this.el.querySelector<HTMLElement>('.radio-ticker');
    if (!track || !wrap) return;
    const headlines = this.getHeadlines?.() ?? [];
    if (headlines.length === 0) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    track.textContent = headlines.join('   •   ');
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
      <canvas class="radio-waveform" aria-hidden="true"></canvas>
      <div class="radio-dial-track">
        <div class="radio-needle" style="left:33%"></div>
        <div class="radio-dial-marks">
          ${FREQUENCIES.map(f => `<span>${f.label}</span>`).join('')}
        </div>
      </div>
      <div class="radio-ticker" role="marquee" aria-label="Breaking news ticker" hidden>
        <span class="radio-ticker-track"></span>
      </div>
      <div class="radio-controls">
        <button class="radio-prev interactive" aria-label="Previous frequency">◄</button>
        <button class="radio-next interactive" aria-label="Next frequency">►</button>
      </div>
    `;
  }
}
