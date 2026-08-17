// Sound design for the 13s OpenTask spot, synthesised as 48kHz stereo PCM.
//
// The brief requires "intentional music, voiceover, or sound design" AND that the message
// still works muted. So the audio is scored to the picture's existing beats rather than laid
// under it as a bed: every cue lands on a cut that is already there.
//
//   0.00-2.60  low pulse, ~1.9Hz. Sparse and a little empty — this is the "I have $0" beat.
//   2.75-6.60  ticks as feed cards pass, spaced by the SAME easeInOut the scroll uses, so the
//              clicks decelerate exactly as the list settles. This is the part that sells it.
//   6.90       the find: a bright two-note chime on the funded card.
//   9.70-10.70 a rising tone tracking the delivery progress bar.
//   10.60      the payment: brighter, resolved.
//   11.50-13.0 a warm chord that resolves to the SAME root the pulse started on, so a loop
//              back to frame zero is seamless — the brief asks for replayability.
//
// Written by an autonomous AI agent (Claude Code). MIT.

import { writeFileSync } from "node:fs";

const SR = 48000, SECS = 13, CH = 2;
const N = SR * SECS;
const L = new Float32Array(N), R = new Float32Array(N);

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// One voice: sine with a fast attack and exponential decay, panned.
function ping(at, freq, dur, amp, pan = 0.5, harm = 0.35) {
  const s = Math.floor(at * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) {
    const idx = s + i;
    if (idx < 0 || idx >= N) continue;
    const t = i / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / (dur * 0.32));
    const v = (Math.sin(2 * Math.PI * freq * t) + harm * Math.sin(4 * Math.PI * freq * t)) * env * amp;
    L[idx] += v * (1 - pan);
    R[idx] += v * pan;
  }
}

// Low sine pulse — felt more than heard.
function pulse(at, freq, dur, amp) {
  const s = Math.floor(at * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) {
    const idx = s + i; if (idx < 0 || idx >= N) continue;
    const t = i / SR;
    const env = Math.sin(Math.PI * clamp(t / dur)) ** 2;
    const v = Math.sin(2 * Math.PI * freq * t) * env * amp;
    L[idx] += v * 0.5; R[idx] += v * 0.5;
  }
}

// Sweep used for the delivery bar.
function sweep(at, f0, f1, dur, amp) {
  const s = Math.floor(at * SR), n = Math.floor(dur * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = s + i; if (idx < 0 || idx >= N) continue;
    const t = i / SR, k = t / dur;
    const f = f0 + (f1 - f0) * easeInOut(k);
    phase += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.08) * Math.min(1, (dur - t) / 0.15);
    const v = (Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.15) * env * amp;
    L[idx] += v * 0.5; R[idx] += v * 0.5;
  }
}

const ROOT = 110;                                   // A2 — the note the piece opens and closes on

// 1. The empty beat. Slow pulse, slightly irregular so it reads as waiting, not as a metronome.
for (let k = 0; k < 5; k++) pulse(0.05 + k * 0.52, ROOT, 0.34, 0.20);

// 2. The scroll. Card ticks follow the picture's easeInOut from 3.0 to 6.6, so they slow to a
//    stop with the list instead of running underneath it at a constant rate.
const SCROLL_A = 3.0, SCROLL_B = 6.6;
for (let k = 0; k <= 22; k++) {
  const t = easeInOut(k / 22);
  const at = SCROLL_A + t * (SCROLL_B - SCROLL_A);
  const near = k / 22;
  ping(at, 900 + 260 * near, 0.075, 0.055 + 0.05 * near, k % 2 ? 0.62 : 0.38, 0.2);
}

// 3. The find, on the label at 6.9. Perfect fifth — the only consonant interval in the piece
//    so far, which is what makes it read as "this one is different".
ping(6.90, 587.33, 0.55, 0.30, 0.5);            // D5
ping(6.98, 880.00, 0.75, 0.24, 0.5);            // A5
pulse(6.90, ROOT, 0.7, 0.16);

// 4. Delivery: the bar fills 9.7 -> 10.7, and the tone rises with it.
sweep(9.70, 220, 660, 1.00, 0.16);

// 5. Paid. Brighter and resolved; this is the payoff the whole spot is built around.
ping(10.62, 880.00, 0.85, 0.30, 0.5);
ping(10.70, 1174.66, 0.70, 0.20, 0.5);          // D6
pulse(10.62, ROOT * 2, 0.6, 0.18);

// 6. The close, 11.5 -> 13.0. Resolves to the root so frame 390 leads back into frame 0.
ping(11.52, 440.00, 1.30, 0.20, 0.42);
ping(11.60, 659.25, 1.20, 0.14, 0.58);          // E5
pulse(11.52, ROOT, 1.35, 0.20);
pulse(12.55, ROOT, 0.45, 0.14);                 // the handoff back to the opening pulse

// Soft-clip, then a short fade at each end so the loop point has no click.
const FADE = Math.floor(0.03 * SR);
for (let i = 0; i < N; i++) {
  let l = Math.tanh(L[i] * 1.6), r = Math.tanh(R[i] * 1.6);
  if (i < FADE) { const g = i / FADE; l *= g; r *= g; }
  if (i > N - FADE) { const g = (N - i) / FADE; l *= g; r *= g; }
  L[i] = l; R[i] = r;
}

// 16-bit PCM WAV
const data = Buffer.alloc(N * CH * 2);
let peak = 0;
for (let i = 0; i < N; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const norm = peak > 0 ? 0.89 / peak : 1;
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(clamp(L[i] * norm, -1, 1) * 32767), i * 4);
  data.writeInt16LE(Math.round(clamp(R[i] * norm, -1, 1) * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
hdr.writeUInt16LE(CH, 22); hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * CH * 2, 28); hdr.writeUInt16LE(CH * 2, 32); hdr.writeUInt16LE(16, 34);
hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);
writeFileSync("./audio.wav", Buffer.concat([hdr, data]));
console.log(`wrote audio.wav — ${SECS}s, ${SR}Hz stereo, peak before normalise ${peak.toFixed(3)}`);
