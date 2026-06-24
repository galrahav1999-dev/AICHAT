// Tasteful ambient pad synthesized with the Web Audio API — no audio asset,
// nothing autoplays. Only started in response to a user gesture (the toggle).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode }[] = [];

// A gentle, slightly detuned minor-ish chord (D, A, F, C) in low octaves.
const VOICES = [73.42, 110.0, 174.61, 130.81];

export function isAmbientPlaying() {
  return ctx !== null && ctx.state === "running" && nodes.length > 0;
}

export async function startAmbient() {
  if (typeof window === "undefined") return;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") await ctx.resume();

  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    master.connect(filter);
    filter.connect(ctx.destination);
  }

  if (nodes.length === 0) {
    const now = ctx.currentTime;
    VOICES.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 4; // subtle chorus

      const gain = ctx!.createGain();
      gain.gain.value = 0.0;

      // Slow tremolo per voice for movement.
      const lfo = ctx!.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.017;
      const lfoGain = ctx!.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(master!);
      osc.start(now);
      lfo.start(now);
      gain.gain.setTargetAtTime(0.08, now, 2.5);
      nodes.push({ osc, gain, lfo, lfoGain });
    });
  }

  // Fade master in.
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);
}

export function stopAmbient() {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
}
