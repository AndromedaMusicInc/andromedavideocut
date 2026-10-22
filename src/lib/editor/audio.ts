import type { Clip } from "@/lib/editor/types";
import { audioEnvelope } from "@/lib/editor/time";

export const SAMPLE_RATE = 44100;
const GEN_IDS = ["lofi", "keys", "air"] as const;

const pcmCache = new Map<string, Float32Array>();

function envAt(i: number, sr: number, attack: number, release: number, dur: number) {
  const t = i / sr;
  const a = Math.min(1, t / attack);
  const rel = Math.min(1, Math.max(0, dur - t) / release);
  return a * rel;
}

export function synth(id: string): Float32Array {
  const cached = pcmCache.get(id);
  if (cached) return cached;
  const dur = 12;
  const n = SAMPLE_RATE * dur;
  const data = new Float32Array(n);
  if (id === "keys") fillKeys(data, SAMPLE_RATE);
  else if (id === "air") fillAir(data, SAMPLE_RATE);
  else fillLofi(data, SAMPLE_RATE);
  normalize(data, 0.72);
  pcmCache.set(id, data);
  return data;
}

function normalize(data: Float32Array, peak: number) {
  let max = 0.0001;
  for (let i = 0; i < data.length; i += 1) max = Math.max(max, Math.abs(data[i] ?? 0));
  const g = peak / max;
  for (let i = 0; i < data.length; i += 1) data[i] = (data[i] ?? 0) * g;
}

function fillLofi(data: Float32Array, sr: number) {
  const bpm = 84;
  const beat = 60 / bpm;
  const beats = Math.floor(12 / beat);
  const roots = [55, 41.2, 49, 43.65];
  for (let b = 0; b < beats; b += 1) {
    const start = Math.floor(b * beat * sr);
    kick(data, sr, start);
    if (b % 4 === 2) snare(data, sr, start);
    hat(data, sr, start);
    if (b % 2 === 1) hat(data, sr, start + Math.floor(beat * 0.5 * sr));
    const note = roots[Math.floor(b / 4) % roots.length] ?? 55;
    bass(data, sr, start, Math.floor(beat * 0.92 * sr), note);
  }
}

function kick(data: Float32Array, sr: number, start: number) {
  const len = Math.floor(0.22 * sr);
  for (let i = 0; i < len; i += 1) {
    const t = i / sr;
    const f = 90 + 70 * Math.exp(-t * 28);
    const idx = start + i;
    if (idx >= data.length) break;
    data[idx] = (data[idx] ?? 0) + Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 10) * 0.95;
  }
}

function snare(data: Float32Array, sr: number, start: number) {
  const len = Math.floor(0.16 * sr);
  let noise = 0.3;
  for (let i = 0; i < len; i += 1) {
    noise = noise * 0.82 + (Math.random() * 2 - 1) * 0.18;
    const idx = start + i;
    if (idx >= data.length) break;
    const t = i / sr;
    data[idx] =
      (data[idx] ?? 0) +
      (noise * 0.55 + Math.sin(2 * Math.PI * 180 * t) * 0.25) * Math.exp(-t * 18);
  }
}

function hat(data: Float32Array, sr: number, start: number) {
  const len = Math.floor(0.04 * sr);
  for (let i = 0; i < len; i += 1) {
    const idx = start + i;
    if (idx >= data.length) break;
    const t = i / sr;
    data[idx] = (data[idx] ?? 0) + (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.18;
  }
}

function bass(data: Float32Array, sr: number, start: number, len: number, freq: number) {
  for (let i = 0; i < len; i += 1) {
    const idx = start + i;
    if (idx >= data.length) break;
    const t = i / sr;
    const e = envAt(i, sr, 0.01, 0.08, len / sr);
    data[idx] =
      (data[idx] ?? 0) +
      (Math.sin(2 * Math.PI * freq * t) * 0.55 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.08) * e;
  }
}

function fillKeys(data: Float32Array, sr: number) {
  const chords = [
    [261.63, 329.63, 392, 493.88],
    [220, 261.63, 329.63, 392],
    [174.61, 220, 261.63, 349.23],
    [196, 246.94, 293.66, 392],
  ];
  const slice = sr * 3;
  chords.forEach((notes, ci) => {
    const start = ci * slice;
    for (let i = 0; i < slice; i += 1) {
      const idx = start + i;
      if (idx >= data.length) break;
      const t = i / sr;
      const e = envAt(i, sr, 0.03, 0.45, 3);
      let s = 0;
      for (const f of notes) {
        s += Math.sin(2 * Math.PI * f * t) * 0.16;
        s += Math.sin(2 * Math.PI * f * 2 * t) * 0.03;
      }
      data[idx] = s * e;
    }
  });
}

function fillAir(data: Float32Array, sr: number) {
  const freqs = [110, 164.81, 220, 329.63];
  for (let i = 0; i < data.length; i += 1) {
    const t = i / sr;
    const lfo = 0.65 + 0.35 * Math.sin(t * 0.35);
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t + Math.sin(t * 0.2) * 0.4);
    const bed = (Math.random() * 2 - 1) * 0.04;
    data[i] = (s / freqs.length) * 0.35 * lfo + bed * lfo;
  }
}

export function waveformUrl(id: string) {
  if (typeof document === "undefined") return "";
  const samples = synth(id);
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#00d4c8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const step = Math.floor(samples.length / c.width);
  for (let x = 0; x < c.width; x += 1) {
    let peak = 0;
    const from = x * step;
    for (let i = 0; i < step; i += 32) peak = Math.max(peak, Math.abs(samples[from + i] ?? 0));
    const y = (1 - peak) * (c.height / 2);
    const y2 = c.height - y;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
  return c.toDataURL("image/png");
}

type Active = { clipId: string; gain: GainNode; stop: () => void };

export const SINK_KEY = "avc-audio-sink";
type SinkCtx = AudioContext & { setSinkId?: (id: string | { type: "none" }) => Promise<void>; sinkId?: string };

export function savedSink() {
  try {
    return localStorage.getItem(SINK_KEY) || "";
  } catch {
    return "";
  }
}

export class Mixer {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  buffers = new Map<string, AudioBuffer>();
  pending = new Map<string, ArrayBuffer>();
  active: Active[] = [];
  sinkId = "";
  lastError = "";
  /** Se llama cuando el contexto pasa a "running" (para reprogramar lo que sonaba). */
  onRunning: (() => void) | null = null;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;

  private create() {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    // "playback": búfer más grande, menos cortes en Windows.
    this.ctx = new Ctx({ latencyHint: "playback" });
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.ctx.addEventListener("statechange", () => {
      if (this.ctx?.state === "running") this.onRunning?.();
    });
    this.sinkId = savedSink();
    if (this.sinkId) void this.setSink(this.sinkId);
  }

  /** Crea y reanuda el contexto. Debe llamarse dentro de un gesto del usuario (clic o tecla). */
  async resume() {
    if (typeof window === "undefined") return;
    if (!this.ctx) this.create();
    if (!this.ctx) return;
    if (this.ctx.state !== "running") {
      try {
        // Sin carrera con un temporizador: en Windows el primer arranque del dispositivo
        // (WASAPI) puede tardar más de 1 s. Si aún no arranca, onRunning reprograma al iniciar.
        await Promise.race([this.ctx.resume(), new Promise((resolve) => window.setTimeout(resolve, 4000))]);
      } catch (e) {
        this.lastError = String(e);
      }
    }
    this.ensureGenerators();
    await this.decodePending();
  }

  /** Cambia la salida de audio ("" = predeterminado del sistema). */
  async setSink(id: string) {
    this.sinkId = id;
    try {
      localStorage.setItem(SINK_KEY, id);
    } catch {
      /* sin almacenamiento */
    }
    const ctx = this.ctx as SinkCtx | null;
    if (!ctx?.setSinkId) return !id;
    try {
      await ctx.setSinkId(id);
      this.lastError = "";
      return true;
    } catch (e) {
      // El dispositivo ya no existe (auriculares desconectados): volver al predeterminado.
      this.lastError = String(e);
      try {
        await ctx.setSinkId("");
      } catch {
        /* nada */
      }
      return false;
    }
  }

  /** Nivel actual de la mezcla (0–1, RMS) para el vúmetro. */
  level() {
    if (!this.analyser) return 0;
    if (!this.levelBuf || this.levelBuf.length !== this.analyser.fftSize) this.levelBuf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i += 1) sum += (this.levelBuf[i] ?? 0) ** 2;
    return Math.sqrt(sum / this.levelBuf.length);
  }

  /** "Probar sonido": tono corto de 440 → 660 Hz por la salida elegida. */
  async testTone() {
    await this.resume();
    if (!this.ctx || !this.master) return false;
    const t = this.ctx.currentTime + 0.03;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(660, t + 0.35);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.03);
    g.gain.setValueAtTime(0.35, t + 0.62);
    g.gain.linearRampToValueAtTime(0, t + 0.7);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.72);
    return this.ctx.state === "running";
  }

  info() {
    return {
      state: this.ctx?.state ?? "sin-crear",
      sampleRate: this.ctx?.sampleRate ?? 0,
      sinkId: this.sinkId,
      buffers: [...this.buffers.keys()],
      active: this.active.length,
      level: this.level(),
      error: this.lastError,
    };
  }

  ensureGenerators() {
    if (!this.ctx) return;
    for (const id of GEN_IDS) {
      if (this.buffers.has(id)) continue;
      const samples = synth(id);
      const buffer = this.ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      const channel = buffer.getChannelData(0);
      channel.set(samples);
      this.buffers.set(id, buffer);
    }
  }

  queue(id: string, data: ArrayBuffer) {
    this.pending.set(id, data);
    if (this.ctx) void this.decodePending();
  }

  async decodePending() {
    if (!this.ctx) return;
    const entries = [...this.pending.entries()];
    this.pending.clear();
    await Promise.all(
      entries.map(async ([id, data]) => {
        try {
          const buffer = await this.ctx!.decodeAudioData(data.slice(0));
          this.buffers.set(id, buffer);
        } catch {
          /* some video containers have no decodable audio */
        }
      }),
    );
  }

  bufferFor(clip: Clip) {
    if (clip.type === "audio" && clip.generator) return this.buffers.get(clip.generator) ?? null;
    if ((clip.type === "audio" || clip.type === "video") && clip.assetId) {
      return this.buffers.get(clip.assetId) ?? null;
    }
    return null;
  }

  stop() {
    for (const node of this.active) node.stop();
    this.active = [];
  }

  playFrom(time: number, clips: Clip[], muted: Record<string, boolean>) {
    this.stop();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime + 0.04;
    for (const clip of clips) {
      if (muted[clip.trackId] || clip.disabled) continue;
      const buffer = this.bufferFor(clip);
      if (!buffer) continue;
      const delay = clip.start - time;
      if (delay >= clip.duration && delay > 0) continue;
      const remaining = delay > 0 ? clip.duration : clip.duration + delay;
      if (remaining <= 0.02) continue;
      const sourceOffset = clip.inPoint + (delay > 0 ? 0 : -delay) * clip.speed;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = clip.speed || 1;
      src.loop = clip.type === "audio" && Boolean(clip.generator);
      const gain = this.ctx.createGain();
      gain.gain.value = clip.volume * audioEnvelope(clip, Math.max(time, clip.start));
      src.connect(gain);
      gain.connect(this.master);
      const offset =
        ((sourceOffset % buffer.duration) + buffer.duration) % buffer.duration;
      const consume = remaining * (clip.speed || 1);
      try {
        src.start(delay > 0 ? now + delay : now, offset, Math.max(0.05, consume));
      } catch {
        continue;
      }
      this.active.push({
        clipId: clip.id,
        gain,
        stop: () => {
          try {
            src.stop();
          } catch {
            /* already stopped */
          }
        },
      });
    }
  }

  updateGains(time: number, clips: Clip[], muted: Record<string, boolean>) {
    const byId = new Map(clips.map((clip) => [clip.id, clip]));
    for (const node of this.active) {
      const clip = byId.get(node.clipId);
      if (!clip) continue;
      const mute = muted[clip.trackId] ? 0 : 1;
      node.gain.gain.value = mute * clip.volume * audioEnvelope(clip, time);
    }
  }
}

export const mixer = new Mixer();

if (typeof window !== "undefined") {
  // Desbloqueo con el primer gesto en cualquier parte (Chromium/Electron arrancan el audio suspendido).
  const unlock = () => {
    void mixer.resume();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  // Solo lectura, para diagnóstico y pruebas.
  (window as unknown as { __avcAudio: unknown }).__avcAudio = { info: () => mixer.info(), level: () => mixer.level(), has: (id: string) => mixer.buffers.has(id) };
}
