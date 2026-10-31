// 0.0.15 (proyectos que no abren): un proyecto guardado por cualquier 0.0.x (o editado/recortado) se repara al
// leerlo en vez de descartarse. Antes bastaba con que faltara `clips`, `assets` no fuera una lista o un clip
// viniera sin pista para que el proyecto abriera vacío (y el autoguardado lo pisara) o el editor fallara.
import type { AspectId, Clip, ClipType } from "@/lib/editor/types";
import type { SavedProject } from "@/lib/editor/persist";

const TYPES: ClipType[] = ["video", "image", "generator", "audio", "text", "sticker", "fx"];
const ASPECTS: AspectId[] = ["9:16", "16:9", "1:1", "4:5"];
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const num = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? x : typeof x === "string" && x.trim() && Number.isFinite(Number(x)) ? Number(x) : d);
const flags = (x: unknown) => (isObj(x) ? Object.fromEntries(Object.entries(x).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean> : {});

/** Pista por defecto según el tipo (proyectos viejos sin `trackId`). */
export function defaultTrack(type: ClipType) {
  if (type === "audio") return "a1";
  if (type === "text" || type === "sticker") return "t1";
  if (type === "fx") return "fx1";
  return "v1";
}

/** Devuelve un SavedProject válido o null si `raw` no parece un proyecto. */
export function normalizeProject(raw: unknown): SavedProject | null {
  let data = raw;
  if (typeof data === "string") {
    try { data = JSON.parse(data.replace(/^\uFEFF/, "")); } catch { return null; }
  }
  if (!isObj(data)) return null;
  const looksLike = Array.isArray(data.clips) || Array.isArray(data.assets) || data.v === 1 || typeof data.name === "string";
  if (!looksLike) return null;
  const ids = new Set<string>();
  const clips: Clip[] = [];
  for (const c of Array.isArray(data.clips) ? data.clips : []) {
    if (!isObj(c) || !TYPES.includes(c.type as ClipType)) continue;
    let id = typeof c.id === "string" && c.id ? c.id : `c${clips.length}-${Math.random().toString(36).slice(2, 6)}`;
    while (ids.has(id)) id = `${id}-r`;
    ids.add(id);
    const type = c.type as ClipType;
    clips.push({
      ...(c as unknown as Clip),
      id,
      type,
      trackId: typeof c.trackId === "string" && c.trackId ? c.trackId : defaultTrack(type),
      name: typeof c.name === "string" ? c.name : "Clip",
      start: Math.max(0, num(c.start, 0)),
      duration: Math.max(0.05, num(c.duration, 1)),
    });
  }
  const assets = (Array.isArray(data.assets) ? data.assets : []).filter((a): a is SavedProject["assets"][number] => isObj(a) && typeof a.id === "string" && !!a.id);
  return {
    ...(data as unknown as SavedProject),
    v: 1,
    name: typeof data.name === "string" && data.name ? data.name : "Sin título",
    aspect: ASPECTS.includes(data.aspect as AspectId) ? (data.aspect as AspectId) : "9:16",
    clips,
    assets,
    muted: flags(data.muted),
    hidden: flags(data.hidden),
    trackOrder: Array.isArray(data.trackOrder) ? data.trackOrder.filter((t): t is string => typeof t === "string" && !!t) : undefined,
    beats: Array.isArray(data.beats) ? data.beats.filter((b): b is number => typeof b === "number" && Number.isFinite(b)) : [],
    bpm: num(data.bpm, 0),
    downbeat: num(data.downbeat, 0),
    layers: Math.max(1, Math.round(num(data.layers, 1))),
    fxCount: Math.max(1, Math.round(num(data.fxCount, 1))),
  };
}
