import { liveClips } from "@/lib/editor/types";
import { paintRecipe } from "@/lib/editor/fx-paint";
import { recipeOf } from "@/lib/editor/fx-catalog";
import { drawGenerator, drawSticker } from "@/lib/editor/generators";
import { clipMotion, motionWindows } from "@/lib/editor/motion";
import { drawCover, pool } from "@/lib/editor/pool";
import { useEditor } from "@/lib/editor/store";
import type { Clip, EffectId } from "@/lib/editor/types";
import { paintOrder } from "@/lib/editor/tracks";
import { FILTERS, textFont } from "@/lib/editor/types";

function filterOf(clip: Clip, extra?: string) {
  const preset = FILTERS.find((item) => item.id === clip.filter)?.css ?? "none";
  const sat = clip.saturate ?? 1;
  const parts: string[] = [];
  if (preset !== "none") parts.push(preset);
  if (clip.brightness !== 1 || clip.contrast !== 1 || Math.abs(sat - 1) > 0.015) {
    parts.push(`brightness(${clip.brightness}) contrast(${clip.contrast}) saturate(${sat})`);
  }
  if (extra) parts.push(extra);
  return parts.length ? parts.join(" ") : "none";
}

function fade(clip: Clip, time: number) {
  const local = time - clip.start;
  if (local < 0 || local > clip.duration) return 0;
  let alpha = 1;
  if (clip.fadeIn > 0) alpha *= Math.min(1, local / clip.fadeIn);
  if (clip.fadeOut > 0) alpha *= Math.min(1, (clip.duration - local) / clip.fadeOut);
  return Math.max(0, Math.min(1, alpha));
}

function ease(p: number) {
  const x = Math.max(0, Math.min(1, p));
  return x * x * (3 - 2 * x);
}

function backOut(x: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function paint(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  time: number,
  alpha: number,
  w: number,
  h: number,
  extra?: string,
) {
  const sample = Math.min(Math.max(time, clip.start), clip.start + clip.duration - 0.0001);
  const local = sample - clip.start;
  const sourceTime = clip.inPoint + Math.max(0, local) * (clip.speed || 1);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * clip.opacity * fade(clip, sample)));
  if (clip.type === "text") {
    drawText(ctx, clip, w, h, local);
    ctx.restore();
    return;
  }
  if (clip.type === "fx") {
    ctx.restore();
    return;
  }
  const motion = clipMotion(clip, local);
  ctx.globalAlpha = Math.max(0, Math.min(1, ctx.globalAlpha * motion.alpha));
  const blurPx = motion.blur > 0.4 ? motion.blur * (w / 1080) : 0;
  const fx = filterOf(clip, [extra, blurPx ? `blur(${blurPx.toFixed(1)}px)` : ""].filter(Boolean).join(" ") || undefined);
  if (clip.type === "sticker") {
    if (fx !== "none") ctx.filter = fx;
    drawSticker(
      ctx,
      clip.generator ?? "star",
      w,
      h,
      sourceTime,
      (clip.x ?? 0) + motion.dx,
      (clip.y ?? 0) + motion.dy,
      (clip.rotation ?? 0) + motion.rot,
      (clip.scale ?? 1) * motion.scale,
    );
    ctx.restore();
    return;
  }
  ctx.filter = fx;
  const scale = (clip.scale ?? 1) * motion.scale;
  const ox = (clip.x ?? 0) + motion.dx;
  const oy = (clip.y ?? 0) + motion.dy;
  const rot = (((clip.rotation ?? 0) + motion.rot) * Math.PI) / 180;
  if (Math.abs(scale - 1) > 0.005 || ox !== 0 || oy !== 0 || Math.abs(rot) > 0.001) {
    ctx.translate(w / 2 + ox * w * 0.34, h / 2 + oy * h * 0.36);
    if (Math.abs(rot) > 0.001) ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
  }
  const effect = clip.effect ?? "none";
  const drawFx =
    effect === "blur"
      ? [fx === "none" ? "" : fx, `blur(${(8 * (w / 1080)).toFixed(1)}px)`].filter(Boolean).join(" ")
      : fx;
  ctx.filter = drawFx || "none";
  if (effect === "pixel") paintPixel(ctx, clip, sourceTime, w, h, drawFx);
  else if (effect === "tiles") paintTiles(ctx, clip, sourceTime, w, h);
  else if (effect === "mirror") paintMirror(ctx, clip, sourceTime, w, h);
  else if (effect === "slices") paintSlices(ctx, clip, sourceTime, w, h, local);
  else if (effect === "key") paintKey(ctx, clip, sourceTime, w, h, drawFx);
  else {
    drawVisual(ctx, clip, sourceTime, w, h);
    ctx.filter = "none";
    if (effect === "chroma") chroma(ctx, clip, sourceTime, w, h, local);
  }
  ctx.filter = "none";
  gradeClip(ctx, clip, w, h, local);
  ctx.restore();
}

function gradeClip(ctx: CanvasRenderingContext2D, clip: Clip, w: number, h: number, local: number) {
  const wash = clip.wash ?? 0;
  if (wash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${(wash * 0.7).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  const temp = clip.temperature ?? 0;
  if (Math.abs(temp) > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = Math.min(0.9, Math.abs(temp) * 0.8);
    ctx.fillStyle = temp > 0 ? "#ff7a2f" : "#2f6dff";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const tint = clip.tint ?? 0;
  if (Math.abs(tint) > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = Math.min(0.75, Math.abs(tint) * 0.65);
    ctx.fillStyle = tint > 0 ? "#ff4fa3" : "#3dff9a";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (clip.filter === "grain") grain(ctx, w, h, local);
  if (clip.filter === "vhs") vhs(ctx, w, h, local);
  paintEffect(ctx, clip.effect ?? "none", w, h, local);
  const vig = Math.max(clip.vignette ?? 0, clip.filter === "cinema" ? 0.55 : 0);
  if (vig > 0.02) vignette(ctx, w, h, vig);
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, local: number) {
  const seed = Math.floor(local * 12);
  let n = seed * 1103515245 + 12345;
  const next = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
  ctx.save();
  for (let i = 0; i < 70; i += 1) {
    ctx.globalAlpha = 0.12 + next() * 0.2;
    ctx.fillStyle = next() > 0.5 ? "#f3f3f5" : "#0c0c0e";
    ctx.fillRect(next() * w, next() * h, 1.5, 1.5);
  }
  ctx.restore();
}

function vhs(ctx: CanvasRenderingContext2D, w: number, h: number, local: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  const step = Math.max(4, Math.round(h / 70));
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, Math.max(1, step * 0.28));
  const bar = ((local * 0.35) % 1) * h;
  ctx.fillStyle = "rgba(0,212,200,0.16)";
  ctx.fillRect(0, bar, w, Math.max(6, h * 0.045));
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.68);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${(0.12 + amount * 0.72).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawVisual(ctx: CanvasRenderingContext2D, clip: Clip, sourceTime: number, w: number, h: number) {
  if (clip.type === "generator") {
    drawGenerator(ctx, clip.generator ?? "neon", w, h, sourceTime);
    return;
  }
  if (clip.type === "image" && clip.assetId) {
    const img = pool.images.get(clip.assetId);
    if (img && img.complete && img.naturalWidth) {
      drawCover(ctx, img, img.naturalWidth, img.naturalHeight, w, h, clip.fit);
    }
    return;
  }
  if (clip.type === "video" && clip.assetId) {
    const video = pool.videos.get(clip.assetId);
    if (video && video.readyState >= 2) {
      drawCover(ctx, video, video.videoWidth, video.videoHeight, w, h, clip.fit);
    } else {
      ctx.filter = "none";
      ctx.fillStyle = "#14141a";
      ctx.fillRect(0, 0, w, h);
    }
  }
}

let pixelBuf: HTMLCanvasElement | null = null;
let noiseBuf: HTMLCanvasElement | null = null;

function paintPixel(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  sourceTime: number,
  w: number,
  h: number,
  fx: string,
) {
  const cols = w >= h ? 48 : 32;
  const rows = Math.max(12, Math.round(cols * (h / Math.max(1, w))));
  if (typeof document === "undefined") {
    drawVisual(ctx, clip, sourceTime, w, h);
    return;
  }
  if (!pixelBuf) pixelBuf = document.createElement("canvas");
  if (pixelBuf.width !== cols || pixelBuf.height !== rows) {
    pixelBuf.width = cols;
    pixelBuf.height = rows;
  }
  const bctx = pixelBuf.getContext("2d");
  if (!bctx) return;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.clearRect(0, 0, cols, rows);
  bctx.filter = fx || "none";
  drawVisual(bctx, clip, sourceTime, cols, rows);
  bctx.filter = "none";
  ctx.filter = "none";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixelBuf, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

function paintTiles(ctx: CanvasRenderingContext2D, clip: Clip, sourceTime: number, w: number, h: number) {
  const n = 3;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect((x * w) / n, (y * h) / n, w / n + 1, h / n + 1);
      ctx.clip();
      ctx.translate((x * w) / n, (y * h) / n);
      ctx.scale(1 / n, 1 / n);
      drawVisual(ctx, clip, sourceTime, w, h);
      ctx.restore();
    }
  }
  ctx.filter = "none";
}

function paintMirror(ctx: CanvasRenderingContext2D, clip: Clip, sourceTime: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w / 2, h);
  ctx.clip();
  drawVisual(ctx, clip, sourceTime, w, h);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(w / 2, 0, w / 2 + 1, h);
  ctx.clip();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  drawVisual(ctx, clip, sourceTime, w, h);
  ctx.restore();
  ctx.filter = "none";
}

function paintSlices(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  sourceTime: number,
  w: number,
  h: number,
  local: number,
) {
  const bands = 6;
  for (let i = 0; i < bands; i += 1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, (i / bands) * h, w, h / bands + 1);
    ctx.clip();
    const shift = Math.sin(local * 14 + i * 1.7) * w * 0.04;
    ctx.translate(shift, 0);
    drawVisual(ctx, clip, sourceTime, w, h);
    ctx.restore();
  }
  ctx.filter = "none";
}

let keyBuf: HTMLCanvasElement | null = null;
let keyWarned = false;

function parseKey(raw: string | undefined) {
  const hex = /^#?([0-9a-f]{6})$/i.exec(raw ?? "");
  if (!hex?.[1]) return [0, 255, 0];
  const n = parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function keyPixels(g: CanvasRenderingContext2D, w: number, h: number, color: string | undefined, tol: number) {
  let img: ImageData;
  try {
    img = g.getImageData(0, 0, w, h);
  } catch {
    if (!keyWarned) {
      keyWarned = true;
      useEditor.getState().tell("No pude leer ese video para quitar el fondo. Sube el archivo desde tu equipo.");
    }
    return false;
  }
  const [kr, kg, kb] = parseKey(color);
  const limit = Math.max(0.08, Math.min(0.95, tol));
  const feather = 0.16;
  const tol2 = limit * limit;
  const edge2 = (limit + feather) * (limit + feather);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const dr = ((data[i] ?? 0) - kr) / 255;
    const dg = ((data[i + 1] ?? 0) - kg) / 255;
    const db = ((data[i + 2] ?? 0) - kb) / 255;
    const dist2 = dr * dr + dg * dg + db * db;
    const alpha = data[i + 3] ?? 0;
    if (dist2 <= tol2) data[i + 3] = 0;
    else if (dist2 < edge2) {
      const t = (Math.sqrt(dist2) - limit) / feather;
      data[i + 3] = Math.round(alpha * Math.max(0, Math.min(1, t)));
    }
  }
  g.putImageData(img, 0, 0);
  return true;
}

function paintKey(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  sourceTime: number,
  w: number,
  h: number,
  filter: string,
) {
  if (typeof document === "undefined") return;
  if (!keyBuf) keyBuf = document.createElement("canvas");
  if (keyBuf.width !== w || keyBuf.height !== h) {
    keyBuf.width = w;
    keyBuf.height = h;
  }
  const g = keyBuf.getContext("2d", { willReadFrequently: true });
  if (!g) {
    drawVisual(ctx, clip, sourceTime, w, h);
    return;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.filter = filter && filter !== "none" ? filter : "none";
  drawVisual(g, clip, sourceTime, w, h);
  g.filter = "none";
  keyPixels(g, w, h, clip.keyColor || "#00ff00", clip.keyTol ?? 0.42);
  ctx.filter = "none";
  ctx.drawImage(keyBuf, 0, 0);
}

function chroma(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  sourceTime: number,
  w: number,
  h: number,
  local: number,
) {
  const shift = (12 + Math.abs(Math.sin(local * 3.5)) * 16) * (w / 1080);
  const ghost = (dx: number, filter: string) => {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.62;
    ctx.translate(dx, 0);
    ctx.filter = filter;
    drawVisual(ctx, clip, sourceTime, w, h);
    ctx.restore();
  };
  ghost(-shift, "grayscale(1) sepia(1) saturate(8) hue-rotate(-40deg) brightness(1.25)");
  ghost(shift, "grayscale(1) sepia(1) saturate(8) hue-rotate(160deg) brightness(1.15)");
}

function paintEffect(ctx: CanvasRenderingContext2D, effect: EffectId, w: number, h: number, local: number) {
  if (effect === "scan") scanFx(ctx, w, h, local);
  else if (effect === "flash") flashFx(ctx, w, h, local);
  else if (effect === "oldcam") oldcam(ctx, w, h, local);
  else if (effect === "noise") noiseFx(ctx, w, h, local);
  else if (effect === "burn") burnFx(ctx, w, h, local);
  else if (effect === "negative") {
    ctx.save();
    ctx.globalCompositeOperation = "difference";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else if (effect === "halftone") halftone(ctx, w, h);
}

function scanFx(ctx: CanvasRenderingContext2D, w: number, h: number, local: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  const step = Math.max(5, Math.round(h / 80));
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, Math.max(1, step * 0.28));
  const y = ((local * 0.42) % 1) * h;
  const band = Math.max(18, h * 0.075);
  const g = ctx.createLinearGradient(0, y - band, 0, y + band);
  g.addColorStop(0, "rgba(0,212,200,0)");
  g.addColorStop(0.5, "rgba(243,255,254,0.78)");
  g.addColorStop(1, "rgba(0,212,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y - band, w, band * 2);
  ctx.restore();
}

function flashFx(ctx: CanvasRenderingContext2D, w: number, h: number, local: number) {
  const phase = local % 0.48;
  if (phase > 0.16) return;
  const hit = 1 - phase / 0.16;
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${(hit * 0.92).toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function oldcam(ctx: CanvasRenderingContext2D, w: number, h: number, local: number) {
  ctx.save();
  const bar = Math.round(h * 0.07);
  ctx.fillStyle = "rgba(6,5,4,0.78)";
  ctx.fillRect(0, 0, w, bar);
  ctx.fillRect(0, h - bar, w, bar);
  ctx.fillStyle = "rgba(243,243,245,0.35)";
  const hole = Math.max(4, Math.round(Math.min(w, h) * 0.012));
  for (let x = hole; x < w; x += hole * 2.6) {
    ctx.beginPath();
    ctx.arc(x, bar * 0.5, hole * 0.42, 0, Math.PI * 2);
    ctx.arc(x, h - bar * 0.5, hole * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  const flick = 0.05 + (Math.sin(local * 23) * 0.5 + 0.5) * 0.08;
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = `rgba(255,214,160,${flick.toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  vignette(ctx, w, h, 0.85);
}

function noiseFx(ctx: CanvasRenderingContext2D, w: number, h: number, local: number) {
  if (typeof document === "undefined") return;
  const size = 64;
  if (!noiseBuf) {
    noiseBuf = document.createElement("canvas");
    noiseBuf.width = size;
    noiseBuf.height = size;
  }
  const nctx = noiseBuf.getContext("2d");
  if (!nctx) return;
  const img = nctx.createImageData(size, size);
  let s = (Math.floor(local * 18) * 9973) >>> 0;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const v = s & 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(noiseBuf, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function burnFx(ctx: CanvasRenderingContext2D, w: number, h: number, local: number) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = "rgba(255,64,12,0.62)";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "screen";
  const blow = 0.2 + Math.abs(Math.sin(local * 2.4)) * 0.22;
  ctx.fillStyle = `rgba(255,236,210,${blow.toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function halftone(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = "rgba(5,5,6,0.72)";
  const step = Math.max(10, Math.round(Math.min(w, h) / 36));
  const r = step * 0.34;
  for (let y = step * 0.5; y < h; y += step) {
    const nudge = Math.floor(y / step) % 2 === 0 ? 0 : step * 0.5;
    for (let x = nudge; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, clip: Clip, w: number, h: number, local: number) {
  const size = ((clip.fontSize ?? 64) / 1080) * w;
  const windows = motionWindows({
    duration: clip.duration,
    enter: "fade",
    leave: "fade",
    enterDur: clip.enterDur,
    leaveDur: clip.leaveDur,
  });
  let alpha = 1;
  let scale = 1;
  let dy = 0;
  let shown = clip.text ?? "";
  let glitch = 0;
  let retro = 0;
  const enterSpan = Math.max(0.12, windows.enterSpan);
  const leaveSpan = Math.max(0.12, windows.leaveSpan);
  if (clip.anim === "fade") {
    alpha = Math.min(1, local / enterSpan) * Math.min(1, (clip.duration - local) / leaveSpan);
  } else if (clip.anim === "pop") {
    const k = Math.min(1, local / enterSpan);
    scale = 0.7 + 0.3 * backOut(k);
    alpha = Math.min(1, local / Math.min(0.16, enterSpan));
  } else if (clip.anim === "slide") {
    const k = Math.min(1, local / enterSpan);
    const e = 1 - (1 - k) ** 3;
    dy = (1 - e) * h * 0.06;
    alpha = Math.min(1, k * 1.5);
  } else if (clip.anim === "type") {
    const budget = Math.min(Math.max(0.35, enterSpan), clip.duration * 0.85);
    const count = Math.floor((shown.length + 1) * Math.min(1, local / budget));
    shown = shown.slice(0, count);
    alpha = 1;
  } else if (clip.anim === "slam") {
    const k = Math.min(1, local / Math.min(0.2, enterSpan));
    const e = 1 - (1 - k) ** 3;
    scale = 1.22 - 0.22 * e;
    alpha = Math.min(1, local / 0.05);
  } else if (clip.anim === "bounce") {
    const k = Math.min(1, local / enterSpan);
    scale = 0.82 + 0.18 * backOut(k);
    alpha = Math.min(1, local / 0.08);
  } else if (clip.anim === "glitch") {
    const enterK = Math.max(0, 1 - local / enterSpan);
    const leaveK = Math.max(0, 1 - (clip.duration - local) / leaveSpan);
    const burst = Math.abs(Math.sin(local * 17.3)) > 0.84 ? 0.7 : 0;
    glitch = Math.max(enterK, leaveK, burst);
    alpha = 0.82 + 0.18 * (1 - glitch);
  } else if (clip.anim === "retro") {
    const k = Math.min(1, local / enterSpan);
    retro = 1;
    alpha = (0.55 + 0.45 * k) * (0.86 + 0.14 * Math.sin(local * 28));
    dy += Math.sin(local * 2.2) * h * 0.004;
    const out = Math.min(1, (clip.duration - local) / leaveSpan);
    alpha *= out;
  }
  const motion = clipMotion(clip, local, { skipEnter: true });
  scale *= motion.scale;
  alpha *= motion.alpha;
  dy += motion.dy * h * 0.32;
  const dx = motion.dx * w * 0.28;
  ctx.save();
  ctx.translate(w / 2 + (clip.x ?? 0) * w * 0.28 + dx, h / 2 + (clip.y ?? 0) * h * 0.32 + dy);
  const rot = (((clip.rotation ?? 0) + motion.rot) * Math.PI) / 180;
  if (Math.abs(rot) > 0.001) ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= Math.max(0, alpha);
  const face = textFont(clip);
  ctx.font = `${face.weight} ${size}px ${face.family}`;
  const track = (clip.tracking ?? 0) + (retro ? 0.04 + Math.sin(local * 3) * 0.01 : 0);
  ctx.letterSpacing = `${track * size}px`;
  ctx.textAlign = clip.align ?? "center";
  ctx.textBaseline = "middle";
  const maxW = w * 0.84;
  const lines = wrapText(ctx, shown, maxW);
  const lh = size * 1.18;
  const block = (lines.length - 1) * lh;
  const align = clip.align ?? "center";
  const x = align === "left" ? -w * 0.36 : align === "right" ? w * 0.36 : 0;
  if (clip.plate && shown) {
    const width = Math.max(...lines.map((line) => ctx.measureText(line).width), size);
    const padX = size * 0.55;
    const padY = size * 0.38;
    const left = align === "left" ? x - padX * 0.2 : align === "right" ? x - width - padX : x - width / 2 - padX;
    ctx.fillStyle = "rgba(8,8,10,0.62)";
    ctx.beginPath();
    ctx.roundRect(left, -size * 0.65 - padY * 0.2, width + padX * 1.4, block + size + padY, size * 0.28);
    ctx.fill();
  }
  paintGlyphs(ctx, clip, lines, x, block, lh, size, { glitch, retro });
  ctx.restore();
}

function paintGlyphs(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  lines: string[],
  x: number,
  block: number,
  lh: number,
  size: number,
  fx?: { glitch: number; retro: number },
) {
  const stroke = clip.stroke;
  const strokeOn = stroke !== "none";
  const widthRatio = stroke === undefined ? 0.07 : (clip.strokeWidth ?? 0);
  const fill = clip.color ?? "#f7f7f8";
  const fillOn = fill !== "transparent";
  const mode = clip.shadow ?? 0;
  const at = (draw: "stroke" | "fill", ox = 0, oy = 0) => {
    lines.forEach((line, index) => {
      const y = -block / 2 + index * lh;
      if (draw === "stroke") ctx.strokeText(line, x + ox, y + oy);
      else ctx.fillText(line, x + ox, y + oy);
    });
  };
  const clearShadow = () => {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };
  clearShadow();
  if (strokeOn && widthRatio > 0) {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(2, size * widthRatio);
    ctx.strokeStyle = stroke ?? "rgba(0,0,0,0.55)";
  }
  const glitch = fx?.glitch ?? 0;
  if (glitch > 0.04 && fillOn) {
    const shift = size * 0.07 * glitch;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "#ff3355";
    ctx.globalAlpha *= 0.85;
    at("fill", -shift, 0);
    ctx.fillStyle = "#2afff0";
    at("fill", shift, size * 0.02 * glitch);
    ctx.restore();
  }
  if (mode === 4 && fillOn) {
    const depth = Math.max(3, Math.round(size * 0.09));
    const ink = clip.shadowColor || "#1a1208";
    for (let i = depth; i >= 1; i -= 1) {
      const t = i / depth;
      ctx.fillStyle = t > 0.55 ? ink : fill;
      ctx.globalAlpha *= 1;
      at("fill", i * size * 0.012, i * size * 0.016);
    }
  }
  if (mode === 2 && fillOn) {
    ctx.fillStyle = fill;
    ctx.shadowColor = clip.shadowColor || fill;
    ctx.shadowBlur = size * 0.62;
    at("fill");
    ctx.shadowBlur = size * 0.28;
    at("fill");
    clearShadow();
    at("fill");
    if (strokeOn && widthRatio > 0) at("stroke");
    return finishRetro(ctx, fx?.retro ?? 0, block, size);
  }
  if (mode === 5 && fillOn) {
    ctx.fillStyle = fill;
    ctx.shadowColor = clip.shadowColor || "rgba(0,0,0,0.85)";
    ctx.shadowBlur = size * 0.35;
    ctx.shadowOffsetX = size * 0.12;
    ctx.shadowOffsetY = size * 0.16;
    at("fill");
    clearShadow();
  } else if (mode === 3 && fillOn) {
    ctx.fillStyle = fill;
    ctx.shadowColor = clip.shadowColor || "#0c0c0e";
    ctx.shadowOffsetX = size * 0.075;
    ctx.shadowOffsetY = size * 0.075;
    at("fill");
    clearShadow();
  } else if (mode === 1) {
    ctx.shadowColor = "rgba(0,0,0,0.78)";
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
  }
  if (strokeOn && widthRatio > 0) at("stroke");
  if (fillOn) {
    ctx.fillStyle = fill;
    at("fill");
  }
  clearShadow();
  finishRetro(ctx, fx?.retro ?? 0, block, size);
}

function finishRetro(ctx: CanvasRenderingContext2D, retro: number, block: number, size: number) {
  if (retro < 0.5) return;
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  const top = -block / 2 - size * 0.7;
  const bottom = block / 2 + size * 0.7;
  const step = Math.max(3, size * 0.16);
  for (let y = top; y < bottom; y += step) ctx.fillRect(-4000, y, 8000, Math.max(1, step * 0.28));
  ctx.restore();
}

function paintIncoming(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  time: number,
  p: number,
  w: number,
  h: number,
) {
  const k = ease(p);
  if (clip.transition === "wipe") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(0, w * k), h);
    ctx.clip();
    paint(ctx, clip, time, 1, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "slide") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.translate(w * (1 - k), 0);
    paint(ctx, clip, time, 1, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "flash") {
    paint(ctx, clip, time, 1, w, h);
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.min(1, p) * Math.PI) * 0.88;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "zoom") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    const s = 1.14 - 0.14 * k;
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, s);
    ctx.translate(-w / 2, -h / 2);
    paint(ctx, clip, time, 1, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "circle") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.hypot(w, h) * 0.62 * k, 0, Math.PI * 2);
    ctx.clip();
    paint(ctx, clip, time, 1, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "up" || clip.transition === "down") {
    ctx.save();
    ctx.beginPath();
    const band = h * k;
    ctx.rect(0, clip.transition === "up" ? h - band : 0, w, band);
    ctx.clip();
    paint(ctx, clip, time, 1, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "blur") {
    paint(ctx, clip, time, 1, w, h, `blur(${((1 - k) * 16).toFixed(1)}px)`);
    return;
  }
  if (clip.transition === "spin") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((1 - k) * 0.55);
    ctx.scale(0.82 + 0.18 * k, 0.82 + 0.18 * k);
    ctx.translate(-w / 2, -h / 2);
    paint(ctx, clip, time, k, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "glitch") {
    const bands = 4;
    for (let i = 0; i < bands; i += 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, (i / bands) * h, w, h / bands + 1);
      ctx.clip();
      const shift = (i % 2 === 0 ? 1 : -1) * (1 - k) * w * 0.05;
      ctx.translate(shift, 0);
      paint(ctx, clip, time, 1, w, h);
      ctx.restore();
    }
    return;
  }
  if (clip.transition === "black") {
    paint(ctx, clip, time, k, w, h);
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.92;
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "strobe") {
    paint(ctx, clip, time, 1, w, h);
    const blink = Math.sin(p * Math.PI * 8);
    if (blink > 0.15 && p < 0.96) {
      ctx.save();
      ctx.globalAlpha = blink * (1 - p) * 0.92;
      ctx.fillStyle = blink > 0.55 ? "#ffffff" : "#050506";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    return;
  }
  if (clip.transition === "stretch") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    const sy = 0.05 + 0.95 * k;
    ctx.translate(w / 2, h / 2);
    ctx.scale(1 + (1 - k) * 0.12, sy);
    ctx.translate(-w / 2, -h / 2);
    paint(ctx, clip, time, 1, w, h);
    ctx.restore();
    return;
  }
  if (clip.transition === "shred") {
    const bands = 8;
    for (let i = 0; i < bands; i += 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, (i / bands) * h, w, h / bands + 1);
      ctx.clip();
      const dir = i % 2 === 0 ? 1 : -1;
      ctx.translate(dir * (1 - k) * w * 0.42, 0);
      paint(ctx, clip, time, 1, w, h);
      ctx.restore();
    }
    return;
  }
  paint(ctx, clip, time, k, w, h);
}

let shotBuf: HTMLCanvasElement | null = null;
let tinyBuf: HTMLCanvasElement | null = null;

function shotOf(ctx: CanvasRenderingContext2D) {
  const src = ctx.canvas;
  if (!shotBuf) shotBuf = document.createElement("canvas");
  if (shotBuf.width !== src.width || shotBuf.height !== src.height) {
    shotBuf.width = src.width;
    shotBuf.height = src.height;
  }
  const g = shotBuf.getContext("2d");
  if (!g) return null;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, shotBuf.width, shotBuf.height);
  g.drawImage(src, 0, 0);
  return shotBuf;
}

function stampEffect(ctx: CanvasRenderingContext2D, effect: EffectId, w: number, h: number, local: number) {
  if (effect === "none") return;
  if (effect === "scan" || effect === "flash" || effect === "oldcam" || effect === "noise" || effect === "burn" || effect === "negative" || effect === "halftone") {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    paintEffect(ctx, effect, w, h, local);
    ctx.restore();
    return;
  }
  if (typeof document === "undefined") return;
  const shot = shotOf(ctx);
  if (!shot) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (effect === "pixel") {
    if (!tinyBuf) tinyBuf = document.createElement("canvas");
    tinyBuf.width = Math.max(12, Math.round(w / 36));
    tinyBuf.height = Math.max(12, Math.round(h / 36));
    const tiny = tinyBuf.getContext("2d");
    if (tiny) {
      tiny.imageSmoothingEnabled = true;
      tiny.drawImage(shot, 0, 0, tinyBuf.width, tinyBuf.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tinyBuf, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
    }
  } else if (effect === "tiles") {
    const tw = w / 3;
    const th = h / 3;
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) ctx.drawImage(shot, x * tw, y * th, tw + 1, th + 1);
    }
  } else if (effect === "mirror") {
    ctx.drawImage(shot, 0, 0, w / 2, h, 0, 0, w / 2, h);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(shot, 0, 0, w / 2, h, 0, 0, w / 2, h);
  } else if (effect === "slices") {
    const bands = 8;
    for (let i = 0; i < bands; i += 1) {
      const y = (i / bands) * h;
      const bh = h / bands + 1;
      const shift = Math.sin(local * 7 + i * 1.3) * w * 0.045 * (i % 2 === 0 ? 1 : -1);
      ctx.drawImage(shot, 0, y, w, bh, shift, y, w, bh);
    }
  } else if (effect === "blur") {
    ctx.filter = `blur(${Math.max(2, w * 0.012).toFixed(1)}px)`;
    ctx.drawImage(shot, 0, 0, w, h);
  } else if (effect === "chroma") {
    ctx.drawImage(shot, 0, 0, w, h);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.72;
    ctx.filter = "grayscale(1) sepia(1) saturate(8) hue-rotate(-40deg) brightness(1.2)";
    ctx.drawImage(shot, -w * 0.012, 0, w, h);
    ctx.filter = "grayscale(1) sepia(1) saturate(8) hue-rotate(150deg) brightness(1.15)";
    ctx.drawImage(shot, w * 0.014, 0, w, h);
  } else if (effect === "key") {
    if (!keyBuf) keyBuf = document.createElement("canvas");
    if (keyBuf.width !== w || keyBuf.height !== h) {
      keyBuf.width = w;
      keyBuf.height = h;
    }
    const g = keyBuf.getContext("2d", { willReadFrequently: true });
    if (g) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
      g.drawImage(shot, 0, 0, w, h);
      if (keyPixels(g, w, h, "#00ff00", 0.42)) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(keyBuf, 0, 0, w, h);
      }
    }
  } else if (effect === "zoom") {
    const pulse = 1 + Math.sin(local * 6) * 0.06;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(shot, 0, 0, w, h);
    ctx.restore();
  } else if (effect === "dizzy") {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(Math.sin(local * 4) * 0.04);
    ctx.scale(1.04, 1.04);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(shot, Math.sin(local * 8) * 6, 0, w, h);
    ctx.drawImage(shot, -Math.sin(local * 8) * 6, 0, w, h);
    ctx.restore();
  } else if (effect === "sharpen") {
    ctx.filter = "contrast(1.25) saturate(1.1)";
    ctx.drawImage(shot, 0, 0, w, h);
  } else if (effect === "mutation") {
    const burst = Math.sin(local * 12) > 0.7;
    ctx.drawImage(shot, 0, 0, w, h);
    if (burst) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.6;
      ctx.filter = "saturate(2) hue-rotate(40deg)";
      ctx.drawImage(shot, w * 0.01, 0, w, h);
    }
  } else {
    const recipe = recipeOf(effect);
    if (recipe) paintRecipe(ctx, shot, recipe, w, h, local);
  }
  ctx.restore();
}

function stampFx(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, clips: Clip[]) {
  const active = clips
    .filter(
      (clip) =>
        clip.type === "fx" &&
        time >= clip.start &&
        time < clip.start + clip.duration,
    )
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  for (const clip of active) {
    if (clip.filter && clip.filter !== "none") applyAdjust(ctx, clip, w, h);
    else if ((clip.brightness ?? 1) !== 1 || (clip.contrast ?? 1) !== 1 || Math.abs((clip.saturate ?? 1) - 1) > 0.015 || Math.abs(clip.temperature ?? 0) > 0.02 || Math.abs(clip.tint ?? 0) > 0.02 || (clip.wash ?? 0) > 0.01 || (clip.vignette ?? 0) > 0.01) {
      applyAdjust(ctx, clip, w, h);
    }
    if (clip.effect && clip.effect !== "none") stampEffect(ctx, clip.effect, w, h, time - clip.start);
  }
}

function applyAdjust(ctx: CanvasRenderingContext2D, clip: Clip, w: number, h: number) {
  const fx = filterOf(clip);
  if (!adjustBuf || adjustBuf.width !== w || adjustBuf.height !== h) {
    adjustBuf = document.createElement("canvas");
    adjustBuf.width = w;
    adjustBuf.height = h;
  }
  const bctx = adjustBuf.getContext("2d");
  if (!bctx) return;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.clearRect(0, 0, w, h);
  bctx.drawImage(ctx.canvas, 0, 0, w, h);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.filter = fx === "none" ? "none" : fx;
  ctx.drawImage(adjustBuf, 0, 0, w, h);
  ctx.filter = "none";
  gradeClip(ctx, clip, w, h, 0);
  ctx.restore();
}

let adjustBuf: HTMLCanvasElement | null = null;

function paintTrack(
  ctx: CanvasRenderingContext2D,
  trackId: string,
  w: number,
  h: number,
  time: number,
  clips: Clip[],
) {
  const list = clips
    .filter((clip) => clip.trackId === trackId)
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  for (let i = 0; i < list.length; i += 1) {
    const clip = list[i];
    if (!clip || clip.type === "fx") continue;
    const end = clip.start + clip.duration;
    const td =
      clip.transition === "none" ? 0 : Math.min(clip.transitionDur, Math.max(0.05, clip.duration * 0.85));
    const inTrans = td > 0 && time >= clip.start && time < clip.start + td;
    const active = time >= clip.start && time < end;
    if (!active) continue;
    if (inTrans) {
      const prev = list[i - 1];
      if (prev && clip.start - (prev.start + prev.duration) < 0.08) {
        const prevTime = Math.min(time, prev.start + prev.duration - 0.001);
        paint(ctx, prev, prevTime, 1, w, h);
      }
      paintIncoming(ctx, clip, time, (time - clip.start) / td, w, h);
    } else {
      paint(ctx, clip, time, 1, w, h);
    }
  }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  clips: Clip[],
  layers = 1,
  trackOrder?: string[],
) {
  clips = liveClips(clips);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, w, h);
  ctx.filter = "none";
  ctx.globalAlpha = 1;

  const order = trackOrder?.length
    ? [...trackOrder].reverse()
    : paintOrder(layers, clips);
  for (const trackId of order) {
    if (trackId === "a1") continue;
    const onTrack = clips.filter((clip) => clip.trackId === trackId);
    const fx = onTrack.filter((clip) => clip.type === "fx");
    const rest = onTrack.filter((clip) => clip.type !== "fx");
    if (rest.length) paintTrack(ctx, trackId, w, h, time, rest);
    if (fx.length) stampFx(ctx, w, h, time, fx);
  }
}
