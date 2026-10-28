// F1-10 · Recortes de teclado: [ ] (recortar inicio/fin al cabezal), Q W (recortar y cerrar hueco), recorte por cuadro.
import type { Asset, Clip } from "@/lib/editor/types";
import { sourceLength } from "@/lib/editor/time";

export const FRAME = 1 / 30;
export const MIN_DUR = 0.2;
export type TrimOp = "start" | "end" | "rippleStart" | "rippleEnd";

const maxDur = (c: Clip, assets: Asset[], inPoint = c.inPoint) => Math.max(MIN_DUR, (sourceLength(c, assets) - inPoint) / (c.speed || 1));

/** Aplica un recorte al clip `id` en el tiempo `t`. Devuelve los clips nuevos o null si no se puede (t fuera del clip). */
export function trimAt(clips: Clip[], assets: Asset[], id: string, op: TrimOp, t: number): Clip[] | null {
  const c = clips.find((k) => k.id === id);
  if (!c) return null;
  const end = c.start + c.duration;
  if (t <= c.start + 0.001 || t >= end - 0.001) return null;
  let next: Clip;
  let shift = 0; // cuánto se corren a la izquierda los clips de después en la misma pista
  let after = end;
  if (op === "start" || op === "rippleStart") {
    const cut = Math.min(t - c.start, c.duration - MIN_DUR);
    const inPoint = c.inPoint + cut * (c.speed || 1);
    next = op === "start"
      ? { ...c, start: c.start + cut, duration: c.duration - cut, inPoint }
      : { ...c, duration: c.duration - cut, inPoint }; // Q: el clip se queda donde estaba
    if (op === "rippleStart") shift = cut;
  } else {
    const duration = Math.max(MIN_DUR, t - c.start);
    next = { ...c, duration };
    if (op === "rippleEnd") shift = c.duration - duration;
  }
  return clips.map((k) => {
    if (k.id === c.id) return next;
    if (shift > 0 && k.trackId === c.trackId && k.start >= after - 0.001) return { ...k, start: Math.max(0, k.start - shift) };
    return k;
  });
}

/** Recorte por cuadro: alarga (+1) o acorta (−1) el final del clip `frames` cuadros. */
export function nudgeEnd(clips: Clip[], assets: Asset[], id: string, frames: number): Clip[] | null {
  const c = clips.find((k) => k.id === id);
  if (!c) return null;
  const duration = Math.min(maxDur(c, assets), Math.max(MIN_DUR, c.duration + frames * FRAME));
  if (Math.abs(duration - c.duration) < 1e-6) return null;
  return clips.map((k) => (k.id === id ? { ...k, duration } : k));
}

/** El clip a recortar: el seleccionado, o el de más arriba bajo el cabezal (visual antes que audio). */
export function trimTarget(clips: Clip[], selectedId: string | null, t: number, order: string[]): Clip | null {
  const sel = clips.find((c) => c.id === selectedId);
  if (sel && t > sel.start && t < sel.start + sel.duration) return sel;
  const under = clips.filter((c) => !c.disabled && t > c.start && t < c.start + c.duration);
  under.sort((a, b) => (order.indexOf(a.trackId) - order.indexOf(b.trackId)));
  return under[0] ?? null;
}
