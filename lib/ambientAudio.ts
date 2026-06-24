// Chill lofi "forest exploration" ambience, synthesized with the Web Audio API
// — a warm Cmaj7 pad, an airy brown-noise bed (wind/leaves), and sparse, soft
// bell notes with a gentle echo. No audio asset; nothing autoplays. Started
// only on a user gesture (the header toggle).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let padNodes: OscillatorNode[] = [];
let noiseSrc: AudioBufferSourceNode | null = null;
let delay: DelayNode | null = null;
let stepTimer: ReturnType<typeof setInterval> | null = null;
let running = false;
let step = 0;

const A4 = 440;
const semi = (n: number) => A4 * Math.pow(2, n / 12); // n semitones from A4

// Warm, mellow Cmaj7 pad (C E G B), low and slow.
const PAD = [semi(-21), semi(-17), semi(-14), semi(-10)]; // C3 E3 G3 B3

// Sparse C-major-pentatonic phrase; some steps rest (null) for an open feel.
const MELODY: (number | null)[] = [
  semi(0), null, semi(3), null,
  semi(7), null, semi(5), semi(3),
  null, semi(0), semi(-2), null,
  semi(3), null, null, semi(7),
];
const STEP_MS = 900; // slow, unhurried

export function isAmbientPlaying() {
  return running;
}

export async function startAmbient() {
  if (typeof window === "undefined") return;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") await ctx.resume();

  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0;
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 3200; // soft, lofi top end
    warmth.Q.value = 0.3;
    master.connect(warmth);
    warmth.connect(ctx.destination);
  }

  // Airy brown-noise bed (wind through trees), very quiet.
  if (!noiseSrc) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "lowpass";
    nFilter.frequency.value = 700;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.05;
    noiseSrc.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(master);
    noiseSrc.start();
  }

  // Warm pad
  if (padNodes.length === 0) {
    const padGain = ctx.createGain();
    padGain.gain.value = 0.05;
    padGain.connect(master);
    PAD.forEach((f, i) => {
      const osc = ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.detune.value = (i - 1.5) * 2.5;
      const g = ctx!.createGain();
      g.gain.value = 0.25;
      osc.connect(g);
      g.connect(padGain);
      osc.start();
      padNodes.push(osc);
    });
  }

  // Soft echo for the bells.
  if (!delay) {
    delay = ctx.createDelay();
    delay.delayTime.value = (STEP_MS * 1.5) / 1000;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(master);
  }

  const playBell = (freq: number, when: number, vel = 1) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.12 * vel, when + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.7);
    osc.connect(g);
    g.connect(master!);
    if (delay) g.connect(delay);
    osc.start(when);
    osc.stop(when + 1.8);
  };

  running = true;
  if (stepTimer) clearInterval(stepTimer);
  stepTimer = setInterval(() => {
    if (!ctx || !running) return;
    const note = MELODY[step % MELODY.length];
    step++;
    if (note == null) return; // rest
    const t = ctx.currentTime + 0.02;
    // Occasional octave lift makes it feel "explorative".
    const oct = Math.random() < 0.18 ? 2 : 1;
    playBell(note * oct, t, 0.9);
  }, STEP_MS);

  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.62, ctx.currentTime, 1.6);
}

export function stopAmbient() {
  running = false;
  if (stepTimer) {
    clearInterval(stepTimer);
    stepTimer = null;
  }
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.7);
  }
}
