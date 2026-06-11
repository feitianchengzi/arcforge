const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const audioRoot = path.join(root, "arckit/showcase-video/audio");
const libraryDir = path.join(audioRoot, "library/music");
const recipeDir = path.join(audioRoot, "library/recipes");
const outputDir = path.join(audioRoot, "output");

const sampleRate = 48000;
const duration = 18.4;
const bpm = 116;
const beat = 60 / bpm;
const total = Math.ceil(duration * sampleRate);
const left = new Float32Array(total);
const right = new Float32Array(total);

fs.mkdirSync(libraryDir, { recursive: true });
fs.mkdirSync(recipeDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const stageStarts = [2.2, 4.333, 6.467, 8.6, 10.733, 12.867, 15.0];
const progression = [
  ["E2", "G2", "B2", "D3"],
  ["C2", "E2", "G2", "B2"],
  ["G2", "B2", "D3", "F3"],
  ["D2", "F2", "A2", "C3"]
].map((chord) => chord.map(note));
const roots = ["E1", "C2", "G1", "D2"].map(note);
const hook = ["B4", "D5", "E5", "G5", "E5", "D5"].map(note);
const kicks = [];

for (let bar = 0; bar < duration / (beat * 4); bar += 1) {
  const t = bar * beat * 4;
  const c = bar % progression.length;
  addPad(t, beat * 4.25, progression[c], bar < 1 ? 0.10 : 0.145);
  addBassPattern(t, roots[c]);
}

for (let i = 0; i < duration / beat; i += 1) {
  const t = i * beat;
  if (t > duration - 0.45) continue;
  addKick(t, t < 1.5 ? 0.34 : 0.52);
  if (i % 4 === 2 && t > 2.0) addSoftSnare(t, 0.26);
  if (t > 2.2) addClosedHat(t, i % 2 === 0 ? 0.070 : 0.045, i % 2 ? -0.22 : 0.22);
}

for (let i = 0; i < duration / (beat * 0.5); i += 1) {
  const t = i * beat * 0.5;
  if (t < 5.0 || t > 15.6 || i % 4 !== 0) continue;
  addCleanPluck(t, hook[(i / 4) % hook.length], 0.070, i % 8 === 0 ? -0.18 : 0.18);
}

for (let i = 0; i < stageStarts.length; i += 1) {
  const t = stageStarts[i];
  addSubMark(t, i === 0 || i === stageStarts.length - 1 ? 0.38 : 0.28);
  if (i > 0 && i < stageStarts.length - 1) addTinyLift(t - 0.28, 0.30, 0.040);
}

applyDucking();
fade(0, 0.8, 0, 1);
fade(duration - 1.1, 1.1, 1, 0);
normalize(0.84);

const wav = encodeWav(left, right, sampleRate);
const libraryPath = path.join(libraryDir, "arcforge-clean-drive-bed.wav");
const outputPath = path.join(outputDir, "arcforge-promo-clean-drive-bed.wav");
fs.writeFileSync(libraryPath, wav);
fs.writeFileSync(outputPath, wav);

const recipe = {
  id: "arcforge-clean-drive-bed",
  title: "ArcForge Clean Drive Bed",
  duration,
  bpm,
  key: "E minor / G major",
  syncPoints: stageStarts,
  structure: [
    { start: 0, label: "quiet intro pulse" },
    { start: 2.2, label: "clean main groove" },
    { start: 8.6, label: "subtle melodic lift" },
    { start: 15.0, label: "resolved outro" }
  ],
  layers: ["warm pad", "simple bass", "four-on-floor kick", "soft snare", "light hats", "minimal pluck", "subtle stage marks"],
  sourceMethod: "Deterministic local JavaScript synthesis, composed as a cleaner less busy cue for the ArcForge animation."
};
fs.writeFileSync(path.join(recipeDir, "arcforge-clean-drive-bed.json"), `${JSON.stringify(recipe, null, 2)}\n`);

const indexPath = path.join(audioRoot, "index.json");
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { assets: [] };
index.assets = index.assets.filter((asset) => asset.id !== "arcforge-clean-drive-bed");
index.assets.push({
  id: "arcforge-clean-drive-bed",
  title: "ArcForge Clean Drive Bed",
  duration,
  bpm,
  key: recipe.key,
  moodTags: ["clean", "focused", "dynamic", "minimal", "polished"],
  sourceMethod: recipe.sourceMethod,
  paths: {
    library: "arckit/showcase-video/audio/library/music/arcforge-clean-drive-bed.wav",
    currentOutput: "arckit/showcase-video/audio/output/arcforge-promo-clean-drive-bed.wav",
    recipe: "arckit/showcase-video/audio/library/recipes/arcforge-clean-drive-bed.json"
  },
  license: "Project-local original asset generated for ArcForge.",
  reuseRecommendation: "Use when the ArcForge promo needs movement without busy melodic or percussive clutter."
});
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

console.log(`Generated ${rel(libraryPath)}`);
console.log(`Generated ${rel(outputPath)}`);

function addPad(t, dur, freqs, gain) {
  const start = toSample(t);
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 0.95) * Math.min(1, (dur - x) / 0.95);
    let value = 0;
    for (let n = 0; n < freqs.length; n += 1) {
      value += Math.sin(2 * Math.PI * freqs[n] * (1 + (n - 1.5) * 0.0015) * x) * 0.15;
      value += Math.sin(2 * Math.PI * freqs[n] * 2.005 * x) * 0.022;
    }
    mix(start + i, value * env * gain, nudgePan(i, 0.08));
  }
}

function addBassPattern(t, root) {
  const pattern = [0, 1.0, 2.0, 2.75, 3.25];
  for (let i = 0; i < pattern.length; i += 1) {
    const freq = root * (i === 3 ? 1.5 : i === 4 ? 1.25 : 1);
    addBass(t + pattern[i] * beat, freq, beat * 0.52, 0.22);
  }
}

function addBass(t, freq, dur, gain) {
  const start = toSample(t);
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 0.035) * Math.exp(-x * 2.0);
    const value = (
      Math.sin(2 * Math.PI * freq * x) * 0.82 +
      Math.sin(2 * Math.PI * freq * 2 * x) * 0.16
    ) * env * gain;
    mix(start + i, value, 0);
  }
}

function addKick(t, gain) {
  kicks.push(t);
  const start = toSample(t);
  const len = toSample(0.30);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 12);
    const freq = 42 + 56 * Math.exp(-x * 18);
    const click = Math.sin(2 * Math.PI * 1450 * x) * Math.exp(-x * 90) * 0.055;
    mix(start + i, (Math.sin(2 * Math.PI * freq * x) * env + click) * gain, 0);
  }
}

function addSoftSnare(t, gain) {
  const start = toSample(t);
  const len = toSample(0.20);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 18);
    const noise = (rand((start + i) * 5) * 2 - 1) * env * 0.20;
    const body = Math.sin(2 * Math.PI * 195 * x) * Math.exp(-x * 16) * 0.18;
    mix(start + i, (noise + body) * gain, 0.04);
  }
}

function addClosedHat(t, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.052);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 58);
    const noise = (rand((start + i) * 11) * 2 - 1) * env;
    mix(start + i, noise * gain * 0.20, pan);
  }
}

function addCleanPluck(t, freq, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.34);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 7.8);
    const value = (
      Math.sin(2 * Math.PI * freq * x) * 0.78 +
      Math.sin(2 * Math.PI * freq * 2.01 * x) * 0.18
    ) * env * gain;
    mix(start + i, value, pan);
  }
}

function addSubMark(t, gain) {
  const start = toSample(t);
  const len = toSample(0.34);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 7.0);
    const snap = (rand((start + i) * 17) * 2 - 1) * Math.exp(-x * 42) * 0.055;
    mix(start + i, (Math.sin(2 * Math.PI * 72 * x) * 0.55 + snap) * env * gain, 0);
  }
}

function addTinyLift(t, dur, gain) {
  const start = toSample(Math.max(0, t));
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const p = i / Math.max(1, len - 1);
    const x = i / sampleRate;
    const env = Math.sin(Math.PI * p) * gain;
    const tone = Math.sin(2 * Math.PI * (440 + p * 620) * x) * 0.18;
    const noise = (rand((start + i) * 13) * 2 - 1) * 0.050;
    mix(start + i, (tone + noise) * env, p - 0.5);
  }
}

function applyDucking() {
  for (const t of kicks) {
    const start = toSample(t);
    const len = toSample(0.26);
    for (let i = 0; i < len && start + i < total; i += 1) {
      const p = i / Math.max(1, len - 1);
      const duck = 1 - 0.13 * Math.exp(-p * 4.5);
      left[start + i] *= duck;
      right[start + i] *= duck;
    }
  }
}

function fade(startSeconds, fadeSeconds, from, to) {
  const start = toSample(startSeconds);
  const len = toSample(fadeSeconds);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const p = i / Math.max(1, len - 1);
    const g = from + (to - from) * p;
    left[start + i] *= g;
    right[start + i] *= g;
  }
}

function normalize(targetPeak) {
  for (let i = 0; i < total; i += 1) {
    left[i] = soft(left[i] * 1.04);
    right[i] = soft(right[i] * 1.04);
  }
  let peak = 0;
  for (let i = 0; i < total; i += 1) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = peak > 0 ? targetPeak / peak : 1;
  for (let i = 0; i < total; i += 1) {
    left[i] *= gain;
    right[i] *= gain;
  }
}

function mix(index, value, pan) {
  const angle = (pan + 1) * Math.PI / 4;
  left[index] += value * Math.cos(angle);
  right[index] += value * Math.sin(angle);
}

function nudgePan(i, amount) {
  return Math.sin(i / sampleRate * 0.35) * amount;
}

function soft(v) {
  return Math.tanh(v * 1.25) / 1.25;
}

function encodeWav(a, b, sr) {
  const frames = a.length;
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
    bytes.writeInt16LE(toInt16(a[i]), 44 + i * 4);
    bytes.writeInt16LE(toInt16(b[i]), 46 + i * 4);
  }
  return bytes;
}

function toInt16(value) {
  return Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
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

function rand(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function rel(value) {
  return path.relative(root, value).split(path.sep).join("/");
}
