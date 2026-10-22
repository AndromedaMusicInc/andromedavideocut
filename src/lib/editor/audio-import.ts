// 0.0.3: audio de cada medio importado (archivo de audio o pista de un video). Decodifica con Chromium; si no
// puede (WMA, AC3, ALAC en algunos casos, PCM raro, archivos enormes...) y estamos en la PC, ffmpeg lo convierte a
// WAV PCM 48 kHz estéreo. Si tampoco, aviso visible. Además dibuja la forma de onda del medio.
import { mixer } from "@/lib/editor/audio";
import { desktopMedia } from "@/lib/editor/import-media";
import { idbGet, idbPut } from "@/lib/editor/persist";
import { useEditor } from "@/lib/editor/store";
import type { Asset } from "@/lib/editor/types";

const MAX_DECODE = 400_000_000; // más que esto no cabe en memoria como AudioBuffer: se convierte en la PC
const MAX_SECONDS = 3 * 60 * 60;
export const audioKey = (id: string) => `${id}:audio`;

async function decode(data: ArrayBuffer): Promise<AudioBuffer | null> {
  try {
    const ctx = new OfflineAudioContext(2, 1, 48000);
    const buf = await ctx.decodeAudioData(data);
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export function bufferWaveform(buf: AudioBuffer) {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.strokeStyle = "#00d4c8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const ch = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(ch.length / c.width));
  for (let x = 0; x < c.width; x += 1) {
    let peak = 0;
    const from = x * step;
    for (let i = 0; i < step; i += 16) peak = Math.max(peak, Math.abs(ch[from + i] ?? 0));
    const h = Math.min(1, peak) * (c.height / 2);
    ctx.moveTo(x, c.height / 2 - h);
    ctx.lineTo(x, c.height / 2 + h);
  }
  ctx.stroke();
  return c.toDataURL("image/png");
}

function log(entry: Record<string, unknown>) {
  console.info("[medios]", JSON.stringify(entry));
  void desktopMedia()?.log(entry).catch(() => undefined);
}

/**
 * Carga el audio del medio en el mezclador. `hasAudio` = false si sabemos que no trae pista de audio.
 * Devuelve "ok" | "convertido" | "sin-audio" | mensaje de error.
 */
/** WAV/RF64/BWF: tamaño de datos que declara la cabecera (ds64 en RF64, de más de 4 GB). null si no es WAV. */
export async function wavDeclaredBytes(blob: Blob): Promise<number | null> {
  const head = new DataView(await blob.slice(0, 4096).arrayBuffer());
  if (head.byteLength < 12) return null;
  const tag = (o: number) => String.fromCharCode(head.getUint8(o), head.getUint8(o + 1), head.getUint8(o + 2), head.getUint8(o + 3));
  const riff = tag(0);
  if ((riff !== "RIFF" && riff !== "RF64" && riff !== "BW64") || tag(8) !== "WAVE") return null;
  let o = 12;
  let ds64: number | null = null;
  while (o + 8 <= head.byteLength) {
    const id = tag(o);
    const size = head.getUint32(o + 4, true);
    if (id === "ds64" && o + 24 <= head.byteLength) ds64 = Number(head.getBigUint64(o + 16, true));
    if (id === "data") return size === 0xffffffff && ds64 !== null ? ds64 : size;
    o += 8 + size + (size % 2);
  }
  return null;
}

export async function loadAssetAudio(asset: Asset, blob: Blob, hasAudio: boolean | undefined): Promise<string> {
  const st = useEditor.getState();
  if (asset.kind === "image" || hasAudio === false) return "sin-audio";
  const declared = await wavDeclaredBytes(blob).catch(() => null);
  if (declared !== null && declared > blob.size * 1.01 + 1024) {
    const gb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`);
    const msg = `Archivo incompleto: la cabecera WAV/RF64 dice ${gb(declared)} de audio pero el archivo pesa ${gb(blob.size)}. Se importa lo que hay; copia de nuevo el archivo completo.`;
    log({ evento: "audio", id: asset.id, name: asset.name, resultado: "aviso", error: msg });
    st.patchAsset(asset.id, { audioError: msg });
    st.tell(`⚠ ${asset.name}: ${msg}`);
    const r = await loadAssetAudioInner(asset, blob, hasAudio);
    useEditor.getState().patchAsset(asset.id, { audioError: msg });
    return r === "ok" || r === "convertido" ? msg : r;
  }
  return loadAssetAudioInner(asset, blob, hasAudio);
}

async function loadAssetAudioInner(asset: Asset, blob: Blob, hasAudio: boolean | undefined): Promise<string> {
  const st = useEditor.getState();
  let buf: AudioBuffer | null = null;
  let how = "chromium";
  if (blob.size < MAX_DECODE) buf = await decode(await blob.arrayBuffer());
  const dm = desktopMedia();
  if (!buf && dm && asset.path) {
    const r = await dm.audio(asset.id, asset.path);
    if (r.ok && r.path) {
      const bytes = await dm.read(r.path);
      if (bytes) {
        const wav = new Blob([bytes as BlobPart], { type: "audio/wav" });
        buf = await decode(await wav.arrayBuffer());
        if (buf) {
          how = "ffmpeg-wav48k";
          await idbPut(audioKey(asset.id), wav).catch(() => undefined);
        }
      }
    } else if (r.error === "sin-audio") {
      return "sin-audio";
    } else if (r.error) {
      how = r.error;
    }
  }
  if (!buf) {
    // Un video sin pista de audio no es un error (si no sabemos, tampoco avisamos de más).
    if (asset.kind === "video" && hasAudio === undefined) return "sin-audio";
    const msg = dm
      ? `No se pudo leer el audio${asset.codec ? ` (${asset.codec})` : ""}. ${how !== "chromium" ? how : ""}`.trim()
      : `Audio no compatible en la web${asset.codec ? `: ${asset.codec}` : ""}. Más formatos en la versión de PC.`;
    log({ evento: "audio", id: asset.id, name: asset.name, resultado: "error", error: msg });
    st.patchAsset(asset.id, { audioError: msg });
    return msg;
  }
  if (buf.duration > MAX_SECONDS) {
    const msg = `Audio demasiado largo (${Math.round(buf.duration / 60)} min). Máximo 3 horas por archivo.`;
    st.patchAsset(asset.id, { audioError: msg });
    return msg;
  }
  mixer.buffers.set(asset.id, buf);
  if (asset.kind === "audio" && Math.abs(buf.duration - asset.duration) > 0.05) {
    // La duración real (WMA/AC3/CAF no la sabe el navegador): ajusta también el clip recién puesto.
    const old = asset.duration;
    useEditor.setState((s) => ({ clips: s.clips.map((c) => (c.assetId === asset.id && Math.abs(c.duration - old) < 0.01 ? { ...c, duration: buf!.duration } : c)) }));
  }
  const waveform = bufferWaveform(buf);
  useEditor.getState().patchAsset(asset.id, { waveform, audioOk: how, ...(asset.kind === "audio" ? { duration: buf.duration } : {}) });
  log({ evento: "audio", id: asset.id, name: asset.name, resultado: how === "chromium" ? "ok" : "convertido", via: how, rate: buf.sampleRate, channels: buf.numberOfChannels, seconds: Math.round(buf.duration * 10) / 10 });
  return how === "chromium" ? "ok" : "convertido";
}

/** Al reabrir el proyecto: usa el WAV convertido si existe. */
export async function reloadAssetAudio(asset: Asset, blob: Blob) {
  const wav = await idbGet(audioKey(asset.id)).catch(() => undefined);
  const src = wav ?? blob;
  if (src.size >= MAX_DECODE) return;
  const buf = await decode(await src.arrayBuffer());
  if (buf) mixer.buffers.set(asset.id, buf);
}
