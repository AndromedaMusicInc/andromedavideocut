// 0.0.2 (beta): clic en la biblioteca = vista previa temporal (no toca la línea de tiempo ni el proyecto).
// Solo arrastrar agrega. La vista previa se borra al hacer clic en otra parte.
import { create } from "zustand";
import { mixer, synth, SAMPLE_RATE } from "@/lib/editor/audio";
import { playback } from "@/lib/editor/playback";
import { joinClips } from "@/lib/editor/time";
import { useEditor } from "@/lib/editor/store";
import { GRADES, makeClip, textPaint, type Clip, type EffectId, type FilterId, type TextDraft, type TransitionId } from "@/lib/editor/types";

export type PreviewItem =
  | { kind: "filter"; id: FilterId; name: string }
  | { kind: "grade"; id: string; name: string }
  | { kind: "effect"; id: EffectId; name: string }
  | { kind: "transition"; id: TransitionId; name: string }
  | { kind: "text"; draft: TextDraft }
  | { kind: "sticker"; id: string; name: string }
  | { kind: "audio"; id: string; name: string };

interface S {
  item: PreviewItem | null;
  key: string;
  show: (item: PreviewItem, key: string) => void;
  clear: () => void;
}

let audioStop: (() => void) | null = null;
function stopAudio() {
  audioStop?.();
  audioStop = null;
}
async function playAudio(id: string) {
  stopAudio();
  await mixer.resume();
  const ctx = mixer.ctx;
  if (!ctx) return;
  const data = synth(id);
  const len = Math.min(data.length, SAMPLE_RATE * 4);
  const buf = ctx.createBuffer(1, len, SAMPLE_RATE);
  buf.getChannelData(0).set(data.subarray(0, len));
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.8, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + len / SAMPLE_RATE);
  src.buffer = buf;
  src.connect(g);
  g.connect(mixer.master ?? ctx.destination);
  src.start();
  audioStop = () => {
    try { src.stop(); } catch { /* ya paró */ }
  };
  src.onended = () => { if (audioStop) audioStop = null; };
}

export const useLibPreview = create<S>((set) => ({
  item: null,
  key: "",
  show: (item, key) => {
    stopAudio();
    set({ item, key });
    if (item.kind === "audio") void playAudio(item.id);
    (window as unknown as { __avcLibPreview?: string }).__avcLibPreview = key;
  },
  clear: () => {
    stopAudio();
    set({ item: null, key: "" });
    (window as unknown as { __avcLibPreview?: string }).__avcLibPreview = "";
  },
}));

/** Clic en un elemento de la biblioteca: muestra (o quita si ya estaba) la vista previa. */
export function toggleLibPreview(item: PreviewItem, key: string) {
  const s = useLibPreview.getState();
  if (s.key === key) s.clear();
  else s.show(item, key);
}

const visual = (c: Clip) => c.type === "video" || c.type === "image" || c.type === "generator";

/** Clips para dibujar con la vista previa aplicada (copia; el proyecto no cambia). */
export function withLibPreview(clips: Clip[]): Clip[] {
  const item = useLibPreview.getState().item;
  if (!item || item.kind === "audio") return clips;
  const t = playback.time;
  if (item.kind === "text") {
    const d = item.draft;
    return [...clips, makeClip({ id: "__preview", type: "text", trackId: "t1", name: d.name, start: t - 0.3, duration: Math.max(1, d.duration), text: d.text, fontSize: d.fontSize, anim: d.anim, align: d.align ?? "center", y: d.y ?? 0, ...textPaint(d) })];
  }
  if (item.kind === "sticker") return [...clips, makeClip({ id: "__preview", type: "sticker", trackId: "o1", name: item.name, start: t - 0.3, duration: 3, generator: item.id })];
  if (item.kind === "transition") {
    // La transición vive en un corte: se previsualiza en el corte más cercano (ver libPreviewTime).
    const join = previewJoin(clips, t);
    if (!join) return clips;
    return clips.map((c) => (c.id === join.id ? { ...c, transition: item.id, transitionDur: Math.max(0.35, c.transitionDur || 0.45) } : c));
  }
  const sel = useEditor.getState().selectedId;
  const selected = clips.find((c) => c.id === sel && visual(c));
  const target = selected ?? [...clips].reverse().find((c) => visual(c) && t >= c.start && t < c.start + c.duration);
  if (!target) return clips;
  let patch: Partial<Clip> = {};
  if (item.kind === "filter") patch = { filter: item.id };
  else if (item.kind === "grade") patch = (GRADES.find((g) => g.id === item.id)?.patch ?? {}) as Partial<Clip>;
  else if (item.kind === "effect") patch = { effect: item.id };
  return clips.map((c) => (c.id === target.id ? { ...c, ...patch } : c));
}

/** Corte más cercano al tiempo dado (prefiere el del clip seleccionado). */
export function previewJoin(clips: Clip[], time: number) {
  const joins = joinClips(clips);
  const sel = useEditor.getState().selectedId;
  return joins.find((c) => c.id === sel) ?? joins.sort((a, b) => Math.abs(a.start - time) - Math.abs(b.start - time))[0] ?? null;
}

/**
 * Tiempo a dibujar en el visor. Con una transición en vista previa (y en pausa) se repite
 * en bucle el tramo del corte para que se vea cómo queda; si no, el tiempo normal.
 */
export function libPreviewTime(clips: Clip[], time: number, nowMs: number) {
  const item = useLibPreview.getState().item;
  if (!item || item.kind !== "transition" || playback.playing) return time;
  const join = previewJoin(clips, time);
  if (!join) return time;
  const dur = Math.max(0.35, join.transitionDur || 0.45);
  const span = dur + 0.9;
  return join.start - 0.45 + ((nowMs / 1000) % span);
}

if (typeof window !== "undefined") {
  // Clic fuera de un elemento de la biblioteca = quitar la vista previa.
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (!useLibPreview.getState().item) return;
      const el = e.target as Element | null;
      if (el?.closest?.("[data-lib-item]")) return;
      useLibPreview.getState().clear();
    },
    true,
  );
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") useLibPreview.getState().clear();
  });
}
