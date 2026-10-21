import type { Asset, Clip } from "@/lib/editor/types";

export function contentEnd(clips: Clip[]) {
  let end = 0;
  for (const clip of clips) end = Math.max(end, clip.start + clip.duration);
  return end;
}

export function timelineSpan(clips: Clip[]) {
  return Math.max(14, contentEnd(clips) + 3);
}

export function formatTime(t: number) {
  const clamped = Math.max(0, t);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  const f = Math.floor((clamped % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${f}`;
}

export function findSlot(clips: Clip[], trackId: string, want: number, duration: number) {
  let start = Math.max(0, want);
  const same = clips.filter((c) => c.trackId === trackId).sort((a, b) => a.start - b.start);
  for (let guard = 0; guard < 24; guard += 1) {
    const hit = same.find(
      (c) => start < c.start + c.duration - 0.02 && start + duration > c.start + 0.02,
    );
    if (!hit) return start;
    start = hit.start + hit.duration;
  }
  return start;
}

export function sourceLength(clip: Clip, assets: Asset[]) {
  if (clip.assetId) {
    const asset = assets.find((item) => item.id === clip.assetId);
    if (asset && asset.duration > 0) return asset.duration;
  }
  if (clip.type === "audio" && clip.generator) return 120;
  if (clip.type === "audio") return 12;
  if (clip.type === "text" || clip.type === "sticker" || clip.type === "generator" || clip.type === "fx") return 600;
  return 30;
}

export function audioEnvelope(clip: Clip, time: number) {
  const local = time - clip.start;
  if (local < 0 || local >= clip.duration) return 0;
  let gain = 1;
  if (clip.fadeIn > 0) gain *= Math.min(1, local / clip.fadeIn);
  if (clip.fadeOut > 0) gain *= Math.min(1, (clip.duration - local) / clip.fadeOut);
  return gain;
}

export function snapTo(time: number, points: number[], pps: number) {
  const threshold = 8 / Math.max(pps, 1);
  let best = time;
  let bestDist = threshold;
  for (const point of points) {
    const dist = Math.abs(point - time);
    if (dist <= bestDist) {
      best = point;
      bestDist = dist;
    }
  }
  return best;
}
