const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const audioRoot = path.join(root, "arckit/showcase-video/audio");
const libraryDir = path.join(audioRoot, "library/music");
const recipeDir = path.join(audioRoot, "library/recipes");
const outputDir = path.join(audioRoot, "output");
const workDir = path.join(audioRoot, "work");
const sampleRate = 48000;
const duration = 37.2;
const bpm = 118;
const beat = 60 / bpm;
const total = Math.ceil(duration * sampleRate);
const left = new Float32Array(total);
const right = new Float32Array(total);

fs.mkdirSync(libraryDir, { recursive: true });
fs.mkdirSync(recipeDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(workDir, { recursive: true });

const progression = [
  chord("D3", "F3", "A3", "C4"),
  chord("Bb2", "D3", "F3", "A3"),
  chord("F2", "A2", "C3", "E3"),
  chord("C3", "E3", "G3", "Bb3")
];
const bassRoots = ["D2", "Bb1", "F2", "C2"].map(note);
const melody = ["D4", "F4", "A4", "C5", "A4", "F4", "E4", "G4", "A4", "C5", "D5", "A4"].map(note);

for (let bar = 0; bar < duration / (beat * 4); bar += 1) {
  const barStart = bar * beat * 4;
  const chordIndex = bar % progression.length;
  addPad(barStart, beat * 4.15, progression[chordIndex], 0.15, bar % 2 ? -0.16 : 0.16);
  addBassPhrase(barStart, bassRoots[chordIndex], chordIndex);
}

for (let i = 0; i < duration / beat; i += 1) {
  const t = i * beat;
  if (i % 4 === 0 || i % 8 === 6) addKick(t, i > 8 ? 0.9 : 0.7);
  if (i % 4 === 2) addSnare(t, 0.52);
  addHat(t, i % 2 === 0 ? 0.19 : 0.12);
  if (i % 2 === 1 && t > 6) addHat(t + beat * 0.5, 0.08);
}

for (let i = 0; i < duration / (beat * 0.5); i += 1) {
  const t = i * beat * 0.5;
  if (t < 7.0 || t > 34.2) continue;
  const freq = melody[(i + Math.floor(t / 8)) % melody.length];
  addPluck(t, freq, 0.18, i % 4 === 0 ? -0.28 : 0.28);
}

for (const transition of [5.9, 11.8, 17.7, 23.6, 29.5]) {
  addRiser(transition - 1.15, 1.2, 0.16);
  addImpact(transition, 0.58);
}

fade(0, 1.2, 0, 1);
fade(duration - 1.8, 1.8, 1, 0);
normalize(0.86);

const wav = encodeWav(left, right, sampleRate);
const libraryPath = path.join(libraryDir, "arcforge-circuit-bed.wav");
const outputPath = path.join(outputDir, "arcforge-promo-bed.wav");
fs.writeFileSync(libraryPath, wav);
fs.writeFileSync(outputPath, wav);

const recipe = {
  id: "arcforge-circuit-bed",
  title: "ArcForge Circuit Bed",
  duration,
  bpm,
  key: "D minor",
  structure: [
    { start: 0, label: "intro pulse" },
    { start: 6, label: "main bed with arpeggio" },
    { start: 18, label: "higher motion and release prep lift" },
    { start: 30, label: "outro and resolved handoff" }
  ],
  layers: ["kick", "snare", "hat", "bass", "minor pad", "pluck melody", "transition risers", "impacts"],
  sourceMethod: "Deterministic local JavaScript synthesis, no external samples or services."
};
fs.writeFileSync(path.join(recipeDir, "arcforge-circuit-bed.json"), `${JSON.stringify(recipe, null, 2)}\n`);

const index = {
  assets: [
    {
      id: "arcforge-circuit-bed",
      title: "ArcForge Circuit Bed",
      duration,
      bpm,
      key: "D minor",
      moodTags: ["modern", "restrained", "technical", "focused"],
      sourceMethod: recipe.sourceMethod,
      paths: {
        library: "arckit/showcase-video/audio/library/music/arcforge-circuit-bed.wav",
        currentOutput: "arckit/showcase-video/audio/output/arcforge-promo-bed.wav",
        recipe: "arckit/showcase-video/audio/library/recipes/arcforge-circuit-bed.json"
      },
      license: "Project-local original asset generated for ArcForge.",
      reuseRecommendation: "Use as a restrained background bed for ArcForge promo or release videos."
    }
  ]
};
fs.writeFileSync(path.join(audioRoot, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
console.log(`Generated ${rel(libraryPath)}`);
console.log(`Generated ${rel(outputPath)}`);

function addKick(t, gain) {
  const start = toSample(t);
  const len = toSample(0.36);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 10);
    const freq = 42 + 62 * Math.exp(-x * 18);
    const click = Math.exp(-x * 70) * Math.sin(2 * Math.PI * 1600 * x) * 0.12;
    const v = (Math.sin(2 * Math.PI * freq * x) * env + click) * gain;
    mix(start + i, v, 0);
  }
}

function addSnare(t, gain) {
  const start = toSample(t);
  const len = toSample(0.28);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 14);
    const noise = (rand(start + i) * 2 - 1) * env;
    const body = Math.sin(2 * Math.PI * 184 * x) * Math.exp(-x * 18);
    mix(start + i, (noise * 0.56 + body * 0.32) * gain, 0.06);
  }
}

function addHat(t, gain) {
  const start = toSample(t);
  const len = toSample(0.085);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 42);
    const noise = (rand((start + i) * 7) * 2 - 1) * env;
    const shimmer = Math.sin(2 * Math.PI * 7600 * x) * env * 0.18;
    mix(start + i, (noise * 0.34 + shimmer) * gain, i % 2 ? -0.22 : 0.22);
  }
}

function addBassPhrase(startTime, rootFreq, offset) {
  const pattern = [0, 0.75, 1.5, 2.5, 3.25];
  for (let i = 0; i < pattern.length; i += 1) {
    const f = rootFreq * (i === 3 ? 1.5 : i === 4 ? 1.335 : 1);
    addBass(startTime + pattern[i] * beat, f, beat * 0.55, 0.28 + offset * 0.015);
  }
}

function addBass(t, freq, dur, gain) {
  const start = toSample(t);
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 0.03) * Math.exp(-x * 1.8);
    const v = (Math.sin(2 * Math.PI * freq * x) + 0.42 * Math.sin(2 * Math.PI * freq * 2 * x)) * env * gain;
    mix(start + i, v, 0);
  }
}

function addPad(t, dur, freqs, gain, pan) {
  const start = toSample(t);
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.min(1, x / 0.9) * Math.min(1, (dur - x) / 0.9);
    let v = 0;
    for (let n = 0; n < freqs.length; n += 1) {
      const detune = 1 + (n - 1.5) * 0.002;
      v += Math.sin(2 * Math.PI * freqs[n] * detune * x) * 0.19;
      v += Math.sin(2 * Math.PI * freqs[n] * 2.01 * x) * 0.045;
    }
    mix(start + i, v * env * gain, pan);
  }
}

function addPluck(t, freq, gain, pan) {
  const start = toSample(t);
  const len = toSample(0.42);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 8.2);
    const v = (
      Math.sin(2 * Math.PI * freq * x) +
      0.48 * Math.sin(2 * Math.PI * freq * 2 * x) +
      0.18 * Math.sin(2 * Math.PI * freq * 3 * x)
    ) * env * gain;
    mix(start + i, v, pan);
  }
}

function addRiser(t, dur, gain) {
  const start = toSample(Math.max(0, t));
  const len = toSample(dur);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / len;
    const freq = 380 + x * x * 1800;
    const env = Math.sin(x * Math.PI) * gain;
    const noise = (rand((start + i) * 13) * 2 - 1) * 0.18;
    const v = (Math.sin(2 * Math.PI * freq * (i / sampleRate)) * 0.35 + noise) * env;
    mix(start + i, v, x - 0.5);
  }
}

function addImpact(t, gain) {
  const start = toSample(t);
  const len = toSample(0.82);
  for (let i = 0; i < len && start + i < total; i += 1) {
    const x = i / sampleRate;
    const env = Math.exp(-x * 4.8);
    const v = (Math.sin(2 * Math.PI * 78 * x) * 0.7 + (rand(start + i) * 2 - 1) * 0.18) * env * gain;
    mix(start + i, v, 0);
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
function toSample(seconds) { return Math.max(0, Math.floor(seconds * sampleRate)); }
function rand(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function rel(value) { return path.relative(root, value).split(path.sep).join("/"); }
