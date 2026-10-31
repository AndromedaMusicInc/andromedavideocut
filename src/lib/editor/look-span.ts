import type { Clip } from "@/lib/editor/types";

const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";

function spanOf(target: Clip) {
  return { start: target.start, duration: Math.min(8, Math.max(1.2, target.duration)), target };
}

/** Clip visual bajo `time`; con `order` gana el de la capa visible más alta (la que se ve en el visor). */
function topUnder(clips: Clip[], time: number, order: string[] | null) {
  const under = clips.filter((clip) => visual(clip) && time >= clip.start && time < clip.start + clip.duration);
  if (!under.length) return null;
  const rank = (clip: Clip) => {
    if (order?.length) {
      const i = order.indexOf(clip.trackId);
      if (i >= 0) return i;
    }
    // Sin orden: los canales de video más altos (v2, v3…) y los "Canal" van encima de la Base (v1).
    return clip.trackId === "v1" ? 1e6 : 0;
  };
  return [...under].sort((a, b) => rank(a) - rank(b))[0]!;
}

/**
 * Tramo por defecto de un filtro/look/efecto puesto con clic.
 * 0.0.15: si hay una barra fx seleccionada bajo el cabezal se reutiliza su tramo (dos clics seguidos quedan alineados;
 * antes la barra seleccionada se descartaba y la segunda se alineaba con la Base). El clip bajo el cabezal es el de la
 * capa visible más alta, no siempre v1.
 */
export function lookSpan(clips: Clip[], time: number, selectedId: string | null = null, order: string[] | null = null) {
  const at = Math.max(0, time);
  const selected = clips.find((clip) => clip.id === selectedId);
  const under = (clip: Clip) => at >= clip.start && at < clip.start + clip.duration;
  if (selected?.type === "fx" && under(selected)) return { start: selected.start, duration: selected.duration, target: null };
  const target =
    (selected && visual(selected) && under(selected) ? selected : null) ??
    topUnder(clips, at, order) ??
    (selected && visual(selected) ? selected : null);
  if (!target && selected?.type === "fx") return { start: selected.start, duration: selected.duration, target: null };
  const next = target ? null : clips.filter((clip) => visual(clip) && clip.start >= at).sort((a, b) => a.start - b.start)[0];
  if (next) return spanOf(next);
  if (!target) return { start: at, duration: 3, target: null };
  return spanOf(target);
}

/** Tramo de una barra fx soltada con arrastre: el clip visual bajo el punto de soltar (primero en ese canal). */
export function dropSpan(clips: Clip[], trackId: string | null, time: number, fallback = 4, order: string[] | null = null) {
  const at = Math.max(0, time);
  const target = clips.find((clip) => visual(clip) && clip.trackId === trackId && at >= clip.start && at < clip.start + clip.duration) ?? topUnder(clips, at, order);
  return target ? spanOf(target) : { start: at, duration: fallback, target: null };
}

/**
 * 0.0.15: el cabezal tiene que quedar dentro de la barra recién puesta para que el visor muestre el filtro/efecto.
 * Antes la barra caía en otro tramo (p. ej. 0–4 s con el cabezal en 9.3 s) y el visor no cambiaba.
 */
export function playheadInto(time: number, start: number, duration: number) {
  if (time >= start && time < start + duration) return time;
  return start;
}

/** 0.0.15: qué aplica una barra fx (antes mostraba siempre "Efecto: Sin efecto" para filtros y looks). */
export function fxKindOf(clip: Pick<Clip, "filter" | "effect">) {
  if (clip.effect && clip.effect !== "none") return "effect" as const;
  if (clip.filter && clip.filter !== "none") return "filter" as const;
  return "look" as const;
}

