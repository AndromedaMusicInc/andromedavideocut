// Importación de medios. 0.0.3: comprueba de verdad que el navegador/Chromium decodifica el video (antes un códec no
// compatible dejaba el clip en blanco sin decir nada), identifica contenedor y códec (ffprobe en PC, mediabunny en
// la web), registra cada importación y, en la PC, crea un proxy H.264 en segundo plano para lo que no se puede ver.
import { uid, type Asset } from "@/lib/editor/types";

export interface MediaInfo {
  container: string;
  vcodec?: string;
  profile?: string;
  bits?: number;
  width?: number;
  height?: number;
  rotation?: number;
  acodec?: string;
  duration?: number;
  source: "ffprobe" | "mediabunny" | "extension";
}
interface DesktopMedia {
  info(): Promise<{ ffmpeg: boolean; redline: boolean; log: string }>;
  probe(p: string): Promise<{ ok: boolean; error?: string; container?: string; duration?: number; video?: { codec: string; profile: string; bits: number; width: number; height: number; rotation: number } | null; audio?: { codec: string } | null }>;
  proxy(id: string, p: string, opts?: { raw?: boolean }): Promise<{ ok: boolean; path?: string; codec?: string; mime?: string; error?: string }>;
  read(p: string): Promise<Uint8Array | null>;
  audio(id: string, p: string): Promise<{ ok: boolean; path?: string; error?: string }>;
  master?(id: string, p: string): Promise<{ ok: boolean; url?: string; error?: string }>;
  log(entry: unknown): Promise<void>;
  onProgress(fn: (id: string, pct: number) => void): () => void;
}
export const desktopMedia = (): DesktopMedia | null => (window as unknown as { avcDesktop?: { media?: DesktopMedia } }).avcDesktop?.media ?? null;

/** Extensiones que el selector de archivos debe mostrar (Windows oculta las que no conoce con "video/*"). */
export const ACCEPT =
  "video/*,image/*,audio/*,.mp4,.m4v,.mov,.qt,.mkv,.webm,.avi,.mxf,.mts,.m2ts,.ts,.mpg,.mpeg,.wmv,.flv,.3gp,.r3d,.nev,.braw,.ari,.crm,.dng,.heic,.mp3,.wav,.bwf,.rf64,.w64,.m4a,.aac,.alac,.flac,.ogg,.oga,.opus,.aif,.aiff,.aifc,.wma,.ac3,.eac3,.caf,.mka";
const RAW = /\.(r3d|nev|braw|ari|crm)$/i;

export class ImportError extends Error {
  constructor(message: string, public info?: MediaInfo) {
    super(message);
  }
}

function waitFor(target: EventTarget, event: string, timeout: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("tiempo agotado")), timeout);
    target.addEventListener(event, () => { window.clearTimeout(timer); resolve(); }, { once: true });
    target.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("error del decodificador")); }, { once: true });
  });
}

const ext = (name: string) => (/\.([^.]+)$/.exec(name)?.[1] ?? "").toLowerCase();
function kindOf(file: File): Asset["kind"] {
  if (file.type.startsWith("audio") || /^(mp3|wav|bwf|rf64|w64|m4a|aac|alac|flac|ogg|oga|opus|aif|aiff|aifc|wma|ac3|eac3|caf|mka)$/.test(ext(file.name))) return "audio";
  if (file.type.startsWith("image") || /^(png|jpe?g|gif|webp|bmp|avif)$/.test(ext(file.name))) return "image";
  return "video";
}

async function identify(file: File, path: string | undefined): Promise<MediaInfo> {
  const dm = desktopMedia();
  if (dm && path) {
    const r = await dm.probe(path).catch(() => null);
    if (r?.ok) return { container: r.container ?? "", vcodec: r.video?.codec, profile: r.video?.profile, bits: r.video?.bits, width: r.video?.width, height: r.video?.height, rotation: r.video?.rotation, acodec: r.audio?.codec, duration: r.duration, source: "ffprobe" };
  }
  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const fmt = await input.getFormat();
    const vt = await input.getPrimaryVideoTrack();
    const at = await input.getPrimaryAudioTrack();
    const cps = vt ? await vt.getCodecParameterString().catch(() => null) : null;
    const tenBit = cps ? /^(hvc1|hev1)\.2|^avc1\.6e|^vp09\.\d\d\.\d\d\.10|^av01\.\d\.\d\d\w\.10/.test(cps) : false;
    return { container: fmt.name, vcodec: vt?.codec ?? undefined, profile: cps ?? undefined, bits: tenBit ? 10 : vt ? 8 : undefined, width: vt?.displayWidth, height: vt?.displayHeight, rotation: vt?.rotation, acodec: at?.codec ?? undefined, duration: await input.computeDuration().catch(() => undefined), source: "mediabunny" };
  } catch {
    return { container: ext(file.name) || "desconocido", source: "extension" };
  }
}

const NAMES: Record<string, string> = { hevc: "HEVC/H.265", h264: "H.264", avc: "H.264", prores: "ProRes", prores_raw: "ProRes RAW", dnxhd: "DNxHD/DNxHR", mpeg4: "MPEG-4 Part 2 (Xvid/DivX)", vp9: "VP9", vp8: "VP8", av1: "AV1", mpeg2video: "MPEG-2", mjpeg: "Motion JPEG", "": "" };
export function describe(info: MediaInfo, fileName: string) {
  const codec = info.vcodec ? NAMES[info.vcodec] ?? info.vcodec.toUpperCase() : "";
  const bits = info.bits && info.bits > 8 ? ` ${info.bits}-bit` : "";
  const cont = ext(fileName).toUpperCase() || info.container;
  return [codec + bits, cont].filter(Boolean).join(", ");
}

const ANAMES: Record<string, string> = { pcm_s16le: "WAV 16-bit", pcm_s24le: "WAV 24-bit", pcm_f32le: "WAV 32-bit float", pcm_s16be: "PCM 16-bit", pcm_s24be: "PCM 24-bit", mp3: "MP3", mp3float: "MP3", aac: "AAC", alac: "ALAC", flac: "FLAC", vorbis: "Vorbis", opus: "Opus", wmav2: "WMA", wmapro: "WMA Pro", ac3: "AC-3", eac3: "E-AC-3", "pcm-s16": "PCM 16-bit", "pcm-s24": "PCM 24-bit", "pcm-f32": "PCM 32-bit float" };
export function describeAudio(info: MediaInfo, fileName: string) {
  const c = info.acodec ? ANAMES[info.acodec] ?? info.acodec.toUpperCase() : "";
  return [c, ext(fileName).toUpperCase()].filter(Boolean).join(", ");
}

/** Prueba real: carga el video y exige ancho > 0 y un cuadro decodificado. */
async function browserDecodes(url: string, size: number) {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.src = url;
  try {
    await waitFor(video, "loadeddata", 15000 + Math.min(45000, size / 2e7));
    return video.videoWidth > 0 && video.videoHeight > 0;
  } catch {
    return false;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

async function probeDuration(url: string, kind: "video" | "audio", size: number) {
  const el = document.createElement(kind);
  el.preload = "metadata";
  el.src = url;
  await waitFor(el, "loadedmetadata", 15000 + Math.min(45000, size / 2e7));
  const duration = Number.isFinite(el.duration) ? el.duration : 5;
  el.removeAttribute("src");
  return duration;
}

export async function grabThumb(url: string, kind: "video" | "image") {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  if (kind === "image") {
    const img = new Image();
    img.src = url;
    await waitFor(img, "load", 15000);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  }
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.src = url;
  await waitFor(video, "loadeddata", 20000);
  if (!video.videoWidth) throw new Error("sin imagen");
  const duration = Number.isFinite(video.duration) ? video.duration : 1;
  video.currentTime = Math.min(0.3, duration / 3);
  await waitFor(video, "seeked", 10000);
  const r = video.videoWidth / video.videoHeight;
  let w = 320, h = 320 / r;
  if (h > 180) { h = 180; w = 180 * r; }
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 320, 180);
  ctx.drawImage(video, (320 - w) / 2, (180 - h) / 2, w, h);
  video.removeAttribute("src");
  return canvas.toDataURL("image/jpeg", 0.72);
}

function logImport(entry: Record<string, unknown>) {
  console.info("[medios]", JSON.stringify(entry));
  void desktopMedia()?.log(entry).catch(() => undefined);
}

export type IngestResult = { asset: Asset; blob: Blob; needsProxy?: { raw: boolean } };

export async function ingestFile(file: File): Promise<IngestResult> {
  const path = (window as unknown as { avcDesktop?: { pathForFile?: (f: File) => string } }).avcDesktop?.pathForFile?.(file) || undefined;
  const kind = kindOf(file);
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 42) || "Medio";
  const base = { file: file.name, bytes: file.size, type: file.type || "(sin tipo)", kind, path: path ? "(ruta local)" : undefined };
  const dm = desktopMedia();
  const pc = dm ? await dm.info().catch(() => null) : null;

  if (RAW.test(file.name)) {
    const info: MediaInfo = { container: ext(file.name).toUpperCase(), vcodec: ext(file.name), source: "extension" };
    const isRed = /\.(r3d|nev)$/i.test(file.name);
    if (dm && path && pc?.ffmpeg && pc.redline && isRed) {
      logImport({ ...base, resultado: "raw-redline", codec: info.vcodec });
      return { asset: { id: uid("m"), name, kind: "video", duration: 5, path, status: "convirtiendo", progress: 0, codec: describe(info, file.name) }, blob: file, needsProxy: { raw: true } };
    }
    const msg = /\.r3d$/i.test(file.name)
      ? dm
        ? "Formato no compatible todavía: RED R3D. Instala REDCINE-X PRO (gratis, de RED) y vuelve a importarlo: lo convertimos con REDline. O exporta un ProRes/H.264 desde REDCINE-X o DaVinci Resolve."
        : "Formato no compatible en la web: RED R3D. Más formatos en la versión de PC (con REDCINE-X PRO instalado)."
      : /\.nev$/i.test(file.name)
        ? dm
          ? "Formato no compatible todavía: Nikon N-RAW. Convierte con NX Studio / DaVinci Resolve, o instala REDCINE-X PRO (lee N-RAW) y vuelve a importarlo."
          : "Formato no compatible en la web: Nikon N-RAW. Convierte con NX Studio / DaVinci Resolve. Más formatos en la versión de PC."
        : `Formato no compatible: ${ext(file.name).toUpperCase()} (RAW de cámara). Conviértelo con el programa de la cámara o DaVinci Resolve.`;
    logImport({ ...base, resultado: "error", error: msg });
    throw new ImportError(msg, info);
  }

  const url = URL.createObjectURL(file);
  let info: MediaInfo | null = null;
  if (kind === "video") {
    const ok = await browserDecodes(url, file.size);
    info = await identify(file, path);
    const desc = describe(info, file.name);
    if (!ok) {
      if (info.vcodec === "prores_raw" && !(pc?.ffmpeg)) {
        URL.revokeObjectURL(url);
        throw new ImportError("Formato no compatible: ProRes RAW. Convierte con DaVinci Resolve / Final Cut Pro, o usa la versión de PC.", info);
      }
      if (dm && path && pc?.ffmpeg) {
        URL.revokeObjectURL(url);
        logImport({ ...base, ...info, resultado: "proxy", motivo: "Chromium no decodifica" });
        return { asset: { id: uid("m"), name, kind: "video", duration: Math.max(0.3, info.duration || 5), path, status: "convirtiendo", progress: 0, codec: desc, hasAudio: info.source !== "extension" ? Boolean(info.acodec) : undefined }, blob: file, needsProxy: { raw: false } };
      }
      URL.revokeObjectURL(url);
      const msg = dm
        ? `Formato no compatible: ${desc || file.name}. No se encontró el convertidor de la app; reinstala AndromedaVideoCut.`
        : `Formato no compatible en la web: ${desc || file.name}. Más formatos en la versión de PC (convierte HEVC, ProRes, DNxHD, MXF, AVI, MTS y más).`;
      logImport({ ...base, ...info, resultado: "error", error: msg });
      throw new ImportError(msg, info);
    }
  }
  if (kind === "audio") info = await identify(file, path);
  let duration = kind === "image" ? 4 : 5;
  if (kind === "video" || kind === "audio") {
    try {
      duration = await probeDuration(url, kind, file.size);
    } catch {
      duration = info?.duration || 5;
    }
  }
  let thumb: string | undefined;
  if (kind !== "audio") {
    try {
      thumb = await grabThumb(url, kind);
    } catch {
      thumb = undefined;
    }
  }
  logImport({ ...base, ...(info ?? {}), resultado: "ok", duration });
  return {
    blob: file,
    asset: { id: uid("m"), name, kind, duration: Math.max(0.3, duration), url, thumb, path, codec: info ? (kind === "audio" ? describeAudio(info, file.name) : describe(info, file.name)) : undefined, hasAudio: kind === "audio" ? undefined : info && info.source !== "extension" ? Boolean(info.acodec) : undefined },
  };
}

/** PC: convierte en segundo plano y devuelve el proxy como Blob. */
export async function makeProxy(asset: Asset, raw: boolean, onProgress: (pct: number) => void): Promise<{ blob: Blob; codec: string }> {
  const dm = desktopMedia();
  if (!dm || !asset.path) throw new Error("solo en la versión de PC");
  const off = dm.onProgress((id, pct) => { if (id === asset.id) onProgress(pct); });
  try {
    const r = await dm.proxy(asset.id, asset.path, { raw });
    if (!r.ok || !r.path) {
      const red = r.error === "no-redline";
      throw new Error(red ? "Instala REDCINE-X PRO para convertir RAW de RED/Nikon." : `No se pudo convertir: ${r.error ?? "error"}`);
    }
    const bytes = await dm.read(r.path);
    if (!bytes) throw new Error("No se pudo leer el proxy");
    return { blob: new Blob([bytes as BlobPart], { type: r.mime || "video/mp4" }), codec: r.codec || "" };
  } finally {
    off();
  }
}
