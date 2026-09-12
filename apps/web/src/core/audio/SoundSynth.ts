let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!ctx || ctx.state !== 'running') return null;
  return ctx;
}

function initAudio(): void {
  if (ctx) return;
  ctx = new AudioContext();
}

export function setupAudioOnInteraction(): void {
  const unlock = () => {
    initAudio();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('touchstart', unlock);
  window.addEventListener('keydown', unlock);
}

export function playFootstep(): void {
  const audio = getCtx();
  if (!audio) return;
  const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.05), audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = audio.createBufferSource();
  src.buffer = buf;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.08, audio.currentTime);
  src.connect(gain);
  gain.connect(audio.destination);
  src.start();
}

export function playUIClick(): void {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audio.currentTime);
  gain.gain.setValueAtTime(0.15, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.1);
}

export function playDayChime(): void {
  const audio = getCtx();
  if (!audio) return;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const t = audio.currentTime + i * 0.12;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// ── Skin audio profile hooks ───────────────────────────────────────────────
// Stored for future skin-driven synthesis modes; no runtime effect yet.
let _sfxProfile = 'nature_chimes';
let _bgmProfile = 'warm_ambient';

export function setSfxProfile(profile: string): void { _sfxProfile = profile; }
export function setBgmProfile(profile: string): void { _bgmProfile = profile; }
export function getSfxProfile(): string { return _sfxProfile; }
export function getBgmProfile(): string { return _bgmProfile; }
