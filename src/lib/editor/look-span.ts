import type { Clip } from "@/lib/editor/types";

const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";

function spanOf(target: Clip) {
  return { start: target.start, duration: Math.min(8, Math.max(1.2, target.duration)), target };
}

/**
 * Tramo por defecto de un filtro/look/efecto puesto con clic: el clip visual seleccionado, si no el que está bajo el
 * cabezal (en cualquier canal visual, también los "Canal" creados al arrastrar). 0.0.14: si el cabezal no está sobre
 * ningún clip se usa el clip seleccionado, el tramo de la barra fx seleccionada o el siguiente clip visual (antes la
 * barra quedaba en el cabezal, lejos del clip).
 */
export function lookSpan(clips: Clip[], time: number, selectedId: string | null = null) {
  const selected = clips.find((clip) => clip.id === selectedId);
  const under = (clip: Clip) => time >= clip.start && time < clip.start + clip.duration;
  const target =
    (selected && visual(selected) && under(selected) ? selected : null) ??
    clips.find((clip) => visual(clip) && clip.trackId === "v1" && under(clip)) ??
    clips.find((clip) => visual(clip) && under(clip)) ??
    (selected && visual(selected) ? selected : null);
  if (!target && selected?.type === "fx") return { start: selected.start, duration: selected.duration, target: null };
  // Cabezal en un hueco sin selección: el siguiente clip visual (si no hay, 3 s desde el cabezal).
  const next = target ? null : clips.filter((clip) => visual(clip) && clip.start >= time).sort((a, b) => a.start - b.start)[0];
  if (next) return spanOf(next);
  if (!target) return { start: Math.max(0, time), duration: 3, target: null };
  return spanOf(target);
}

/** 0.0.14: tramo de una barra fx soltada con arrastre: el clip visual bajo el punto de soltar (primero en ese canal). */
export function dropSpan(clips: Clip[], trackId: string | null, time: number, fallback = 4) {
  const at = Math.max(0, time);
  const under = (clip: Clip) => visual(clip) && at >= clip.start && at < clip.start + clip.duration;
  const target = clips.find((clip) => under(clip) && clip.trackId === trackId) ?? clips.find(under);
  return target ? spanOf(target) : { start: at, duration: fallback, target: null };
}
