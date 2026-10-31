import type { Clip, TrackDef } from "@/lib/editor/types";

export const MAX_LAYERS = 4;
export const MAX_FX = 4;

export function isVideoTrack(id: string) {
  return /^v\d+$/.test(id);
}

export function isFxTrack(id: string) {
  return /^fx\d+$/.test(id);
}

export function videoIds(layers: number) {
  const count = Math.min(MAX_LAYERS, Math.max(1, layers));
  return Array.from({ length: count }, (_, index) => `v${index + 1}`);
}

export function fxIds(clips: Pick<Clip, "trackId">[]) {
  let max = 1;
  for (const clip of clips) {
    if (isFxTrack(clip.trackId)) max = Math.max(max, Number(clip.trackId.slice(2)));
  }
  return Array.from({ length: Math.min(MAX_FX, max) }, (_, index) => `fx${index + 1}`);
}

export function visibleLayers(layers: number, clips: Pick<Clip, "trackId">[]) {
  let max = Math.max(1, layers);
  for (const clip of clips) {
    if (isVideoTrack(clip.trackId)) max = Math.max(max, Number(clip.trackId.slice(1)));
  }
  return Math.min(MAX_LAYERS, max);
}

export function nextLaneId(order: string[]) {
  const used = new Set(order);
  let n = 1;
  while (used.has(`lane${n}`)) n += 1;
  return `lane${n}`;
}

export function insertLane(order: string[], anchor: string | null, side: "before" | "after") {
  const id = nextLaneId(order);
  const next = [...order];
  const at = anchor ? next.indexOf(anchor) : -1;
  if (at < 0) {
    if (side === "after") next.push(id);
    else next.unshift(id);
  } else {
    next.splice(side === "after" ? at + 1 : at, 0, id);
  }
  return { order: next, id };
}

const BASE_TRACKS = new Set(["t1", "o1", "fx1", "v1", "a1"]);

export function pruneTracks(order: string[], clips: { trackId: string }[]) {
  const used = new Set(clips.map((clip) => clip.trackId));
  return order.filter((id) => BASE_TRACKS.has(id) || used.has(id) || /^v\d+$/.test(id));
}

export const DEFAULT_TRACK_ORDER = ["t1", "o1", "fx1", "v1", "a1"];

/**
 * 0.0.7: orden de canales al abrir un proyecto guardado. Antes no se guardaba: los clips en canales creados al
 * arrastrar (lane1, lane2…) o en v2… quedaban fuera del orden, no se dibujaban ni sonaban (visor negro) y además se
 * heredaba el orden del proyecto anterior. Usa el orden guardado si existe y agrega cualquier canal con clips que falte
 * (encima del video principal, como al crearlo).
 */
export function restoreTrackOrder(saved: string[] | undefined, clips: { trackId: string }[]) {
  const base = Array.isArray(saved) && saved.length ? saved.filter((id) => typeof id === "string" && id) : DEFAULT_TRACK_ORDER;
  const order = [...new Set(base)];
  for (const id of DEFAULT_TRACK_ORDER) if (!order.includes(id)) order.push(id);
  const missing = [...new Set(clips.map((c) => c.trackId))].filter((id) => id && !order.includes(id));
  if (missing.length) order.splice(Math.max(0, order.indexOf("v1")), 0, ...missing);
  return pruneTracks(order, clips);
}

export const LANE_EDGE = 12;
/** Al arrastrar a la línea de tiempo: px junto a la raya entre canales que cuentan como "insertar canal nuevo". */
export const LANE_INSERT_EDGE = 6;

export type LaneBand = { id: string; top: number; bottom: number };

export function laneIntentFromBands(
  bands: LaneBand[],
  y: number,
  sticky: { mode: "before" | "after"; trackId: string } | null,
  edge = LANE_EDGE,
) {
  if (!bands.length) return sticky ?? { mode: "on" as const, trackId: null as string | null };
  const first = bands[0]!;
  const last = bands[bands.length - 1]!;
  if (y < first.top + edge) return { mode: "before" as const, trackId: first.id };
  if (y > last.bottom - edge) return { mode: "after" as const, trackId: last.id };
  for (const band of bands) {
    if (y < band.top || y > band.bottom) continue;
    if (y <= band.top + edge) return { mode: "before" as const, trackId: band.id };
    if (y >= band.bottom - edge) return { mode: "after" as const, trackId: band.id };
    return { mode: "on" as const, trackId: band.id };
  }
  for (let i = 0; i < bands.length - 1; i += 1) {
    const above = bands[i]!;
    const below = bands[i + 1]!;
    if (y > above.bottom && y < below.top) {
      if (sticky && ((sticky.mode === "after" && sticky.trackId === above.id) || (sticky.mode === "before" && sticky.trackId === below.id))) {
        return sticky;
      }
      return { mode: "before" as const, trackId: below.id };
    }
  }
  return sticky ?? { mode: "on" as const, trackId: first.id };
}

export function laneIntentAt(
  rows: LaneBand[],
  slot: { top: number; bottom: number } | null,
  y: number,
  sticky: { mode: "before" | "after"; trackId: string } | null,
) {
  if (slot && sticky && y >= slot.top && y <= slot.bottom) return sticky;
  const shift = slot ? Math.max(0, slot.bottom - slot.top) : 0;
  const cy = slot && y > slot.bottom ? y - shift : y;
  const bands = rows.map((row) => {
    const delta = slot && row.top >= slot.top - 1 ? shift : 0;
    return { id: row.id, top: row.top - delta, bottom: row.bottom - delta };
  });
  return laneIntentFromBands(bands, cy, sticky);
}

export function resolveLane(
  order: string[],
  intent: { mode: "on" | "before" | "after"; trackId: string | null },
  forceNew: boolean,
  fallback: string | null,
) {
  if (forceNew || intent.mode === "before" || intent.mode === "after") {
    const side: "before" | "after" = forceNew || intent.mode !== "after" ? "before" : "after";
    const anchor = forceNew ? (order.includes("v1") ? "v1" : null) : intent.trackId;
    const placed = insertLane(order, anchor, side);
    return { order: placed.order, trackId: placed.id, created: true as const };
  }
  const trackId =
    intent.trackId && order.includes(intent.trackId)
      ? intent.trackId
      : fallback && order.includes(fallback)
        ? fallback
        : order.includes("fx1")
          ? "fx1"
          : (order[0] ?? "v1");
  return { order, trackId, created: false as const };
}

export function timelineTracks(layers: number, fxCount: number): TrackDef[] {
  const ids = videoIds(layers);
  const videos = [...ids].reverse().map((id) => ({
    id,
    type: "video" as const,
    name: ids.length === 1 ? "Video" : id === "v1" ? "Base" : `Capa ${id.slice(1)}`,
  }));
  const count = Math.min(MAX_FX, Math.max(1, fxCount));
  const effects = Array.from({ length: count }, (_, index) => `fx${count - index}`).map((id, index) => ({
    id,
    type: "overlay" as const,
    name: count === 1 ? "Efectos" : `Canal ${count - index}`,
  }));
  return [
    { id: "t1", type: "text", name: "Texto" },
    { id: "o1", type: "overlay", name: "Overlay" },
    ...effects,
    ...videos,
    { id: "a1", type: "audio", name: "Audio" },
  ];
}

export function paintOrder(layers: number, clips: Pick<Clip, "trackId">[]) {
  const ids = new Set(videoIds(visibleLayers(layers, clips)));
  const sorted = [...ids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return [...sorted, "o1", "t1"];
}

/**
 * 0.0.13: canal para una barra fx (efecto, filtro o look) que debe quedar ENCIMA del video en el mismo tiempo.
 * Antes se usaba findSlot en un canal fijo: si el tramo estaba ocupado la barra se corría a la derecha ("al lado")
 * y al soltarla sobre el video caía en el propio canal de video. Ahora busca un canal de efectos libre en ese tramo
 * (los que están arriba del primer canal de video) y, si no hay, crea uno nuevo arriba de ellos. Nunca corre el tiempo.
 */
/** 0.0.14: canal con clips visuales (o canal de video): nunca recibe barras fx. */
export function isVisualLane(id: string, clips: Pick<Clip, "trackId" | "type">[]) {
  return isVideoTrack(id) || clips.some((c) => c.trackId === id && c.type !== "fx");
}

export function fxLaneFor(
  order: string[],
  clips: Pick<Clip, "trackId" | "start" | "duration" | "type">[],
  start: number,
  duration: number,
  preferred: string | null = null,
) {
  const free = (id: string) =>
    !clips.some((c) => c.trackId === id && start < c.start + c.duration - 0.02 && start + duration > c.start + 0.02);
  const onlyFx = (id: string) => clips.every((c) => c.trackId !== id || c.type === "fx");
  const firstVideo = order.findIndex((id) => isVideoTrack(id));
  const above = firstVideo < 0 ? order : order.slice(0, firstVideo);
  const lanes = above.filter((id) => isFxTrack(id) || (/^lane\d+$/.test(id) && onlyFx(id)));
  if (preferred && lanes.includes(preferred) && free(preferred)) return { order, trackId: preferred, created: false };
  for (let i = lanes.length - 1; i >= 0; i -= 1) {
    if (free(lanes[i]!)) return { order, trackId: lanes[i]!, created: false };
  }
  const anchor = lanes[0] ?? (firstVideo >= 0 ? order[firstVideo]! : null);
  const placed = insertLane(order, anchor, "before");
  return { order: placed.order, trackId: placed.id, created: true };
}
