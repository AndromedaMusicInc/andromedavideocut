import { makeClip, textPaint, uid, type Asset, type Clip, type EffectId, type FilterId, type TextDraft, type TransitionId } from "@/lib/editor/types";
import { findSlot } from "@/lib/editor/time";

export type DragItem =
  | { kind: "generator"; id: string; name: string }
  | { kind: "audio"; id: string; name: string }
  | { kind: "sticker"; id: string; name: string }
  | { kind: "asset"; id: string }
  | { kind: "effect"; id: EffectId; name: string }
  | { kind: "grade"; id: string; name: string }
  | { kind: "filter"; id: FilterId; name: string }
  | { kind: "transition"; id: TransitionId; name: string }
  | ({ kind: "text" } & TextDraft);

export interface DropHit {
  trackId: string | null;
  time: number;
}

export interface DragPoint {
  x: number;
  y: number;
  kind: DragItem["kind"] | "video";
}

type HitTest = (x: number, y: number) => DropHit;
type MoveListen = (point: DragPoint | null) => void;

let hitTest: HitTest | null = null;
let blockClick = false;
const moveListeners = new Set<MoveListen>();

export function registerHitTest(fn: HitTest) {
  hitTest = fn;
  return () => {
    if (hitTest === fn) hitTest = null;
  };
}

export function subscribeDragPoint(fn: MoveListen) {
  moveListeners.add(fn);
  return () => {
    moveListeners.delete(fn);
  };
}

function publish(point: DragPoint | null) {
  for (const fn of moveListeners) fn(point);
}

export function publishDrag(point: DragPoint | null) {
  publish(point);
}

let dropGap = false;

export type LaneIntent = {
  mode: "on" | "before" | "after";
  trackId: string | null;
};

let laneIntent: LaneIntent = { mode: "on", trackId: null };
type LaneResolve = (y: number) => LaneIntent;
let laneResolve: LaneResolve | null = null;
let cursorTag: HTMLDivElement | null = null;

export function setLaneIntent(value: LaneIntent) {
  laneIntent = value;
  dropGap = value.mode !== "on";
}

export function readLaneIntent(): LaneIntent {
  return laneIntent;
}

export function registerLaneResolver(fn: LaneResolve) {
  laneResolve = fn;
  return () => {
    if (laneResolve === fn) laneResolve = null;
  };
}

export function commitLaneAt(y: number) {
  if (!laneResolve) return laneIntent;
  const next = laneResolve(y);
  setLaneIntent(next);
  return next;
}

export function setCursorTag(text: string | null, x = 0, y = 0) {
  if (!text) {
    cursorTag?.remove();
    cursorTag = null;
    return;
  }
  if (!cursorTag) {
    cursorTag = document.createElement("div");
    cursorTag.style.cssText =
      "position:fixed;z-index:80;pointer-events:none;padding:4px 8px;border-radius:999px;background:var(--color-accent);color:var(--color-accent-ink);font:700 11px/1.2 sans-serif;white-space:nowrap;";
    document.body.appendChild(cursorTag);
  }
  cursorTag.textContent = text;
  cursorTag.style.left = `${x + 14}px`;
  cursorTag.style.top = `${y + 16}px`;
}

export function isDropGap() {
  return dropGap;
}

export function eatenClick() {
  if (!blockClick) return false;
  blockClick = false;
  return true;
}

export function startLibraryDrag(
  event: { clientX: number; clientY: number; button?: number; pointerId?: number; target?: EventTarget | null },
  kind: DragPoint["kind"],
  onDrop: (hit: DropHit) => void,
) {
  if (event.button != null && event.button !== 0) return;
  const originX = event.clientX;
  const originY = event.clientY;
  const origin = event.target instanceof Element ? event.target : null;
  const pointerId = event.pointerId;
  let dragging = false;
  let done = false;
  let last = { x: originX, y: originY };

  const end = (drop: { clientX: number; clientY: number } | null) => {
    if (done) return;
    done = true;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    // 0.0.15: si la etiqueta mostraba "Canal nuevo" se respeta tal cual al soltar. Recalcular aquí (con la línea de
    // inserción ya abierta, que mueve los canales) podía convertirlo en "Soltar en este canal" y la barra caía en Efectos.
    if (dragging && drop && laneIntent.mode === "on") commitLaneAt(drop.clientY);
    const hit = dragging && drop ? resolveHit(drop.clientX, drop.clientY, last) : null;
    try {
      if (origin && pointerId != null && origin.hasPointerCapture(pointerId)) origin.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
    if (hit) {
      blockClick = true;
      window.setTimeout(() => {
        blockClick = false;
      }, 0);
      onDrop(hit);
    }
    setLaneIntent({ mode: "on", trackId: null });
    setCursorTag(null);
    publish(null);
  };

  const move = (ev: PointerEvent) => {
    last = { x: ev.clientX, y: ev.clientY };
    if (!dragging) {
      if (Math.hypot(ev.clientX - originX, ev.clientY - originY) < 8) return;
      dragging = true;
      try {
        if (origin && pointerId != null) origin.setPointerCapture(pointerId);
      } catch {
        /* the gesture still follows the window */
      }
    }
    publish({ x: ev.clientX, y: ev.clientY, kind });
  };

  const up = (ev: PointerEvent) => end(ev);
  const cancel = () => end(null);

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
}

function resolveHit(x: number, y: number, last: { x: number; y: number }) {
  const direct = hitTest?.(x, y);
  if (direct && direct.time >= 0) return direct;
  const fallback = hitTest?.(last.x, last.y);
  if (fallback && fallback.time >= 0) return fallback;
  return null;
}

export function buildPlacement(
  item: DragItem,
  assets: Asset[],
  clips: Clip[],
  layers: number,
  trackHint: string | null,
  time: number,
) {
  const start = Math.max(0, time);
  if (item.kind === "transition") return null;
  if (item.kind === "effect") {
    const duration = 3;
    return {
      layers,
      clip: makeClip({
        id: uid(),
        type: "fx",
        trackId: "fx1",
        name: item.name,
        start: findSlot(clips, "fx1", start, duration),
        duration,
        effect: item.id,
      }),
    };
  }
  if (item.kind === "text") {
    return {
      layers,
      clip: makeClip({
        id: uid(),
        type: "text",
        trackId: "t1",
        name: item.name,
        start,
        duration: item.duration,
        text: item.text,
        fontSize: item.fontSize,
        anim: item.anim,
        align: item.align ?? "center",
        y: item.y ?? 0,
        ...textPaint(item),
      }),
    };
  }
  if (item.kind === "sticker") {
    return {
      layers,
      clip: makeClip({
        id: uid(),
        type: "sticker",
        trackId: "o1",
        name: item.name,
        start,
        duration: 3,
        generator: item.id,
      }),
    };
  }
  if (item.kind === "audio") {
    return {
      layers,
      clip: makeClip({
        id: uid(),
        type: "audio",
        trackId: "a1",
        name: item.name,
        start,
        duration: 8,
        generator: item.id,
        volume: 0.8,
        fadeIn: 0.08,
        fadeOut: 0.4,
      }),
    };
  }

  let duration = 5;
  let type: Clip["type"] = "generator";
  let name = "Clip";
  let generator: string | undefined;
  let assetId: string | undefined;
  if (item.kind === "generator") {
    name = item.name;
    generator = item.id;
  } else {
    const asset = assets.find((entry) => entry.id === item.id);
    if (!asset) return null;
    name = asset.name;
    assetId = asset.id;
    type = asset.kind === "audio" ? "audio" : asset.kind === "image" ? "image" : "video";
    duration = Math.min(asset.kind === "image" ? 4 : asset.duration || 5, 30);
    if (asset.kind === "audio") {
      return {
        layers,
        clip: makeClip({
          id: uid(),
          type: "audio",
          trackId: "a1",
          name,
          start,
          duration,
          assetId,
        }),
      };
    }
  }

  let nextLayers = layers;
  const trackId = "v1";
  const placedStart = findSlot(clips, trackId, start, duration);

  return {
    layers: nextLayers,
    clip: makeClip({
      id: uid(),
      type,
      trackId,
      name,
      start: placedStart,
      duration,
      generator,
      assetId,
      scale: 1,
      x: 0,
      y: 0,
    }),
  };
}
