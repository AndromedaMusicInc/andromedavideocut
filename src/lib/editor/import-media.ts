import { uid, type Asset } from "@/lib/editor/types";

function waitFor(target: EventTarget, event: string, timeout = 8000) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("El archivo tardó demasiado"));
    }, timeout);
    const ok = () => {
      window.clearTimeout(timer);
      resolve();
    };
    const bad = () => {
      window.clearTimeout(timer);
      reject(new Error("No se pudo leer el archivo"));
    };
    target.addEventListener(event, ok, { once: true });
    target.addEventListener("error", bad, { once: true });
  });
}

function kindOf(file: File): Asset["kind"] {
  if (file.type.startsWith("audio")) return "audio";
  if (file.type.startsWith("image")) return "image";
  return "video";
}

async function probeDuration(url: string, kind: "video" | "audio") {
  const el = document.createElement(kind);
  el.preload = "metadata";
  el.src = url;
  await waitFor(el, "loadedmetadata");
  const duration = Number.isFinite(el.duration) ? el.duration : 5;
  el.removeAttribute("src");
  return duration;
}

async function grabThumb(url: string, kind: "video" | "image") {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  if (kind === "image") {
    const img = new Image();
    img.src = url;
    await waitFor(img, "load");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  }
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.src = url;
  await waitFor(video, "loadeddata");
  const duration = Number.isFinite(video.duration) ? video.duration : 1;
  video.currentTime = Math.min(0.3, duration / 3);
  await waitFor(video, "seeked");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  video.removeAttribute("src");
  return canvas.toDataURL("image/jpeg", 0.72);
}

export async function ingestFile(file: File): Promise<{ asset: Asset; blob: Blob }> {
  const kind = kindOf(file);
  const url = URL.createObjectURL(file);
  let duration = kind === "image" ? 4 : 5;
  if (kind === "video" || kind === "audio") {
    try {
      duration = await probeDuration(url, kind);
    } catch {
      duration = 5;
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
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 42) || "Medio";
  return {
    blob: file,
    asset: {
      id: uid("m"),
      name,
      kind,
      duration: Math.max(0.3, duration),
      url,
      thumb,
      path: (window as unknown as { avcDesktop?: { pathForFile?: (f: File) => string } }).avcDesktop?.pathForFile?.(file) || undefined,
    },
  };
}
