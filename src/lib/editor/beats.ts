export interface BeatGrid {
  bpm: number;
  beats: number[];
  downbeat: number;
}

/** On-device kick grid. Times are seconds from the start of `samples`. */
export function detectBeats(samples: Float32Array, sampleRate: number): BeatGrid {
  const total = samples.length / sampleRate;
  if (total < 0.45 || sampleRate < 8000) return { bpm: 0, beats: [], downbeat: 0 };

  const hop = 512;
  const coef = Math.exp((-2 * Math.PI * 140) / sampleRate);
  const frames = Math.floor(samples.length / hop);
  const flux = new Float32Array(frames);
  let lp = 0;
  let prev = 0;
  let acc = 0;
  let count = 0;
  let frame = 0;
  const scan = Math.min(samples.length, Math.floor(sampleRate * 48));
  for (let i = 0; i < scan; i += 1) {
    const x = samples[i] ?? 0;
    lp += (1 - coef) * (x - lp);
    acc += lp * lp;
    count += 1;
    if (count === hop) {
      const energy = Math.sqrt(acc / hop);
      const diff = energy - prev;
      flux[frame] = diff > 0 ? diff : 0;
      prev = energy;
      acc = 0;
      count = 0;
      frame += 1;
    }
  }

  const used = frame;
  const win = Math.max(4, Math.round((sampleRate / hop) * 0.4));
  const minGap = Math.round((sampleRate / hop) * 0.26);
  const onsets: number[] = [];
  const weights: number[] = [];
  let last = -minGap;
  for (let i = 2; i < used - 1; i += 1) {
    let mean = 0;
    const from = Math.max(0, i - win);
    const to = Math.min(used, i + win);
    for (let j = from; j < to; j += 1) mean += flux[j] ?? 0;
    mean = (mean / Math.max(1, to - from)) * 1.7 + 0.008;
    const v = flux[i] ?? 0;
    if (v >= mean && v >= (flux[i - 1] ?? 0) && v >= (flux[i + 1] ?? 0) && i - last >= minGap) {
      onsets.push((i * hop) / sampleRate);
      weights.push(v);
      last = i;
    }
  }

  const bpm = estimateBpm(onsets);
  if (!bpm) return { bpm: 0, beats: [], downbeat: 0 };
  const beat = 60 / bpm;
  const phase = bestPhase(onsets, beat);
  const beats: number[] = [];
  for (let t = phase; t < total - 0.04; t += beat) {
    if (t >= -0.02) beats.push(Math.max(0, Number(t.toFixed(3))));
  }
  if (beats.length < 2) return { bpm: 0, beats: [], downbeat: 0 };

  let downbeat = 0;
  let best = -1;
  for (let i = 0; i < onsets.length; i += 1) {
    const o = onsets[i] ?? 0;
    const w = weights[i] ?? 0;
    const k = Math.round((o - phase) / beat);
    const grid = phase + k * beat;
    if (Math.abs(grid - o) > 0.08) continue;
    const idx = beats.findIndex((b) => Math.abs(b - grid) < 0.05);
    if (idx >= 0 && w > best) {
      best = w;
      downbeat = idx % 4;
    }
  }
  return { bpm, beats, downbeat };
}

function estimateBpm(onsets: number[]) {
  if (onsets.length < 3) return 0;
  const bins = new Map<number, number>();
  for (let i = 1; i < onsets.length; i += 1) {
    const dt = (onsets[i] ?? 0) - (onsets[i - 1] ?? 0);
    if (dt < 0.24 || dt > 1.15) continue;
    let bpm = 60 / dt;
    while (bpm < 78) bpm *= 2;
    while (bpm > 168) bpm /= 2;
    const bin = Math.round(bpm);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }
  let best = 0;
  let count = 0;
  for (const [bin, n] of bins) {
    if (n > count) {
      best = bin;
      count = n;
    }
  }
  return count >= 2 ? best : 0;
}

function bestPhase(onsets: number[], beat: number) {
  let phase = 0;
  let score = -1;
  const steps = 48;
  for (let i = 0; i < steps; i += 1) {
    const candidate = (i / steps) * beat;
    let sum = 0;
    for (const onset of onsets) {
      const k = Math.round((onset - candidate) / beat);
      const dist = Math.abs(onset - (candidate + k * beat));
      if (dist < 0.07) sum += 1 - dist / 0.07;
    }
    if (sum > score) {
      score = sum;
      phase = candidate;
    }
  }
  return phase;
}

export function everyNth(beats: number[], downbeat: number, step: number) {
  if (step <= 1) return beats.slice(0, 96);
  return beats
    .filter((_, index) => {
      const k = index - downbeat;
      return ((k % step) + step) % step === 0;
    })
    .slice(0, 96);
}
