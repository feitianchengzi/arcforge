const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const audioRoot = path.join(root, "arckit/showcase-video/audio");
const libraryDir = path.join(audioRoot, "library/music");
const recipeDir = path.join(audioRoot, "library/recipes");
const outputDir = path.join(audioRoot, "output");
const sampleRate = 48000;
const duration = 18.4;
const bpm = 104;
const beat = 60 / bpm;
const total = Math.ceil(duration * sampleRate);
const left = new Float32Array(total);
const right = new Float32Array(total);

fs.mkdirSync(libraryDir, { recursive: true });
fs.mkdirSync(recipeDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const chords = [
  chord("F2", "A2", "C3", "E3"),
  chord("C3", "E3", "G3", "B3"),
  chord("D3", "F3", "A3", "C4"),
  chord("Bb2", "D3", "F3", "A3")
];
const roots = ["F1", "C2", "D2", "Bb1"].map(note);
const motif = ["A4", "C5", "E5", "G5", "E5", "C5", "D5", "A4"].map(note);

for (let bar = 0; bar < duration / (beat * 4); bar += 1) {
  const t = bar * beat * 4;
  const c = bar % chords.length;
  addWarmPad(t, beat * 4.4, chords[c], 0.16, c % 2 ? -0.14 : 0.14);
  addSoftBass(t, roots[c], beat * 3.55, 0.20);
}

for (let i = 0; i < duration / beat; i += 1) {
  const t = i * beat;
  if (i % 4 === 0 && t > 1.0 && t < duration - 1.5) addSoftKick(t, 0.34);
  if (i % 4 === 2 && t > 4.0 && t < duration - 2.0) addSoftClick(t, 0.16);
  addPulse(t, i % 2 === 0 ? 0.10 : 0.06, i % 4 === 0 ? -0.18 : 0.18);
}

for (let i = 0; i < duration / (beat * 0.5); i += 1) {
  const t = i * beat * 0.5;
  if (t < 3.4 || t > 16.2 || i % 3 === 1) continue;
  addGlass(t, motif[(i + Math.floor(t / 5)) % motif.length], 0.075, i % 2 ? -0.24 : 0.24);
}

for (const t of [2.2, 5.0, 7.8, 10.6, 13.4, 15.8]) {
  addTransitionBreath(t - 0.45, 0.7, 0.075);
}

fade(0, 1.1, 0, 1);
fade(duration - 1.3, 1.3, 1, 0);
normalize(0.82);

const wav = encodeWav(left, right, sampleRate);
const libraryPath = path.join(libraryDir, "arcforge-signal-bed.wav");
const outputPath = path.join(outputDir, "arcforge-promo-signal-bed.wav");
fs.writeFileSync(libraryPath, wav);
fs.writeFileSync(outputPath, wav);

const recipe = {
  id: "arcforge-signal-bed",
  title: "ArcForge Signal Bed",
  duration,
  bpm,
  key: "F major / D minor",
  structure: [
    { start: 0, label: "soft intro" },
    { start: 3, label: "main governance pulse" },
    { start: 10, label: "subtle lift" },
    { start: 16, label: "clean outro" }
  ],
  layers: ["warm pad", "soft bass", "muted kick", "light pulse", "glass motif", "transition breaths"],
  sourceMethod: "Deterministic local JavaScript synthesis, no external samples or services."
};
fs.writeFileSync(path.join(recipeDir, "arcforge-signal-bed.json"), `${JSON.stringify(recipe, null, 2)}\n`);

const indexPath = path.join(audioRoot, "index.json");
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { assets: [] };
index.assets = index.assets.filter((asset) => asset.id !== "arcforge-signal-bed");
index.assets.push({
  id: "arcforge-signal-bed",
  title: "ArcForge Signal Bed",
  duration,
  bpm,
  key: recipe.key,
  moodTags: ["calm", "technical", "focused", "polished", "restrained"],
  sourceMethod: recipe.sourceMethod,
  paths: {
    library: "arckit/showcase-video/audio/library/music/arcforge-signal-bed.wav",
    currentOutput: "arckit/showcase-video/audio/output/arcforge-promo-signal-bed.wav",
    recipe: "arckit/showcase-video/audio/library/recipes/arcforge-signal-bed.json"
  },
  license: "Project-local original asset generated for ArcForge.",
  reuseRecommendation: "Use as a calmer background bed for ArcForge promo videos when the visual motion should stay primary."
});
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

console.log(`Generated ${rel(libraryPath)}`);
console.log(`Generated ${rel(outputPath)}`);

function addWarmPad(t, dur, freqs, gain, pan) {
  const start = toSample(t);
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 1.2) * Math.min(1, (dur - x) / 1.0);
    let v = 0;
    for (let n = 0; n < freqs.length; n += 1) {
      v += Math.sin(2 * Math.PI * freqs[n] * (1 + n * 0.0015) * x) * 0.17;
      v += Math.sin(2 * Math.PI * freqs[n] * 2.005 * x) * 0.025;
    }
    mix(start + i, v * env * gain, pan);
  }
}

function addSoftBass(t, freq, dur, gain) {
  const start = toSample(t);
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 0.08) * Math.min(1, (dur - x) / 0.6);
    const v = (Math.sin(2 * Math.PI * freq * x) + Math.sin(2 * Math.PI * freq * 2 * x) * 0.18) * env * gain;
    mix(start + i, v, 0);
  }
}

function addSoftKick(t, gain) {
  const start = toSample(t);
  const len = toSample(0.34);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 11);
    const freq = 38 + 38 * Math.exp(-x * 18);
    mix(start + i, Math.sin(2 * Math.PI * freq * x) * env * gain, 0);
  }
}

function addSoftClick(t, gain) {
  const start = toSample(t);
  const len = toSample(0.16);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 30);
    const noise = (rand(start + i) * 2 - 1) * 0.16;
    const tone = Math.sin(2 * Math.PI * 920 * x) * 0.18;
    mix(start + i, (noise + tone) * env * gain, 0.05);
  }
}

function addPulse(t, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.11);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 22);
    const v = Math.sin(2 * Math.PI * 1240 * x) * env * gain;
    mix(start + i, v, pan);
  }
}

function addGlass(t, freq, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.56);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 5.5);
    const v = (
      Math.sin(2 * Math.PI * freq * x) +
      Math.sin(2 * Math.PI * freq * 2.01 * x) * 0.32
    ) * env * gain;
    mix(start + i, v, pan);
  }
}

function addTransitionBreath(t, dur, gain) {
  const start = toSample(Math.max(0, t));
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / Math.max(1, len - 1);
    const env = Math.sin(Math.PI * x) * gain;
    const noise = (rand((start + i) * 11) * 2 - 1) * 0.10;
    const tone = Math.sin(2 * Math.PI * (520 + x * 480) * (i / sampleRate)) * 0.10;
    mix(start + i, (noise + tone) * env, x - 0.5);
  }
}

function fade(startSeconds, fadeSeconds, from, to) {
  const start = toSample(startSeconds);
  const len = toSample(fadeSeconds);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / Math.max(1, len - 1);
    const g = from + (to - from) * x;
    left[start + i] *= g;
    right[start + i] *= g;
  }
}

function normalize(targetPeak) {
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

function encodeWav(l, r, sr) {
  const frames = l.length;
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
    bytes.writeInt16LE(toInt16(l[i]), 44 + i * 4);
    bytes.writeInt16LE(toInt16(r[i]), 46 + i * 4);
  }
  return bytes;
}

function toInt16(value) {
  return Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
}

function chord(...names) { return names.map(note); }
function note(name) {
  const match = /^([A-G])([b#]?)(\d)$/.exec(name);
  const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const accidental = match[2] === "b" ? -1 : match[2] === "#" ? 1 : 0;
  const octave = Number(match[3]);
  return 440 * Math.pow(2, (semis[match[1]] + accidental + (octave - 4) * 12) / 12);
}

function toSample(t) { return Math.max(0, Math.floor(t * sampleRate)); }
function rand(seed) {
  let x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function rel(value) {
  return path.relative(root, value).split(path.sep).join("/");
}
