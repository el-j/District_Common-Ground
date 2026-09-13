// Tactile audio and particle effects for the Living District Builder

export class TactileEffects {
  private static audioCtx: AudioContext | null = null;

  private static getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Play a crisp, wooden construction hammer hit sound using pure procedural Web Audio
   */
  static playHammerHit(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Play an uplifting, chime-like harmonic chord when a construction stage completes
   */
  static playStageCompleteChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Major triad chord: C5, E5, G5, C6
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.46);
    });
  }

  /**
   * Play a sparkling harvest sound when gathering crops/kilowatts/soup
   */
  static playHarvestSparkle(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [659.25, 880.0, 1174.66, 1318.51];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.15, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.26);
    });
  }

  /**
   * Spawn a celebration particle burst on the given container element
   */
  static spawnCelebrationParticles(targetEl: HTMLElement): void {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const particleCount = 24;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'district-celebration-particle';
      const size = 6 + Math.random() * 6;
      const color = colors[Math.floor(Math.random() * colors.length)];

      particle.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-50%, -50%);
        transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease-out;
      `;

      document.body.appendChild(particle);

      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 80;
      const destX = Math.cos(angle) * distance;
      const destY = Math.sin(angle) * distance - 30; // Float upwards

      requestAnimationFrame(() => {
        particle.style.transform = `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(${Math.random() * 0.5 + 0.5}) rotate(${Math.random() * 360}deg)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => {
        if (particle.parentElement) {
          particle.parentElement.removeChild(particle);
        }
      }, 850);
    }
  }
}
