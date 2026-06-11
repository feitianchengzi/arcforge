const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const audioRoot = path.join(root, "arckit/showcase-video/audio");
const libraryDir = path.join(audioRoot, "library/music");
const recipeDir = path.join(audioRoot, "library/recipes");
const outputDir = path.join(audioRoot, "output");

const sampleRate = 48000;
const duration = 18.4;
const bpm = 132;
const beat = 60 / bpm;
const total = Math.ceil(duration * sampleRate);
const l = new Float32Array(total);
const r = new Float32Array(total);

fs.mkdirSync(libraryDir, { recursive: true });
fs.mkdirSync(recipeDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const stageStarts = [2.2, 4.333, 6.467, 8.6, 10.733, 12.867, 15.0];
const chordNames = [
  ["A2", "C3", "E3", "G3"],
  ["F2", "A2", "C3", "E3"],
  ["C3", "E3", "G3", "B3"],
  ["G2", "B2", "D3", "F3"]
];
const chords = chordNames.map((names) => names.map(note));
const bass = ["A1", "F1", "C2", "G1"].map(note);
const hook = ["E5", "G5", "A5", "C6", "B5", "G5", "E5", "D5", "E5", "G5", "C6", "B5", "A5", "G5", "E5", "A5"].map(note);

const kickTimes = [];

for (let bar = 0; bar < duration / (beat * 4); bar += 1) {
  const t = bar * beat * 4;
  const c = bar % chords.length;
  addWideChord(t, beat * 4.1, chords[c], bar < 1 ? 0.12 : 0.18);
  addBassLine(t, bass[c], c);
}

for (let i = 0; i < duration / beat; i += 1) {
  const t = i * beat;
  if (t > duration - 0.35) continue;
  if (i % 4 === 0) addKick(t, i < 4 ? 0.46 : 0.66);
  if (i % 4 === 2 && t > 1.5) addClap(t, 0.42);
  if (t > 2.0) addHat(t, 0.12, i % 2 ? -0.32 : 0.32);
  if (t > 5.0) addHat(t + beat * 0.5, 0.075, i % 2 ? 0.28 : -0.28);
}

for (let i = 0; i < duration / (beat * 0.5); i += 1) {
  const t = i * beat * 0.5;
  if (t < 2.15 || t > 16.5) continue;
  const intensity = t < 8.6 ? 0.12 : 0.16;
  addSpark(t, hook[(i + Math.floor(t / 4)) % hook.length], intensity, i % 2 ? -0.38 : 0.38);
}

for (let i = 0; i < duration / beat; i += 1) {
  const t = i * beat + beat * 0.25;
  if (t < 3.0 || t > 15.0 || i % 2 === 0) continue;
  addMutedGuitar(t, hook[(i * 3) % hook.length] * 0.5, 0.095, i % 4 === 1 ? -0.22 : 0.22);
}

for (let i = 0; i < stageStarts.length; i += 1) {
  const t = stageStarts[i];
  addStageLift(t - 0.42, 0.45, 0.16 + i * 0.006);
  addSnapImpact(t, i === 0 || i === stageStarts.length - 1 ? 0.58 : 0.42);
  addHookPing(t + 0.07, hook[(i * 2 + 3) % hook.length], 0.12, i % 2 ? -0.24 : 0.24);
}

for (let t = 0.7; t < 1.9; t += beat * 0.5) {
  addSpark(t, hook[Math.floor(t / (beat * 0.5)) % hook.length] * 0.5, 0.07, 0.18);
}

applySidechain();
fade(0, 0.7, 0, 1);
fade(duration - 1.1, 1.1, 1, 0);
master(0.86);

const wav = encodeWav(l, r, sampleRate);
const libraryPath = path.join(libraryDir, "arcforge-neon-drive-bed.wav");
const outputPath = path.join(outputDir, "arcforge-promo-neon-drive-bed.wav");
fs.writeFileSync(libraryPath, wav);
fs.writeFileSync(outputPath, wav);

const recipe = {
  id: "arcforge-neon-drive-bed",
  title: "ArcForge Neon Drive Bed",
  duration,
  bpm,
  key: "A minor / C major",
  syncPoints: stageStarts,
  structure: [
    { start: 0, label: "logo lift" },
    { start: 2.2, label: "main groove enters on Source" },
    { start: 8.6, label: "brighter hook layer on Profile" },
    { start: 15.0, label: "release outro lock" }
  ],
  layers: ["wide synth chords", "sidechained bass", "punchy drums", "spark hook", "muted rhythmic plucks", "stage lifts"],
  sourceMethod: "Deterministic local JavaScript synthesis, composed as a new cue for the ArcForge animation."
};
fs.writeFileSync(path.join(recipeDir, "arcforge-neon-drive-bed.json"), `${JSON.stringify(recipe, null, 2)}\n`);

const indexPath = path.join(audioRoot, "index.json");
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { assets: [] };
index.assets = index.assets.filter((asset) => asset.id !== "arcforge-neon-drive-bed");
index.assets.push({
  id: "arcforge-neon-drive-bed",
  title: "ArcForge Neon Drive Bed",
  duration,
  bpm,
  key: recipe.key,
  moodTags: ["neon", "melodic", "dynamic", "polished", "electronic"],
  sourceMethod: recipe.sourceMethod,
  paths: {
    library: "arckit/showcase-video/audio/library/music/arcforge-neon-drive-bed.wav",
    currentOutput: "arckit/showcase-video/audio/output/arcforge-promo-neon-drive-bed.wav",
    recipe: "arckit/showcase-video/audio/library/recipes/arcforge-neon-drive-bed.json"
  },
  license: "Project-local original asset generated for ArcForge.",
  reuseRecommendation: "Use when the ArcForge promo needs a melodic, energetic electronic bed that still follows the SKILL.md motion."
});
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

console.log(`Generated ${rel(libraryPath)}`);
console.log(`Generated ${rel(outputPath)}`);

function addBassLine(t, root, variant) {
  const pattern = [0, 0.75, 1.5, 2.25, 3.0, 3.5];
  for (let i = 0; i < pattern.length; i += 1) {
    const f = root * (i === 2 || i === 5 ? 1.5 : i === 4 ? 2 : 1);
    addBass(t + pattern[i] * beat, f, beat * 0.44, 0.24 + variant * 0.012);
  }
}

function addWideChord(t, dur, freqs, gain) {
  for (let voice = 0; voice < freqs.length; voice += 1) {
    addSawPad(t, dur, freqs[voice], gain * 0.22, -0.34 + voice * 0.22, voice);
    addSawPad(t, dur, freqs[voice] * 2, gain * 0.08, 0.34 - voice * 0.18, voice + 7);
  }
}

function addSawPad(t, dur, freq, gain, pan, seed) {
  const start = toSample(t);
  const len = toSample(dur);
  const phases = [0.13 + seed, 1.7 + seed * 0.4, 3.1 + seed * 0.21];
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 0.55) * Math.min(1, (dur - x) / 0.7);
    const shimmer = 0.82 + Math.sin(2 * Math.PI * 0.17 * (t + x) + seed) * 0.18;
    let v = 0;
    for (let j = 0; j < phases.length; j += 1) {
      const detune = 1 + (j - 1) * 0.006;
      v += saw(freq * detune, x, phases[j]) * 0.18;
    }
    put(start + i, v * env * gain * shimmer, pan);
  }
}

function addBass(t, freq, dur, gain) {
  const start = toSample(t);
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 0.025) * Math.exp(-x * 2.35);
    const v = (
      Math.sin(2 * Math.PI * freq * x) * 0.82 +
      saw(freq * 2, x, 0.4) * 0.11
    ) * env * gain;
    put(start + i, soft(v), 0);
  }
}

function addKick(t, gain) {
  kickTimes.push(t);
  const start = toSample(t);
  const len = toSample(0.31);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 12.5);
    const freq = 46 + 82 * Math.exp(-x * 21);
    const thump = Math.sin(2 * Math.PI * freq * x) * env;
    const click = Math.sin(2 * Math.PI * 2100 * x) * Math.exp(-x * 96) * 0.10;
    put(start + i, (thump + click) * gain, 0);
  }
}

function addClap(t, gain) {
  const start = toSample(t);
  for (let k = 0; k < 3; k += 1) {
    const offset = toSample(k * 0.018);
    const len = toSample(0.15);
    for (let i = 0; i < len && start + offset + i < total; i += 1) {
      const x = i / sampleRate;
      const env = Math.exp(-x * 22);
      const noise = (rnd((start + i + k * 991) * 5) * 2 - 1) * env;
      const tone = Math.sin(2 * Math.PI * 860 * x) * env * 0.14;
      put(start + offset + i, (noise * 0.30 + tone) * gain, k === 1 ? -0.05 : 0.05);
    }
  }
}

function addHat(t, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.06);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 62);
    const noise = (rnd((start + i) * 9) * 2 - 1) * env;
    const fizz = Math.sin(2 * Math.PI * 9200 * x) * env * 0.13;
    put(start + i, (noise * 0.26 + fizz) * gain, pan);
  }
}

function addSpark(t, freq, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.31);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 8.6);
    const v = (
      Math.sin(2 * Math.PI * freq * x) * 0.74 +
      Math.sin(2 * Math.PI * freq * 2.01 * x) * 0.22 +
      Math.sin(2 * Math.PI * freq * 3.01 * x) * 0.07
    ) * env * gain;
    put(start + i, v, pan);
  }
}

function addMutedGuitar(t, freq, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.18);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 18);
    const v = (saw(freq, x, 0.2) * 0.28 + Math.sin(2 * Math.PI * freq * 2 * x) * 0.22) * env * gain;
    put(start + i, v, pan);
  }
}

function addStageLift(t, dur, gain) {
  const start = toSample(Math.max(0, t));
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const p = i / Math.max(1, len - 1);
    const x = i / sampleRate;
    const env = Math.sin(Math.PI * p) * gain;
    const v = (
      Math.sin(2 * Math.PI * (480 + p * p * 1220) * x) * 0.24 +
      (rnd((start + i) * 13) * 2 - 1) * 0.11
    ) * env;
    put(start + i, v, p - 0.5);
  }
}

function addSnapImpact(t, gain) {
  const start = toSample(t);
  const len = toSample(0.45);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 7.6);
    const sub = Math.sin(2 * Math.PI * 76 * x) * 0.52;
    const snap = (rnd((start + i) * 31) * 2 - 1) * Math.exp(-x * 44) * 0.19;
    put(start + i, (sub + snap) * env * gain, 0);
  }
}

function addHookPing(t, freq, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.36);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 7.2);
    const v = (Math.sin(2 * Math.PI * freq * x) + Math.sin(2 * Math.PI * freq * 2 * x) * 0.18) * env * gain;
    put(start + i, v, pan);
  }
}

function applySidechain() {
  for (const t of kickTimes.concat(stageStarts)) {
    const start = toSample(t);
    const len = toSample(0.34);
    for (let i = 0; i < len && start + i < total; i += 1) {
      const p = i / Math.max(1, len - 1);
      const duck = 1 - 0.23 * Math.exp(-p * 5);
      l[start + i] *= duck;
      r[start + i] *= duck;
    }
  }
}

function fade(startSeconds, fadeSeconds, from, to) {
  const start = toSample(startSeconds);
  const len = toSample(fadeSeconds);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const p = i / Math.max(1, len - 1);
    const g = from + (to - from) * p;
    l[start + i] *= g;
    r[start + i] *= g;
  }
}

function master(targetPeak) {
  for (let i = 0; i < total; i += 1) {
    l[i] = soft(l[i] * 1.06);
    r[i] = soft(r[i] * 1.06);
  }
  let peak = 0;
  for (let i = 0; i < total; i += 1) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  const g = peak > 0 ? targetPeak / peak : 1;
  for (let i = 0; i < total; i += 1) {
    l[i] *= g;
    r[i] *= g;
  }
}

function put(index, value, pan) {
  const angle = (pan + 1) * Math.PI / 4;
  l[index] += value * Math.cos(angle);
  r[index] += value * Math.sin(angle);
}

function saw(freq, x, phase) {
  const p = (freq * x + phase) % 1;
  return (p * 2 - 1) * 0.65;
}

function soft(v) {
  return Math.tanh(v * 1.35) / 1.35;
}

function encodeWav(left, right, sr) {
  const frames = left.length;
  const bytes = Buffer.alloc(44 + frames * 4);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + frames * 4, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(sr, 24);
  bytes.writeUInt32LE(sr * 4, 28);
  bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i += 1) {
    bytes.writeInt16LE(toInt16(left[i]), 44 + i * 4);
    bytes.writeInt16LE(toInt16(right[i]), 46 + i * 4);
  }
  return bytes;
}

function toInt16(v) {
  return Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
}

function note(name) {
  const match = /^([A-G])([b#]?)(\d)$/.exec(name);
  const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const accidental = match[2] === "b" ? -1 : match[2] === "#" ? 1 : 0;
  const octave = Number(match[3]);
  return 440 * Math.pow(2, (semis[match[1]] + accidental + (octave - 4) * 12) / 12);
}

function toSample(t) {
  return Math.max(0, Math.floor(t * sampleRate));
}

function rnd(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function rel(value) {
  return path.relative(root, value).split(path.sep).join("/");
}
