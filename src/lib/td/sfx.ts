/** Lightweight procedural SFX — no asset files needed */

export type SfxName =
  | "build"
  | "shoot"
  | "shoot_star"
  | "hit"
  | "enemy_die"
  | "leak"
  | "wave_start"
  | "wave_clear"
  | "ui"
  | "victory"
  | "defeat";

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setTdMuted(m: boolean) {
  muted = m;
}

export function isTdMuted() {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.08,
  when = 0,
) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, gain = 0.06) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800;
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

const PLAYERS: Record<SfxName, () => void> = {
  build: () => {
    tone(520, 0.08, "triangle", 0.07);
    tone(780, 0.06, "sine", 0.05, 0.04);
  },
  shoot: () => tone(920, 0.04, "square", 0.035),
  shoot_star: () => {
    tone(660, 0.05, "sine", 0.05);
    tone(990, 0.07, "triangle", 0.04, 0.03);
  },
  hit: () => noise(0.06, 0.05),
  enemy_die: () => {
    tone(280, 0.12, "sawtooth", 0.04);
    noise(0.08, 0.03);
  },
  leak: () => {
    tone(180, 0.25, "sawtooth", 0.07);
    tone(140, 0.3, "triangle", 0.05, 0.05);
  },
  wave_start: () => {
    tone(440, 0.1, "triangle", 0.06);
    tone(554, 0.1, "triangle", 0.06, 0.1);
    tone(659, 0.15, "triangle", 0.07, 0.2);
  },
  wave_clear: () => {
    tone(523, 0.12, "sine", 0.06);
    tone(659, 0.12, "sine", 0.06, 0.1);
    tone(784, 0.2, "sine", 0.07, 0.2);
  },
  ui: () => tone(600, 0.03, "sine", 0.04),
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.06, i * 0.12));
  },
  defeat: () => {
    tone(220, 0.35, "sawtooth", 0.06);
    tone(165, 0.4, "triangle", 0.05, 0.15);
  },
};

export function playTdSfx(name: SfxName) {
  try {
    PLAYERS[name]?.();
  } catch {
    /* ignore */
  }
}

export function unlockTdAudio() {
  const c = ac();
  if (c?.state === "suspended") void c.resume();
}
