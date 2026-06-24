// Bright, gentle ambient loop synthesized with the Web Audio API — a soft
// bell/marimba melody over a warm pad (think cozy game-town music, not a
// horror drone). No audio asset; nothing autoplays. Only started on a user
// gesture (the header toggle).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let padNodes: OscillatorNode[] = [];
let stepTimer: ReturnType<typeof setInterval> | null = null;
let running = false;
let step = 0;

const A4 = 440;
const semi = (n: number) => A4 * Math.pow(2, n / 12); // n semitones from A4

// A warm, open Cadd9 pad (C E G D), low and slow.
const PAD = [semi(-21), semi(-17), semi(-14), semi(-19)]; // C3 E3 G3 D3

// A bright C-major-pentatonic phrase for the bell lead (loops).
const MELODY = [
  semi(3), semi(7), semi(10), semi(7),
  semi(3), semi(0), semi(-2), semi(0),
  semi(3), semi(7), semi(12), semi(10),
  semi(7), semi(3), semi(0), semi(3),
]; // around C5 region

const STEP_MS = 460;

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
    warmth.frequency.value = 5200;
    warmth.Q.value = 0.4;
    master.connect(warmth);
    warmth.connect(ctx.destination);
  }

  // Warm pad
  if (padNodes.length === 0) {
    const padGain = ctx.createGain();
    padGain.gain.value = 0.06;
    padGain.connect(master);
    PAD.forEach((f, i) => {
      const osc = ctx!.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      osc.detune.value = (i - 1.5) * 3;
      const g = ctx!.createGain();
      g.gain.value = 0.25;
      osc.connect(g);
      g.connect(padGain);
      osc.start();
      padNodes.push(osc);
    });
  }

  // A little echo for sparkle on the bells.
  const delay = ctx.createDelay();
  delay.delayTime.value = STEP_MS / 1000;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.25;
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(master);

  const playBell = (freq: number, when: number, vel = 1) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
    osc.connect(g);
    g.connect(master!);
    g.connect(delay);
    osc.start(when);
    osc.stop(when + 1.0);
  };

  running = true;
  if (stepTimer) clearInterval(stepTimer);
  stepTimer = setInterval(() => {
    if (!ctx || !running) return;
    const t = ctx.currentTime + 0.02;
    const note = MELODY[step % MELODY.length];
    playBell(note, t, 1);
    // Sparse harmony a third above every 4th step.
    if (step % 4 === 0) playBell(note * Math.pow(2, 4 / 12), t + 0.06, 0.5);
    step++;
  }, STEP_MS);

  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.6, ctx.currentTime, 1.2);
}

export function stopAmbient() {
  running = false;
  if (stepTimer) {
    clearInterval(stepTimer);
    stepTimer = null;
  }
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
  }
}
