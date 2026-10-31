import type { Clip, ClipFx } from "@/lib/editor/types";

/** 0.0.16: filtros/looks/efectos DENTRO del clip (sub-filas sombreadas). Tiempos en segundos locales al clip. */
export const FX_MIN = 0.2;
export const FX_ROW = 16;

export function bandsOf(clip: Pick<Clip, "fx">): ClipFx[] {
  return Array.isArray(clip.fx) ? clip.fx : [];
}

export function clampBand(band: ClipFx, duration: number): ClipFx {
  const len = Math.min(duration, Math.max(FX_MIN, band.end - band.start));
  const start = Math.max(0, Math.min(duration - len, band.start));
  return { ...band, start, end: start + len };
}

/** Limpia bandas de proyectos viejos o editados a mano. */
export function normalizeBands(raw: unknown, duration: number): ClipFx[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ClipFx[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Partial<ClipFx>;
    if (!b.id || (b.kind !== "filter" && b.kind !== "effect" && b.kind !== "grade")) continue;
    const start = Number(b.start) || 0;
    const end = Number.isFinite(Number(b.end)) ? Number(b.end) : duration;
    out.push(clampBand({ id: String(b.id), kind: b.kind, ref: String(b.ref ?? ""), name: String(b.name ?? "Efecto"), intensity: Math.max(0, Math.min(1, Number(b.intensity ?? 1))), start, end }, duration));
  }
  return out;
}

/** Recorte del inicio del clip: las bandas siguen pegadas al mismo contenido. */
export function trimBandsStart(bands: ClipFx[] | undefined, delta: number, duration: number) {
  if (!bands?.length) return bands;
  return bands
    .map((b) => ({ ...b, start: Math.max(0, b.start - delta), end: Math.min(duration, b.end - delta) }))
    .filter((b) => b.end - b.start >= 0.05)
    .map((b) => clampBand(b, duration));
}

export function trimBandsEnd(bands: ClipFx[] | undefined, duration: number) {
  if (!bands?.length) return bands;
  return bands.filter((b) => b.start < duration - 0.05).map((b) => ({ ...b, end: Math.min(duration, b.end) })).map((b) => clampBand(b, duration));
}

/** Dividir un clip en `at` (local): cada mitad se queda con su parte de cada banda. */
export function splitBands(bands: ClipFx[] | undefined, at: number, total: number, newId: () => string) {
  if (!bands?.length) return [bands, bands] as const;
  const left = bands.filter((b) => b.start < at - 0.05).map((b) => ({ ...b, end: Math.min(b.end, at) }));
  const right = bands
    .filter((b) => b.end > at + 0.05)
    .map((b) => ({ ...b, id: newId(), start: Math.max(0, b.start - at), end: Math.min(total - at, b.end - at) }));
  return [left, right] as const;
}

export function activeBands(clip: Pick<Clip, "fx" | "start">, time: number) {
  const local = time - clip.start;
  return bandsOf(clip).filter((b) => local >= b.start && local < b.end);
}

/** Mover (`move`) o estirar un borde de una banda, siempre dentro del clip. */
export function dragBand(band: ClipFx, mode: "move" | "start" | "end", dx: number, duration: number): ClipFx {
  if (mode === "move") {
    const len = band.end - band.start;
    const start = Math.max(0, Math.min(duration - len, band.start + dx));
    return { ...band, start, end: start + len };
  }
  if (mode === "start") return { ...band, start: Math.max(0, Math.min(band.end - FX_MIN, band.start + dx)) };
  return { ...band, end: Math.min(duration, Math.max(band.start + FX_MIN, band.end + dx)) };
}

const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";

/**
 * Clip que recibe el filtro. Arrastre: el clip visual bajo el punto de soltar en ese canal (o el de arriba en ese tiempo).
 * Clic: el clip seleccionado, o el de la capa visible más alta bajo el cabezal.
 */
export function fxTarget(clips: Clip[], opts: { trackId?: string | null; time: number; selectedId?: string | null; order?: string[] | null; fromClick?: boolean }) {
  const at = Math.max(0, opts.time);
  const under = (c: Clip) => visual(c) && at >= c.start && at < c.start + c.duration;
  if (opts.fromClick) {
    const sel = clips.find((c) => c.id === opts.selectedId);
    if (sel && visual(sel)) return sel;
  } else if (opts.trackId) {
    const hit = clips.find((c) => c.trackId === opts.trackId && under(c));
    if (hit) return hit;
  }
  const list = clips.filter(under);
  if (!list.length) return null;
  const rank = (c: Clip) => {
    const i = opts.order?.indexOf(c.trackId) ?? -1;
    return i >= 0 ? i : c.trackId === "v1" ? 1e6 : 0;
  };
  return [...list].sort((a, b) => rank(a) - rank(b))[0]!;
}
