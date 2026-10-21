import { mixer } from "@/lib/editor/audio";
import { drawFrame } from "@/lib/editor/draw";
import { pause, play, setFrameSink } from "@/lib/editor/engine";
import { mixStereo } from "@/lib/editor/mixdown";
import { playback } from "@/lib/editor/playback";
import { pool } from "@/lib/editor/pool";
import { useEditor } from "@/lib/editor/store";
import { contentEnd } from "@/lib/editor/time";
import { ASPECTS } from "@/lib/editor/types";

const AUDIO_RATE = 48000;

export const QUALITIES = [
  { id: "720", label: "720p", scale: 720 / 1080, bitrate: 4_000_000 },
  { id: "1080", label: "1080p", scale: 1, bitrate: 8_000_000 },
  { id: "2k", label: "2K", scale: 1440 / 1080, bitrate: 12_000_000 },
  { id: "4k", label: "4K", scale: 2160 / 1080, bitrate: 20_000_000 },
  { id: "6k", label: "6K", scale: 3240 / 1080, bitrate: 30_000_000 },
] as const;

export const FRAME_RATES = [24, 30, 60] as const;
export type FrameRate = (typeof FRAME_RATES)[number];
export type QualityId = (typeof QUALITIES)[number]["id"];

export interface ExportOptions {
  fileName?: string;
  quality?: QualityId;
  fps?: FrameRate;
  audio?: boolean;
}

export type ExportResult =
  | { ok: true; file: string; format: "mp4" | "webm"; audio: "aac" | "opus" | "webm" | "off"; blob: Blob }
  | { ok: false; cancelled: true };

export async function exportVideo(
  onProgress: (value: number) => void,
  isCancelled: () => boolean,
  options?: ExportOptions,
): Promise<ExportResult> {
  const { aspect, clips, name } = useEditor.getState();
  const end = contentEnd(clips);
  if (end <= 0.05) throw new Error("Agrega un clip antes de exportar");
  const base = ASPECTS[aspect];
  const quality = QUALITIES.find((item) => item.id === options?.quality) ?? QUALITIES[1];
  const fps = options?.fps ?? 30;
  const withAudio = options?.audio !== false;
  const width = Math.round((base.w * quality.scale) / 2) * 2;
  const height = Math.round((base.h * quality.scale) / 2) * 2;
  const fileName = (options?.fileName || name || "AndromedaVideoCut").trim();
  const restore = playback.time;
  pause();
  try {
    try {
      const mp4 = await exportMp4(width, height, end, fileName, quality.bitrate, fps, withAudio, onProgress, isCancelled);
      if (mp4 === "cancelled") return { ok: false, cancelled: true };
      if (mp4) return { ok: true, file: mp4.file, format: "mp4", audio: mp4.audio, blob: mp4.blob };
    } catch {
      if (isCancelled()) return { ok: false, cancelled: true };
    }
    return await exportRecorder(width, height, end, fileName, fps, withAudio, onProgress, isCancelled);
  } finally {
    setFrameSink(null);
    if (playback.playing) pause();
    playback.setTime(restore);
    useEditor.setState({ time: restore, playing: false });
    pool.sync(restore, false, useEditor.getState().clips);
  }
}

async function exportMp4(
  width: number,
  height: number,
  end: number,
  name: string,
  bitrate: number,
  fps: number,
  withAudio: boolean,
  onProgress: (value: number) => void,
  isCancelled: () => boolean,
): Promise<{ file: string; audio: "aac" | "opus" | "off"; blob: Blob } | "cancelled" | null> {
  if (typeof VideoEncoder === "undefined" || typeof AudioEncoder === "undefined") return null;
  onProgress(0.01);
  const loaded = await until(import("mediabunny"), 12000);
  if (loaded === "timeout") return null;
  const mediabunny = loaded;
  const videoCodec = await until(
    mediabunny.getFirstEncodableVideoCodec(["avc"], { width, height, bitrate, frameRate: fps }),
    8000,
  );
  const audioCodec = withAudio
    ? await until(
        mediabunny.getFirstEncodableAudioCodec(["aac", "opus"], {
          numberOfChannels: 2,
          sampleRate: AUDIO_RATE,
          bitrate: 128_000,
        }),
        8000,
      )
    : null;
  if (videoCodec === "timeout" || !videoCodec) return null;
  if (withAudio && (audioCodec === "timeout" || !audioCodec)) return null;

  await mixer.resume();
  if (!mixer.ctx) return null;
  const state = useEditor.getState();
  const mix = mixStereo(state.clips, state.muted, end, AUDIO_RATE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  const target = new mediabunny.BufferTarget();
  const output = new mediabunny.Output({
    format: new mediabunny.Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const video = new mediabunny.CanvasSource(canvas, {
    codec: videoCodec,
    bitrate,
    keyFrameInterval: 2,
  });
  const audio = withAudio && audioCodec && audioCodec !== "timeout" ? new mediabunny.AudioBufferSource({ codec: audioCodec, bitrate: 128_000 }) : null;
  output.addVideoTrack(video);
  if (audio) output.addAudioTrack(audio);
  const started = await until(output.start(), 8000);
  if (started === "timeout") {
    await output.cancel().catch(() => undefined);
    return null;
  }
  try {
    if (isCancelled()) {
      await output.cancel();
      return "cancelled";
    }
    const chunk = AUDIO_RATE * 2;
    if (audio && mixer.ctx) {
      for (let offset = 0; offset < mix.left.length; offset += chunk) {
        const count = Math.min(chunk, mix.left.length - offset);
        const buffer = mixer.ctx.createBuffer(2, count, AUDIO_RATE);
        buffer.copyToChannel(mix.left.subarray(offset, offset + count), 0);
        buffer.copyToChannel(mix.right.subarray(offset, offset + count), 1);
        const added = await until(audio.add(buffer), 8000);
        if (added === "timeout") {
          await output.cancel().catch(() => undefined);
          return null;
        }
        if (isCancelled()) {
          await output.cancel();
          return "cancelled";
        }
      }
    }
    onProgress(0.06);
    const frames = Math.max(1, Math.round(end * fps));
    const step = 1 / fps;
    for (let index = 0; index < frames; index += 1) {
      if (isCancelled()) {
        await output.cancel();
        return "cancelled";
      }
      const time = Math.min(end, index * step);
      playback.setTime(time);
      await pool.seekExact(time, useEditor.getState().clips);
      drawFrame(ctx, width, height, time, useEditor.getState().clips, useEditor.getState().layers, useEditor.getState().trackOrder);
      const added = await until(video.add(time, step), 8000);
      if (added === "timeout") {
        await output.cancel().catch(() => undefined);
        return null;
      }
      if (index % 3 === 0 || index === frames - 1) onProgress(0.06 + (0.94 * (index + 1)) / frames);
    }
    await output.finalize();
    if (!target.buffer) throw new Error("El MP4 salió vacío");
    const file = fileName(name, "mp4");
    const blob = new Blob([target.buffer], { type: "video/mp4" });
    onProgress(1);
    return { file, audio: withAudio && audioCodec && audioCodec !== "timeout" ? (audioCodec === "aac" ? "aac" : "opus") : "off", blob };
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled") {
      await output.cancel().catch(() => undefined);
    }
    if (isCancelled()) return "cancelled";
    throw error;
  }
}

async function exportRecorder(
  width: number,
  height: number,
  end: number,
  name: string,
  fps: number,
  withAudio: boolean,
  onProgress: (value: number) => void,
  isCancelled: () => boolean,
): Promise<ExportResult> {
  await mixer.resume();
  if (withAudio && (!mixer.ctx || !mixer.master || mixer.ctx.state !== "running")) {
    throw new Error("Toca reproducir una vez para activar el sonido y vuelve a exportar");
  }
  const mime = recorderMime(withAudio);
  if (!mime) throw new Error("Este navegador no puede exportar video");
  const mp4 = mime.startsWith("video/mp4");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("No se pudo preparar el video");

  const dest = withAudio && mixer.ctx ? mixer.ctx.createMediaStreamDestination() : null;
  if (dest && mixer.master) mixer.master.connect(dest);
  try {
    const stream = canvas.captureStream(fps);
    const tracks = withAudio && dest ? [...stream.getVideoTracks(), ...dest.stream.getAudioTracks()] : stream.getVideoTracks();
    const rec = new MediaRecorder(new MediaStream(tracks), {
      mimeType: mime,
      videoBitsPerSecond: 4_500_000,
    });
    const chunks: Blob[] = [];
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const done = new Promise<Blob>((resolve, reject) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: mp4 ? "video/mp4" : "video/webm" }));
      rec.onerror = () => reject(new Error("Falló la grabación"));
    });
    let stopped = false;
    let armed = false;
    const finish = () => {
      if (stopped) return;
      stopped = true;
      setFrameSink(null);
      if (rec.state !== "inactive") rec.stop();
    };
    const { clips, layers, trackOrder } = useEditor.getState();
    drawFrame(ctx, width, height, 0, clips, layers, trackOrder);
    setFrameSink((time) => {
      drawFrame(ctx, width, height, time, useEditor.getState().clips, useEditor.getState().layers, useEditor.getState().trackOrder);
      onProgress(Math.min(1, time / end));
      if (playback.playing) armed = true;
      if (isCancelled() || (armed && !playback.playing)) finish();
    });
    rec.start(200);
    playback.setTime(0);
    play();
    const blob = await done;
    if (isCancelled()) return { ok: false, cancelled: true };
    const file = fileName(name, mp4 ? "mp4" : "webm");
    const audio = !withAudio ? "off" : mp4 ? (mime.includes("mp4a") ? "aac" : "opus") : "webm";
    return { ok: true, file, format: mp4 ? "mp4" : "webm", audio, blob };
  } finally {
    try {
      if (dest) mixer.master?.disconnect(dest);
    } catch {
      /* already disconnected */
    }
  }
}

function recorderMime(withAudio: boolean) {
  const types = withAudio
    ? [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ]
    : ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function until<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => resolve("timeout"), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function fileName(name: string, ext: string) {
  const base = (name || "AndromedaVideoCut").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").slice(0, 40);
  return `${base || "AndromedaVideoCut"}.${ext}`;
}

export async function saveBlob(blob: Blob, filename: string) {
  // Build estático: descarga directa desde un Object URL (sin servidor).
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(href);
  }, 60000);
  return href;
}

export function openBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) window.location.assign(url);
  return url;
}
