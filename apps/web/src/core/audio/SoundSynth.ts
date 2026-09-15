let ctx: AudioContext | null = null;
let masterOutput: GainNode | null = null;
let analyserNode: AnalyserNode | null = null;

function getCtx(): AudioContext | null {
  if (!ctx || ctx.state !== 'running') return null;
  return ctx;
}

function initAudio(): void {
  if (ctx) return;
  ctx = new AudioContext();
  // M21 §9 — every sound below routes through this shared bus instead of
  // straight to `ctx.destination`, purely so RadioWidget's waveform canvas
  // has something real to tap with an AnalyserNode. Gain is 1 (no volume
  // change) — it's a pass-through tap, not a mix change.
  masterOutput = ctx.createGain();
  analyserNode = ctx.createAnalyser();
  analyserNode.fftSize = 64;
  masterOutput.connect(analyserNode);
  analyserNode.connect(ctx.destination);
}

function getMasterOutput(): AudioNode {
  return masterOutput ?? (ctx as AudioContext).destination;
}

/** M21 §9 — RadioWidget's waveform canvas taps this to drive its visual; null until first user interaction unlocks audio. */
export function getRadioAnalyser(): AnalyserNode | null {
  return analyserNode;
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
  gain.connect(getMasterOutput());
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
  gain.connect(getMasterOutput());
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
    gain.connect(getMasterOutput());
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

// ── SoundSynth v2 ─────────────────────────────────────────────────────────

let _rainSource: AudioBufferSourceNode | null = null;
let _rainDropletInterval: ReturnType<typeof setInterval> | null = null;

export function playRain(): void {
  const audio = getCtx();
  if (!audio || _rainSource) return;

  const sampleRate = audio.sampleRate;
  const seconds = 2;
  const buf = audio.createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = audio.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, audio.currentTime);
  filter.Q.setValueAtTime(0.8, audio.currentTime);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.15, audio.currentTime);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterOutput());
  src.start();
  _rainSource = src;

  _rainDropletInterval = setInterval(() => {
    const a = getCtx();
    if (!a) return;
    const dropOsc = a.createOscillator();
    const dropGain = a.createGain();
    const freq = 1200 + Math.random() * 2800;
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(freq, a.currentTime);
    dropGain.gain.setValueAtTime(0.08, a.currentTime);
    dropGain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.08);
    dropOsc.connect(dropGain);
    dropGain.connect(getMasterOutput());
    dropOsc.start();
    dropOsc.stop(a.currentTime + 0.08);
  }, 50 + Math.random() * 150);
}

export function stopRain(): void {
  if (_rainSource) {
    try { _rainSource.stop(); } catch { /* already stopped */ }
    _rainSource = null;
  }
  if (_rainDropletInterval !== null) {
    clearInterval(_rainDropletInterval);
    _rainDropletInterval = null;
  }
}

export function playCatPurr(): void {
  const audio = getCtx();
  if (!audio) return;

  // Haptic rhythm for cat purr
  if ('vibrate' in navigator) navigator.vibrate([10, 5, 10, 5, 10]);

  const mainOsc = audio.createOscillator();
  const lfoOsc = audio.createOscillator();
  const lfoGain = audio.createGain();
  const mainGain = audio.createGain();

  mainOsc.type = 'triangle';
  mainOsc.frequency.setValueAtTime(25, audio.currentTime);

  lfoOsc.type = 'sine';
  lfoOsc.frequency.setValueAtTime(7, audio.currentTime);
  lfoGain.gain.setValueAtTime(7, audio.currentTime);

  mainGain.gain.setValueAtTime(0.12, audio.currentTime);

  lfoOsc.connect(lfoGain);
  lfoGain.connect(mainOsc.frequency);
  mainOsc.connect(mainGain);
  mainGain.connect(getMasterOutput());

  const end = audio.currentTime + 3;
  lfoOsc.start();
  mainOsc.start();
  lfoOsc.stop(end);
  mainOsc.stop(end);
}

export function playBikeBell(): void {
  const audio = getCtx();
  if (!audio) return;

  // Haptic feedback on mobile for bike bell
  if ('vibrate' in navigator) navigator.vibrate(50);

  [659, 880].forEach(freq => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    gain.gain.setValueAtTime(0.3, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(getMasterOutput());
    osc.start();
    osc.stop(audio.currentTime + 0.8);
  });
}

export function playRadioStatic(tuningFraction: number): void {
  const audio = getCtx();
  if (!audio) return;

  const sampleRate = audio.sampleRate;
  const duration = 0.3;
  const buf = audio.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = audio.createBufferSource();
  src.buffer = buf;

  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  const centerFreq = 200 + tuningFraction * 2800;
  filter.frequency.setValueAtTime(centerFreq, audio.currentTime);
  filter.Q.setValueAtTime(2.0, audio.currentTime);

  const gainVal = (1 - Math.abs(tuningFraction - 0.5) * 2) * 0.2;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(Math.max(gainVal, 0.001), audio.currentTime);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterOutput());
  src.start();
}

export function playLoFiChord(rootHz: number): void {
  const audio = getCtx();
  if (!audio) return;

  const duration = 2;
  const masterGain = audio.createGain();
  masterGain.gain.setValueAtTime(0.08, audio.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  masterGain.connect(getMasterOutput());

  const oscDefs: Array<[OscillatorType, number, number]> = [
    ['triangle', rootHz, -3],
    ['square',   rootHz * 1.26, 3],
    ['triangle', rootHz * 1.5, -2],
  ];

  for (const [type, freq, detuneCents] of oscDefs) {
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    osc.detune.setValueAtTime(detuneCents, audio.currentTime);
    osc.connect(masterGain);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  // Vinyl crackle
  const crackleBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
  const crackleData = crackleBuf.getChannelData(0);
  for (let i = 0; i < crackleData.length; i++) crackleData[i] = Math.random() * 2 - 1;
  const crackleSrc = audio.createBufferSource();
  crackleSrc.buffer = crackleBuf;
  const crackleGain = audio.createGain();
  crackleGain.gain.setValueAtTime(0.03, audio.currentTime);
  crackleSrc.connect(crackleGain);
  crackleGain.connect(getMasterOutput());
  crackleSrc.start();
}

export function playCrisisStab(): void {
  const audio = getCtx();
  if (!audio) return;

  // Crisis alert haptic
  if ('vibrate' in navigator) navigator.vibrate([30, 20, 30]);

  [220, 221.5].forEach(freq => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(getMasterOutput());
    osc.start();
    osc.stop(audio.currentTime + 0.4);
  });
}

export function playSolidarityChime(): void {
  const audio = getCtx();
  if (!audio) return;

  const notes = [261.6, 329.6, 392, 523.2];
  notes.forEach((freq, i) => {
    const t = audio.currentTime + i * 0.1;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(getMasterOutput());
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

// ── BGM ambient loop ──────────────────────────────────────────────────────
// Am → F → C → G chord progression, 84 BPM, triangle + sine pads.
// Uses lookahead scheduling so each 4-bar loop plays gaplessly.

const BGM_BPM = 84;
const BGM_BEAT_S = 60 / BGM_BPM;
const BGM_BAR_S  = BGM_BEAT_S * 4;
const BGM_LOOP_S = BGM_BAR_S  * 4;   // ~11.4 s per full cycle

// [A2, C3, E3, A3], [F2, C3, F3, A3], [C3, G3, C4, E4], [G2, D3, G3, B3]
const BGM_CHORDS: number[][] = [
  [110.0, 130.8, 164.8, 220.0],
  [87.3,  130.8, 174.6, 220.0],
  [130.8, 196.0, 261.6, 329.6],
  [98.0,  146.8, 196.0, 246.9],
];

let _bgmMaster: GainNode | null = null;
let _bgmRunning = false;
let _bgmMuted    = false;
let _bgmSchedule: ReturnType<typeof setTimeout> | null = null;

function _scheduleChord(audio: AudioContext, master: GainNode, freqs: number[], t: number, dur: number): void {
  freqs.forEach((freq, i) => {
    const osc  = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = i === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, t);
    const vol = i === 0 ? 0.055 : 0.022;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.45);
    gain.gain.setValueAtTime(vol, t + dur - 0.35);
    gain.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  });
}

function _bgmTick(): void {
  const audio = getCtx();
  if (!audio || !_bgmRunning || !_bgmMaster) return;
  const loopStart = audio.currentTime + 0.05;
  BGM_CHORDS.forEach((chord, bar) => {
    _scheduleChord(audio, _bgmMaster!, chord, loopStart + bar * BGM_BAR_S, BGM_BAR_S);
  });
  _bgmSchedule = setTimeout(_bgmTick, (BGM_LOOP_S - 1.2) * 1000);
}

export function startBGMLoop(): void {
  const audio = getCtx();
  if (!audio || _bgmRunning) return;
  _bgmRunning = true;
  _bgmMaster  = audio.createGain();
  _bgmMaster.gain.setValueAtTime(_bgmMuted ? 0 : 1, audio.currentTime);
  _bgmMaster.connect(getMasterOutput());
  _bgmTick();
}

export function stopBGMLoop(): void {
  _bgmRunning = false;
  if (_bgmSchedule !== null) { clearTimeout(_bgmSchedule); _bgmSchedule = null; }
  if (_bgmMaster) {
    const audio = getCtx();
    if (audio) _bgmMaster.gain.linearRampToValueAtTime(0, audio.currentTime + 0.5);
    _bgmMaster = null;
  }
}

export function setBGMMuted(muted: boolean): void {
  _bgmMuted = muted;
  if (_bgmMaster) {
    const audio = getCtx();
    if (audio) _bgmMaster.gain.linearRampToValueAtTime(muted ? 0 : 1, audio.currentTime + 0.25);
  }
}
export function isBGMMuted(): boolean { return _bgmMuted; }
