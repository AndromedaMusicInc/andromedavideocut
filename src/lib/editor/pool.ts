import { liveClips } from "@/lib/editor/types";
import type { Asset, Clip } from "@/lib/editor/types";

export class MediaPool {
  videos = new Map<string, HTMLVideoElement>();
  images = new Map<string, HTMLImageElement>();

  warm(assets: Asset[]) {
    for (const asset of assets) {
      if (!asset.url) continue;
      if (asset.kind === "image" && !this.images.has(asset.id)) {
        const img = new Image();
        img.src = asset.url;
        this.images.set(asset.id, img);
      }
      if (asset.kind === "video" && !this.videos.has(asset.id)) {
        const video = document.createElement("video");
        video.src = asset.url;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        this.videos.set(asset.id, video);
      }
    }
  }

  /** Cambia temporalmente la fuente de un video (exportar desde el original). Devuelve cómo restaurarla. */
  async swapSource(id: string, url: string): Promise<() => void> {
    const el = this.videos.get(id);
    if (!el) return () => undefined;
    const old = el.src;
    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error("tiempo agotado")), 30000);
      el.addEventListener("loadeddata", () => { window.clearTimeout(t); resolve(); }, { once: true });
      el.addEventListener("error", () => { window.clearTimeout(t); reject(new Error("no se pudo abrir el original")); }, { once: true });
      el.crossOrigin = "anonymous"; // sin esto el lienzo queda "contaminado" y no se puede exportar
      el.src = url;
      el.load();
    });
    return () => {
      el.removeAttribute("crossorigin");
      el.src = old;
      el.load();
    };
  }

  drop(id: string) {
    const video = this.videos.get(id);
    if (video) {
      video.pause();
      video.removeAttribute("src");
      this.videos.delete(id);
    }
    this.images.delete(id);
  }

  async seekExact(time: number, clips: Clip[]) {
    const jobs: Promise<void>[] = [];
    for (const clip of clips) {
      if (clip.type !== "video" || !clip.assetId) continue;
      const local = time - clip.start;
      if (local < -0.02 || local >= clip.duration) continue;
      const el = this.videos.get(clip.assetId);
      if (!el) continue;
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      const sourceT = Math.max(0, clip.inPoint + Math.max(0, local) * (clip.speed || 1));
      const target = duration > 0.05 ? Math.min(sourceT, Math.max(0, duration - 0.04)) : sourceT;
      if (Math.abs((el.currentTime || 0) - target) < 0.012) continue;
      jobs.push(waitSeek(el, target));
    }
    if (jobs.length) await Promise.all(jobs);
  }

  sync(time: number, playing: boolean, clips: Clip[]) {
    clips = liveClips(clips);
    const wanted = new Map<string, { time: number; rate: number }>();
    for (const clip of clips) {
      if (clip.type !== "video" || !clip.assetId) continue;
      const local = time - clip.start;
      if (local < -0.12 || local >= clip.duration + 0.02) continue;
      const sourceT = Math.max(0, clip.inPoint + Math.max(0, local) * (clip.speed || 1));
      wanted.set(clip.assetId, { time: sourceT, rate: clip.speed || 1 });
    }
    for (const [id, el] of this.videos) {
      const want = wanted.get(id);
      if (!want) {
        if (!el.paused) el.pause();
        continue;
      }
      const duration = Number.isFinite(el.duration) ? el.duration : want.time + 1;
      const target = Math.min(want.time, Math.max(0, duration - 0.04));
      if (Math.abs((el.currentTime || 0) - target) > (playing ? 0.32 : 0.06)) {
        try {
          el.currentTime = target;
        } catch {
          /* not seekable yet */
        }
      }
      el.playbackRate = want.rate;
      if (playing && el.paused) void el.play().catch(() => undefined);
      if (!playing && !el.paused) el.pause();
    }
  }
}

export const pool = new MediaPool();

function waitSeek(el: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("seeked", finish);
      resolve();
    };
    el.addEventListener("seeked", finish);
    try {
      el.currentTime = time;
    } catch {
      finish();
      return;
    }
    window.setTimeout(finish, 450);
  });
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  w: number,
  h: number,
  fit: "cover" | "contain",
) {
  if (!sw || !sh) return;
  const sr = sw / sh;
  const dr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if ((fit === "cover" && sr > dr) || (fit === "contain" && sr <= dr)) {
    dh = h;
    dw = h * sr;
    dx = (w - dw) / 2;
  } else {
    dw = w;
    dh = w / sr;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(source, dx, dy, dw, dh);
}

if (typeof window !== "undefined") {
  // Solo lectura, para pruebas y diagnóstico: estado de los videos cargados en el visor.
  (window as unknown as { __avcPool?: () => unknown }).__avcPool = () =>
    [...pool.videos.entries()].map(([id, v]) => ({ id, ready: v.readyState, w: v.videoWidth, h: v.videoHeight, err: v.error?.code ?? 0, dur: v.duration }));
}
