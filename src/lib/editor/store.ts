import { nudgeEnd, trimAt, trimTarget, type TrimOp } from "@/lib/editor/trim";
import { mixer } from "@/lib/editor/audio";
import { detectBeats, everyNth } from "@/lib/editor/beats";
import { idbPut, type SavedProject } from "@/lib/editor/persist";
import { playback } from "@/lib/editor/playback";
import { pool } from "@/lib/editor/pool";
import {
  audioWindow,
  gridOnTimeline,
  hookClip,
  layoutLyrics,
  linesFromPlan,
  lyricClips,
  parseLyrics,
  parsePlan,
  pickMusicClip,
  splitTrack,
  type LyricLine,
  type LyricStyle,
} from "@/lib/editor/reel";
import { assemblePack, STUDIO_PACKS } from "@/lib/editor/packs";
import { REEL_TEMPLATES } from "@/lib/editor/templates";
import { lookSpan } from "@/lib/editor/look-span";
import { buildPlacement, readLaneIntent, type DragItem } from "@/lib/editor/place";
import { contentEnd, findSlot, pickJoin, sourceLength } from "@/lib/editor/time";
import { fxLaneFor, insertLane, isVideoTrack, MAX_LAYERS, pruneTracks, resolveLane, restoreTrackOrder, visibleLayers } from "@/lib/editor/tracks";
import {
  DEMO_CLIPS,
  EFFECTS,
  GRADES,
  FILTERS,
  makeClip,
  textPaint,
  uid,
  type AspectId,
  type Asset,
  type Clip,
  type EffectId,
  type FilterId,
  type TextDraft,
  type ToolId,
  type TransitionId,
  TRANSITIONS,
  isTrackHidden,
  setHiddenTracks,
} from "@/lib/editor/types";
import { create } from "zustand";

export interface Hist {
  clips: Clip[];
  name: string;
  aspect: AspectId;
  layers: number;
  fxCount: number;
  trackOrder: string[];
  hidden?: Record<string, boolean>;
}

export interface EditorState {
  name: string;
  aspect: AspectId;
  clips: Clip[];
  assets: Asset[];
  time: number;
  playing: boolean;
  pps: number;
  snap: boolean;
  selectedId: string | null;
  /** Selección múltiple (Ctrl+A, Mayús/Ctrl+clic). Incluye selectedId cuando hay más de uno. */
  selectedIds: string[];
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelect: (id: string) => void;
  moveSelection: (ids: string[], origStarts: Record<string, number>, dx: number) => void;
  tool: ToolId;
  muted: Record<string, boolean>;
  /** Pistas ocultas (ojito): fuera del visor, la exportación y el audio. */
  hidden: Record<string, boolean>;
  toggleHidden: (trackId: string) => void;
  beats: number[];
  bpm: number;
  downbeat: number;
  layers: number;
  fxCount: number;
  trackOrder: string[];
  markers: number[];
  past: Hist[];
  future: Hist[];
  hydrated: boolean;
  busy: string | null;
  notice: string | null;
  setTool: (tool: ToolId) => void;
  tell: (text: string) => void;
  setPps: (pps: number) => void;
  toggleSnap: () => void;
  select: (id: string | null) => void;
  setName: (name: string) => void;
  setAspect: (aspect: AspectId) => void;
  toggleMute: (trackId: string) => void;
  patchClip: (id: string, partial: Partial<Clip>, record?: boolean) => void;
  pushHistory: (before: Hist) => void;
  snapshot: () => Hist;
  undo: () => void;
  redo: () => void;
  addClip: (clip: Clip) => void;
  addClips: (clips: Clip[]) => void;
  placePack: (id: string, prompt: string) => string;
  addGenerator: (id: string, name: string) => void;
  addAudioGen: (id: string, name: string) => void;
  addSticker: (id: string, name: string) => void;
  addText: (preset: TextDraft) => void;
  addAsset: (asset: Asset, blob?: Blob) => Promise<void>;
  removeAsset: (id: string) => void;
  splitAt: (time: number) => string;
  duplicateSelected: () => void;
  copySelected: () => void;
  /** Ids seleccionados (múltiple o el único). */
  selection: () => string[];
  cutSelected: () => void;
  hasClipboard: () => boolean;
  toggleDisabled: () => void;
  trimKey: (op: TrimOp | "nudge+" | "nudge-", t: number) => boolean;
  splitSelection: () => void;
  separateAudio: () => boolean;
  replaceAsset: (clipId: string, asset: Asset) => void;
  pasteClipboard: () => void;
  deleteSelected: () => void;
  rippleDelete: () => void;
  freezeSelected: () => void;
  reverseSelected: () => void;
  copyStyle: () => void;
  pasteStyle: () => void;
  setFilter: (id: FilterId) => void;
  setGrade: (id: string) => void;
  setEffect: (id: EffectId) => void;
  placeAdjust: (kind: "grade" | "filter" | "effect", id: string, name: string, time?: number, createTrack?: boolean, fromClick?: boolean) => void;
  setTransition: (id: TransitionId) => void;
  loadSaved: (saved: SavedProject) => void;
  setAssets: (assets: Asset[]) => void;
  patchAsset: (id: string, patch: Partial<Asset>) => void;
  clearTimeline: () => void;
  loadDemo: () => void;
  analyzeBeat: () => Promise<string>;
  setBpm: (bpm: number) => string;
  cutBeats: (every: 1 | 2 | 4, flash: boolean) => string;
  dropLyrics: (raw: string, style: LyricStyle, step: number) => string;
  placeLines: (lines: LyricLine[], style: LyricStyle) => string;
  applyVega: (raw: string) => string;
  applyTemplate: (id: string, lyrics: string) => string;
  buildReel: (raw: string, style: LyricStyle) => Promise<string>;
  addVideoLayer: () => void;
  addFxTrack: () => void;
  insertTrack: (anchor: string | null, side?: "before" | "after") => string;
  moveClipToTrack: (clipId: string, trackId: string) => void;
  addMarker: () => void;
  removeMarker: (time: number) => void;
  placeItem: (item: DragItem, trackId: string | null, time: number) => void;
}

function snap(state: EditorState): Hist {
  return {
    clips: state.clips.map((clip) => ({ ...clip })),
    name: state.name,
    aspect: state.aspect,
    layers: state.layers,
    fxCount: state.fxCount,
    trackOrder: [...state.trackOrder],
    hidden: { ...state.hidden },
  };
}

function applyHist(before: Hist | null, extra: Partial<EditorState> = {}) {
  return (state: EditorState): Partial<EditorState> => ({
    ...extra,
    past: before ? [...state.past, before].slice(-60) : state.past,
    future: before ? [] : state.future,
  });
}

function restartAudio(clips: Clip[], muted: Record<string, boolean>) {
  if (!playback.playing) return;
  mixer.playFrom(playback.time, clips, muted);
}

export const useEditor = create<EditorState>((set, get) => ({
  name: "Mi primer reel",
  aspect: "9:16",
  clips: DEMO_CLIPS,
  assets: [],
  time: 0,
  playing: false,
  pps: 68,
  snap: true,
  selectedId: "d-title",
  selectedIds: [],
  tool: "reel",
  muted: {},
  hidden: {},
  beats: [],
  bpm: 0,
  downbeat: 0,
  layers: 1,
  fxCount: 1,
  trackOrder: ["t1", "o1", "fx1", "v1", "a1"],
  markers: [],
  past: [],
  future: [],
  hydrated: false,
  busy: null,
  notice: null,
  tell: (text) => {
    set({ notice: text });
    window.setTimeout(() => {
      if (get().notice === text) set({ notice: null });
    }, 4600);
  },
  setTool: (tool) => set({ tool }),
  setPps: (pps) => set({ pps: Math.min(180, Math.max(28, pps)) }),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  select: (selectedId) => set({ selectedId, selectedIds: [] }),
  selectAll: () => {
    const ids = get().clips.map((clip) => clip.id);
    set({ selectedIds: ids, selectedId: ids[0] ?? null });
  },
  clearSelection: () => set({ selectedId: null, selectedIds: [] }),
  toggleSelect: (id) => {
    const cur = new Set(get().selectedIds.length ? get().selectedIds : get().selectedId ? [get().selectedId!] : []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    const ids = [...cur];
    set({ selectedIds: ids.length > 1 ? ids : [], selectedId: ids.includes(id) ? id : (ids[0] ?? null) });
  },
  moveSelection: (ids, origStarts, dx) => {
    // Mueve el grupo en el tiempo conservando las distancias; nadie pasa de 0.
    const min = Math.min(...ids.map((id) => origStarts[id] ?? 0));
    const d = Math.max(-min, dx);
    const set1 = new Set(ids);
    const clips = get().clips.map((clip) => (set1.has(clip.id) ? { ...clip, start: (origStarts[clip.id] ?? clip.start) + d } : clip));
    set({ clips });
  },
  setName: (name) => set({ name: name.slice(0, 48) }),
  setAspect: (aspect) => {
    const before = snap(get());
    set({ aspect, past: [...get().past, before].slice(-60), future: [] });
  },
  toggleHidden: (trackId) => {
    const before = snap(get());
    const hidden = { ...get().hidden, [trackId]: !get().hidden[trackId] };
    setHiddenTracks(hidden);
    set({ hidden, past: [...get().past, before].slice(-60), future: [] });
    restartAudio(get().clips, get().muted);
  },
  toggleMute: (trackId) => {
    const muted = { ...get().muted, [trackId]: !get().muted[trackId] };
    set({ muted });
    restartAudio(get().clips, muted);
  },
  snapshot: () => snap(get()),
  pushHistory: (before) => set((s) => ({ past: [...s.past, before].slice(-60), future: [] })),
  patchClip: (id, partial, record = true) => {
    const before = record ? snap(get()) : null;
    set((s) => ({
      clips: s.clips.map((clip) => (clip.id === id ? { ...clip, ...partial } : clip)),
      ...applyHist(before)(s),
    }));
  },
  undo: () => {
    const { past } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    const cur = snap(get());
    set({
      clips: prev.clips,
      name: prev.name,
      aspect: prev.aspect,
      layers: prev.layers,
      fxCount: prev.fxCount ?? 1,
      trackOrder: prev.trackOrder ?? ["t1", "o1", "fx1", "v1", "a1"],
      hidden: (setHiddenTracks(prev.hidden ?? {}), prev.hidden ?? {}),
      past: past.slice(0, -1),
      future: [...get().future, cur],
    });
    restartAudio(prev.clips, get().muted);
  },
  redo: () => {
    const { future } = get();
    const next = future[future.length - 1];
    if (!next) return;
    const cur = snap(get());
    set({
      clips: next.clips,
      name: next.name,
      aspect: next.aspect,
      layers: next.layers,
      fxCount: next.fxCount ?? 1,
      trackOrder: next.trackOrder ?? ["t1", "o1", "fx1", "v1", "a1"],
      hidden: (setHiddenTracks(next.hidden ?? {}), next.hidden ?? {}),
      future: future.slice(0, -1),
      past: [...get().past, cur],
    });
    restartAudio(next.clips, get().muted);
  },
  addClip: (clip) => {
    get().addClips([clip]);
  },
  addClips: (incoming) => {
    if (!incoming.length) return;
    const before = snap(get());
    const clips = [...get().clips, ...incoming];
    set({ clips, selectedId: incoming[0]?.id ?? null, past: [...get().past, before].slice(-60), future: [] });
    restartAudio(clips, get().muted);
  },
  placePack: (id, prompt) => {
    const pack = STUDIO_PACKS.find((item) => item.id === id);
    if (!pack) return "No encontré ese clip.";
    const span = 2.5 * pack.gens.length;
    const start = findSlot(get().clips, "v1", playback.time, span);
    get().addClips(assemblePack(pack, prompt, start));
    playback.setTime(start + 0.45);
    set({ time: playback.time });
    return `${pack.name} en la línea, desde ${start.toFixed(1)} s.`;
  },
  addGenerator: (id, name) => {
    const start = findSlot(get().clips, "v1", playback.time, 5);
    get().addClip(
      makeClip({
        id: uid(),
        type: "generator",
        trackId: "v1",
        name,
        start,
        duration: 5,
        generator: id,
      }),
    );
  },
  addAudioGen: (id, name) => {
    const duration = 8;
    const start = findSlot(get().clips, "a1", playback.time, duration);
    get().addClip(
      makeClip({
        id: uid(),
        type: "audio",
        trackId: "a1",
        name,
        start,
        duration,
        generator: id,
        volume: 0.8,
        fadeIn: 0.08,
        fadeOut: 0.4,
      }),
    );
  },
  addSticker: (id, name) => {
    const start = findSlot(get().clips, "o1", playback.time, 3);
    get().addClip(
      makeClip({
        id: uid(),
        type: "sticker",
        trackId: "o1",
        name,
        start,
        duration: 3,
        generator: id,
      }),
    );
  },
  addText: (preset) => {
    const start = findSlot(get().clips, "t1", playback.time, preset.duration);
    get().addClip(
      makeClip({
        id: uid(),
        type: "text",
        trackId: "t1",
        name: preset.name,
        start,
        duration: preset.duration,
        text: preset.text,
        fontSize: preset.fontSize,
        anim: preset.anim,
        align: preset.align ?? "center",
        y: preset.y ?? 0,
        ...textPaint(preset),
      }),
    );
  },
  addAsset: async (asset, blob) => {
    if (blob && asset.status !== "convirtiendo") {
      await idbPut(asset.id, blob).catch(() => get().tell("⚠ No se pudo guardar una copia del medio en el proyecto (almacenamiento lleno o archivo muy grande). Se ve ahora, pero al reabrir el proyecto habrá que importarlo otra vez."));
    }
    const before = snap(get());
    const exists = get().assets.some((item) => item.id === asset.id);
    const duration = asset.kind === "image" ? 4 : Math.min(asset.duration || 5, 30);
    const trackId = asset.kind === "audio" ? "a1" : "v1";
    const start = findSlot(get().clips, trackId, playback.time, duration);
    const clip = makeClip({
      id: uid(),
      type: asset.kind === "audio" ? "audio" : asset.kind === "image" ? "image" : "video",
      trackId,
      name: asset.name,
      start,
      duration,
      assetId: asset.id,
    });
    const clips = [...get().clips, clip];
    set({
      assets: exists ? get().assets : [...get().assets, asset],
      clips,
      selectedId: clip.id,
      past: [...get().past, before].slice(-60),
      future: [],
    });
    restartAudio(clips, get().muted);
  },
  removeAsset: (id) => {
    const before = snap(get());
    const asset = get().assets.find((item) => item.id === id);
    if (asset?.url) URL.revokeObjectURL(asset.url);
    pool.drop(id);
    // El archivo NO se borra aquí: deshacer o una versión vieja del historial lo pueden necesitar.
    const clips = get().clips.filter((clip) => clip.assetId !== id);
    set({
      assets: get().assets.filter((item) => item.id !== id),
      clips,
      selectedId: get().clips.find((c) => c.id === get().selectedId)?.assetId === id ? null : get().selectedId,
      past: [...get().past, before].slice(-60),
      future: [],
    });
    restartAudio(clips, get().muted);
  },
  splitAt: (time) => {
    const selected = get().clips.find((clip) => clip.id === get().selectedId);
    const under = get().clips.find(
      (clip) =>
        (clip.type === "video" || clip.type === "image" || clip.type === "generator") &&
        time > clip.start + 0.08 &&
        time < clip.start + clip.duration - 0.08,
    );
    const target =
      selected && time > selected.start + 0.08 && time < selected.start + selected.duration - 0.08 ? selected : under;
    if (!target) {
      get().tell("Pon la línea roja encima del clip, un poco adentro, y pulsa Dividir. La tecla es S.");
      return "No había clip bajo el cabezal.";
    }
    const before = snap(get());
    const leftDur = time - target.start;
    const next = get().clips.flatMap((clip) => {
      if (clip.id !== target.id) return [clip];
      return [
        { ...clip, duration: leftDur },
        {
          ...clip,
          id: uid(),
          start: time,
          duration: clip.duration - leftDur,
          inPoint: clip.inPoint + leftDur * clip.speed,
          transition: "none" as const,
        },
      ];
    });
    set({ clips: next, past: [...get().past, before].slice(-60), future: [] });
    restartAudio(next, get().muted);
    get().tell("Corte listo. Cada pedazo se mueve y se pinta por su lado.");
    return "Corte listo.";
  },
  duplicateSelected: () => {
    const clip = get().clips.find((item) => item.id === get().selectedId);
    if (!clip) return;
    const start = findSlot(get().clips, clip.trackId, clip.start + clip.duration, clip.duration);
    get().addClip({ ...clip, id: uid(), start });
  },
  selection: () => {
    const ids = get().selectedIds.length ? get().selectedIds : get().selectedId ? [get().selectedId!] : [];
    const have = new Set(get().clips.map((c) => c.id));
    return ids.filter((id) => have.has(id));
  },
  copySelected: () => {
    const ids = new Set(get().selection());
    const picked = get().clips.filter((item) => ids.has(item.id));
    if (!picked.length) return;
    clipboard = picked.map((c) => ({ ...c }));
  },
  cutSelected: () => {
    get().copySelected();
    get().deleteSelected();
  },
  hasClipboard: () => Boolean(clipboard?.length),
  pasteClipboard: () => {
    if (!clipboard?.length) return;
    // Pega en el cabezal conservando las distancias entre clips.
    const first = Math.min(...clipboard.map((c) => c.start));
    const before = snap(get());
    let clips = get().clips;
    const added: string[] = [];
    for (const c of clipboard) {
      const want = playback.time + (c.start - first);
      const start = findSlot(clips, c.trackId, want, c.duration);
      const id = uid();
      clips = [...clips, { ...c, id, start }];
      added.push(id);
    }
    set({ clips, selectedId: added[0] ?? null, selectedIds: added.length > 1 ? added : [], past: [...get().past, before].slice(-60), future: [] });
    restartAudio(clips, get().muted);
  },
  trimKey: (op, t) => {
    const st = get();
    const target = op === "nudge+" || op === "nudge-"
      ? st.clips.find((c) => c.id === st.selectedId) ?? null
      : trimTarget(st.clips, st.selectedId, t, st.trackOrder);
    if (!target) return false;
    const clips = op === "nudge+" || op === "nudge-"
      ? nudgeEnd(st.clips, st.assets, target.id, op === "nudge+" ? 1 : -1)
      : trimAt(st.clips, st.assets, target.id, op, t);
    if (!clips) return false;
    const before = snap(st);
    set({ clips, selectedId: target.id, past: [...st.past, before].slice(-60), future: [] });
    restartAudio(clips, get().muted);
    return true;
  },
  toggleDisabled: () => {
    const ids = new Set(get().selection());
    if (!ids.size) return;
    const before = snap(get());
    const anyOn = get().clips.some((c) => ids.has(c.id) && !c.disabled);
    const clips = get().clips.map((c) => (ids.has(c.id) ? { ...c, disabled: anyOn ? true : undefined } : c));
    set({ clips, past: [...get().past, before].slice(-60), future: [] });
    restartAudio(clips, get().muted);
  },
  splitSelection: () => {
    const ids = get().selection();
    const t = playback.time;
    if (ids.length <= 1) {
      get().splitAt(t);
      return;
    }
    const before = snap(get());
    let clips = get().clips;
    for (const id of ids) {
      const c = clips.find((x) => x.id === id);
      if (!c || t <= c.start + 0.05 || t >= c.start + c.duration - 0.05) continue;
      const left = t - c.start;
      clips = clips.flatMap((x) =>
        x.id !== id ? [x] : [{ ...x, duration: left, fadeOut: 0 }, { ...x, id: uid(), start: t, duration: x.duration - left, inPoint: x.inPoint + left * (x.speed || 1), fadeIn: 0 }],
      );
    }
    set({ clips, past: [...get().past, before].slice(-60), future: [] });
    restartAudio(clips, get().muted);
  },
  separateAudio: () => {
    const ids = new Set(get().selection());
    const vids = get().clips.filter((c) => ids.has(c.id) && c.type === "video" && c.assetId && mixer.buffers.has(c.assetId) && c.volume > 0);
    if (!vids.length) return false;
    const before = snap(get());
    let clips = get().clips;
    let track = "a1";
    for (const v of vids) {
      let start = findSlot(clips, track, v.start, v.duration);
      if (Math.abs(start - v.start) > 0.02) {
        track = get().insertTrack(track, "after");
        start = v.start;
      }
      const audio: Clip = { ...v, id: uid(), type: "audio", trackId: track, name: `${v.name} (audio)`, start, transition: "none" as Clip["transition"] };
      clips = [...clips.map((c) => (c.id === v.id ? { ...c, volume: 0 } : c)), audio];
    }
    set({ clips, past: [...get().past, before].slice(-60), future: [] });
    restartAudio(clips, get().muted);
    return true;
  },
  replaceAsset: (clipId, asset) => {
    const target = get().clips.find((c) => c.id === clipId);
    if (!target) return;
    const before = snap(get());
    const type: Clip["type"] = asset.kind === "audio" ? "audio" : asset.kind === "image" ? "image" : "video";
    const duration = asset.kind === "image" ? target.duration : Math.min(target.duration, Math.max(0.2, asset.duration || target.duration));
    const clips = get().clips.map((c) => (c.id === clipId ? { ...c, assetId: asset.id, type, name: asset.name, inPoint: 0, duration } : c));
    set({ clips, past: [...get().past, before].slice(-60), future: [] });
    restartAudio(clips, get().muted);
  },
  deleteSelected: () => {
    const id = get().selectedId;
    const many = new Set(get().selectedIds);
    if (id) many.add(id);
    if (!many.size) return;
    const before = snap(get());
    const clips = get().clips.filter((clip) => !many.has(clip.id));
    set({
      clips,
      trackOrder: pruneTracks(get().trackOrder, clips),
      selectedId: null,
      selectedIds: [],
      past: [...get().past, before].slice(-60),
      future: [],
    });
    restartAudio(clips, get().muted);
  },
  rippleDelete: () => {
    const id = get().selectedId;
    const target = get().clips.find((clip) => clip.id === id);
    if (!target) return;
    const before = snap(get());
    const gap = target.duration;
    const clips = get()
      .clips.filter((clip) => clip.id !== id)
      .map((clip) =>
        clip.trackId === target.trackId && clip.start >= target.start + target.duration - 0.01
          ? { ...clip, start: Math.max(0, clip.start - gap) }
          : clip,
      );
    set({
      clips,
      trackOrder: pruneTracks(get().trackOrder, clips),
      selectedId: null,
      past: [...get().past, before].slice(-60),
      future: [],
    });
    restartAudio(clips, get().muted);
    get().tell("Borrado y lo de atrás se corrió.");
  },
  freezeSelected: () => {
    const time = playback.time;
    const selected = get().clips.find((clip) => clip.id === get().selectedId);
    const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";
    const target =
      selected && visual(selected) && time >= selected.start && time < selected.start + selected.duration
        ? selected
        : get().clips.find((clip) => visual(clip) && time >= clip.start && time < clip.start + clip.duration);
    if (!target) {
      get().tell("Pon el cabezal encima del video y congela.");
      return;
    }
    const hold = 1.4;
    const before = snap(get());
    const local = time - target.start;
    const frozen = makeClip({
      ...target,
      id: uid(),
      name: `${target.name} congelado`,
      start: time,
      duration: hold,
      inPoint: target.inPoint + local * (target.speed || 1),
      speed: 0.02,
      transition: "none",
    });
    const clips = get().clips.flatMap((clip) => {
      if (clip.id !== target.id) return [clip];
      const left = time - clip.start;
      const right = clip.start + clip.duration - time;
      const parts: Clip[] = [];
      if (left > 0.08) parts.push({ ...clip, duration: left });
      parts.push(frozen);
      if (right > 0.08) {
        parts.push({
          ...clip,
          id: uid(),
          start: time + hold,
          duration: right,
          inPoint: clip.inPoint + local * (clip.speed || 1),
          transition: "none",
        });
      }
      return parts;
    });
    set({ clips, selectedId: frozen.id, past: [...get().past, before].slice(-60), future: [] });
    get().tell("Congelado 1.4 s. Puedes alargarlo en la línea.");
  },
  reverseSelected: () => {
    const target = get().clips.find((clip) => clip.id === get().selectedId);
    if (!target || (target.type !== "video" && target.type !== "image" && target.type !== "generator")) {
      get().tell("Selecciona un video para invertirlo.");
      return;
    }
    const speed = target.speed || 1;
    const sourceSpan = target.duration * Math.abs(speed);
    get().patchClip(target.id, {
      speed: -speed,
      inPoint: speed > 0 ? target.inPoint + sourceSpan : Math.max(0, target.inPoint - sourceSpan),
    });
    get().tell(speed > 0 ? "Invertido." : "Otra vez hacia adelante.");
  },
  copyStyle: () => {
    const clip = get().clips.find((item) => item.id === get().selectedId);
    if (!clip) return;
    styleClipboard = {
      filter: clip.filter,
      effect: clip.effect,
      brightness: clip.brightness,
      contrast: clip.contrast,
      saturate: clip.saturate,
      temperature: clip.temperature,
      tint: clip.tint,
      wash: clip.wash,
      vignette: clip.vignette,
      enter: clip.enter,
      middle: clip.middle,
      leave: clip.leave,
      enterDur: clip.enterDur,
      leaveDur: clip.leaveDur,
    };
    get().tell("Estilo copiado. Selecciona otro clip y pega el estilo.");
  },
  pasteStyle: () => {
    if (!styleClipboard) {
      get().tell("Primero copia el estilo de un clip.");
      return;
    }
    const id = get().selectedId;
    if (!id) return;
    get().patchClip(id, styleClipboard);
    get().tell("Estilo pegado.");
  },
  setFilter: (id) => {
    if (id === "none") {
      get().tell("Para quitar un filtro, borra su barra en la pista de efectos.");
      return;
    }
    const name = FILTERS.find((item) => item.id === id)?.name ?? "Filtro";
    get().placeAdjust("filter", id, name, playback.time, false, true);
  },
  setGrade: (id) => {
    const grade = GRADES.find((item) => item.id === id);
    if (!grade) return;
    get().placeAdjust("grade", id, grade.name, playback.time, false, true);
  },
  setEffect: (id) => {
    const before = snap(get());
    if (id === "none") {
      const selected = get().clips.find((clip) => clip.id === get().selectedId);
      const t = playback.time;
      const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";
      const clips = get().clips.flatMap((clip) => {
        if (clip.type === "fx" && t >= clip.start && t < clip.start + clip.duration) return [];
        if (selected?.id === clip.id && selected.type === "fx") return [];
        if (visual(clip) && clip.effect !== "none") {
          const covers =
            (selected && visual(selected) && clip.id === selected.id) ||
            (!selected && clip.trackId === "v1" && t >= clip.start && t < clip.start + clip.duration);
          if (covers) return [{ ...clip, effect: "none" as const }];
        }
        return [clip];
      });
      set({
        clips,
        selectedId: null,
        past: [...get().past, before].slice(-60),
        future: [],
      });
      return;
    }
    const name = EFFECTS.find((item) => item.id === id)?.name ?? "Efecto";
    const selected = get().clips.find((clip) => clip.id === get().selectedId);
    const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";
    const target =
      selected && visual(selected)
        ? selected
        : get().clips.find(
            (clip) => visual(clip) && playback.time >= clip.start && playback.time < clip.start + clip.duration,
          );
    if (id === "key") {
      if (!target) {
        get().tell("Selecciona el video y luego quita el fondo. Funciona mejor con verde o azul detrás.");
        return;
      }
      const clips = get().clips.map((clip) =>
        clip.id === target.id
          ? { ...clip, effect: "key" as const, keyColor: clip.keyColor || "#00ff00", keyTol: clip.keyTol ?? 0.42 }
          : clip,
      );
      set({
        clips,
        selectedId: target.id,
        past: [...get().past, before].slice(-60),
        future: [],
      });
      get().tell("Fondo verde fuera. Si queda un halo, sube la tolerancia en Ajustes.");
      return;
    }
    // 0.0.12: el clic en un efecto crea la barra fx encima del video (mismo camino que filtros y looks),
    // en la pista de efectos real y cubriendo el clip bajo el cabezal o el seleccionado.
    get().placeAdjust("effect", id, name, playback.time, false, true);
  },
  placeAdjust: (kind, id, name, time, forceNew = false, fromClick = false) => {
    const before = snap(get());
    const at = Math.max(0, time ?? playback.time);
    const span = fromClick ? lookSpan(get().clips, at, get().selectedId) : null;
    const duration = span ? span.duration : 4;
    let trackId: string;
    let start: number;
    const intent = readLaneIntent();
    if (!fromClick && (forceNew || intent.mode !== "on")) {
      trackId = takeLane(forceNew);
      start = findSlot(get().clips, trackId, at, duration);
    } else {
      // 0.0.13: encima del video en el mismo tiempo; si está ocupado, canal nuevo arriba (no se corre a la derecha).
      const pref = !fromClick && intent.trackId && !isVideoTrack(intent.trackId) ? intent.trackId : null;
      start = span ? span.start : at;
      const lane = fxLaneFor(get().trackOrder, get().clips, start, duration, pref);
      if (lane.created) set({ trackOrder: lane.order });
      trackId = lane.trackId;
    }
    const base = makeClip({
      id: uid(),
      type: "fx",
      trackId,
      name,
      start,
      duration,
      effect: "none",
    });
    if (kind === "grade") {
      const grade = GRADES.find((item) => item.id === id);
      if (grade) Object.assign(base, grade.patch);
    } else if (kind === "filter") {
      base.filter = id as FilterId;
    } else {
      base.effect = id as EffectId;
    }
    const clips = [...get().clips, base];
    set({
      clips,
      trackOrder: get().trackOrder,
      selectedId: base.id,
      past: [...get().past, before].slice(-60),
      future: [],
    });
    if (fromClick) get().tell(`${name} encima del video. Arrastra los bordes de la barra para elegir el tramo.`);
    else get().tell(readLaneIntent().mode === "on" && !forceNew ? `${name} en el canal.` : `${name} en un canal nuevo.`);
  },
  setTransition: (id) => {
    const selected = get().clips.find((clip) => clip.id === get().selectedId);
    const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";
    const target =
      selected && visual(selected)
        ? selected
        : get().clips.find(
            (clip) => visual(clip) && playback.time >= clip.start && playback.time < clip.start + clip.duration,
          );
    if (!target) return;
    get().patchClip(target.id, {
      transition: id,
      transitionDur: id === "none" ? target.transitionDur : Math.max(0.35, target.transitionDur),
    });
    set({ selectedId: target.id });
  },
  loadSaved: (saved) => {
    const clips = (saved.clips ?? []).filter((c) => c && c.id && c.type).map((c) => makeClip({ ...c, name: c.name ?? "Clip", start: Number(c.start) || 0, duration: Number(c.duration) || 1 }));
    set({
      name: saved.name || "Sin título",
      aspect: saved.aspect || "9:16",
      // Completa campos que falten (proyectos viejos o editados a mano) para que nada se rompa.
      clips,
      trackOrder: restoreTrackOrder(saved.trackOrder, clips),
      muted: saved.muted ?? {},
      hidden: (setHiddenTracks(saved.hidden ?? {}), saved.hidden ?? {}),
      assets: (saved.assets ?? []).map((asset) => ({ ...asset })),
      beats: saved.beats ?? [],
      bpm: saved.bpm ?? 0,
      downbeat: saved.downbeat ?? 0,
      layers: saved.layers ?? 1,
      fxCount: saved.fxCount ?? 1,
      past: [],
      future: [],
      selectedId: null,
      selectedIds: [],
    });
  },
  setAssets: (assets) => set({ assets }),
  patchAsset: (id, patch) => set({ assets: get().assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
  clearTimeline: () => {
    const before = snap(get());
    set({
      clips: [],
      selectedId: null,
      past: [...get().past, before].slice(-60),
      future: [],
    });
    restartAudio([], get().muted);
  },
  loadDemo: () => {
    const before = snap(get());
    set({
      clips: DEMO_CLIPS.map((clip) => ({ ...clip })),
      selectedId: "d-title",
      past: [...get().past, before].slice(-60),
      future: [],
    });
  },
  analyzeBeat: async () => {
    const found = await readGrid();
    if (!found.ok) {
      get().tell(found.message);
      return found.message;
    }
    set({ beats: found.beats, bpm: found.bpm, downbeat: found.downbeat });
    get().tell(found.message);
    return found.message;
  },
  setBpm: (value) => {
    const bpm = Math.round(Math.min(200, Math.max(60, value || 0)));
    if (bpm < 60) return "Pon un BPM entre 60 y 200.";
    const end = Math.max(contentEnd(get().clips), 8);
    const step = 60 / bpm;
    const beats: number[] = [];
    for (let time = 0; time < end; time += step) beats.push(Number(time.toFixed(3)));
    set({ bpm, beats, downbeat: 0 });
    get().tell(`${bpm} BPM. ${beats.length} marcas en la línea.`);
    return `${bpm} BPM listo.`;
  },
  cutBeats: (every, flash) => {
    const { beats, downbeat } = get();
    if (beats.length < 2) return "Primero detecta el beat.";
    const before = snap(get());
    const clips = splitTrack(get().clips, everyNth(beats, downbeat, every), "v1", flash);
    set({ clips, past: [...get().past, before].slice(-60), future: [] });
    return `Cortado cada ${every} beats.`;
  },
  dropLyrics: (raw, style, step) => {
    const lines = parseLyrics(raw);
    if (!lines.length) return "Pega la letra primero.";
    const music = pickMusicClip(get().clips, get().selectedId);
    const end = music ? music.start + music.duration : Math.max(contentEnd(get().clips), 8);
    const laid = layoutLyrics(lines, get().beats, { start: music?.start ?? 0, end }, step || 2);
    const before = snap(get());
    const clips = [...get().clips.filter((clip) => clip.role !== "lyric"), ...lyricClips(laid, style)];
    set({ clips, past: [...get().past, before].slice(-60), future: [] });
    return `${lines.length} frases en la línea.`;
  },
  placeLines: (lines, style) => {
    const usable = lines.filter((line) => line.text.trim());
    if (!usable.length) return "No había líneas.";
    const music = pickMusicClip(get().clips, get().selectedId);
    const end = music ? music.start + music.duration : Math.max(contentEnd(get().clips), 8);
    const laid = layoutLyrics(usable, get().beats, { start: music?.start ?? 0, end }, 2);
    const before = snap(get());
    const clips = [...get().clips.filter((clip) => clip.role !== "lyric"), ...lyricClips(laid, style)];
    set({ clips, past: [...get().past, before].slice(-60), future: [] });
    return `${usable.length} líneas colocadas.`;
  },
  applyVega: (raw) => {
    const parsed = parsePlan(raw);
    if (!parsed.plan) return parsed.error || "Plan inválido.";
    const plan = parsed.plan;
    const before = snap(get());
    let { beats, bpm, downbeat, aspect } = get();
    if ((!beats.length || plan.bpm) && plan.bpm && plan.bpm >= 60 && plan.bpm <= 200) {
      bpm = plan.bpm;
      downbeat = 0;
      beats = [];
      const end = Math.max(contentEnd(get().clips), 8);
      const step = 60 / bpm;
      for (let time = 0; time < end; time += step) beats.push(Number(time.toFixed(3)));
    }
    if (plan.aspect) aspect = plan.aspect;
    let clips = get().clips.map((clip) => ({ ...clip }));
    if (plan.filter) {
      clips = clips.map((clip) =>
        clip.type === "video" || clip.type === "image" || clip.type === "generator" ? { ...clip, filter: plan.filter! } : clip,
      );
    }
    const lines = linesFromPlan(plan);
    if (lines.length) {
      const music = pickMusicClip(clips, get().selectedId);
      const end = music ? music.start + music.duration : Math.max(contentEnd(clips), 8);
      const span = { start: music?.start ?? 0, end };
      clips = clips.filter((clip) => clip.role !== "lyric");
      clips.push(...lyricClips(layoutLyrics(lines, beats, span, plan.every || 2), plan.style ?? "pie"));
    }
    if (plan.title) clips.push(hookClip(plan.title));
    if (plan.cuts?.length) clips = splitTrack(clips, plan.cuts, "v1", Boolean(plan.flash));
    else if (plan.every) clips = splitTrack(clips, everyNth(beats, downbeat, plan.every), "v1", Boolean(plan.flash));
    set({
      clips,
      beats,
      bpm,
      downbeat,
      aspect,
      past: [...get().past, before].slice(-60),
      future: [],
    });
    return "Plan aplicado.";
  },
  applyTemplate: (id, lyrics) => {
    const template = REEL_TEMPLATES.find((item) => item.id === id);
    if (!template) return "No encontré esa plantilla.";
    const before = snap(get());
    const result = template.apply({
      clips: get().clips,
      beats: get().beats,
      downbeat: get().downbeat,
      lyrics,
      name: get().name,
    });
    set({ clips: result.clips, past: [...get().past, before].slice(-60), future: [] });
    return result.message;
  },
  buildReel: async (raw, style) => {
    const beat = await get().analyzeBeat();
    const lyrics = get().dropLyrics(raw, style, 2);
    return `${beat} ${lyrics}`;
  },
  addVideoLayer: () => {
    const current = visibleLayers(get().layers, get().clips);
    if (current >= MAX_LAYERS) return;
    const before = snap(get());
    set({ layers: current + 1, past: [...get().past, before].slice(-60), future: [] });
  },
  addFxTrack: () => {
    const before = snap(get());
    const placed = insertLane(get().trackOrder, "v1", "before");
    set({
      trackOrder: placed.order,
      past: [...get().past, before].slice(-60),
      future: [],
    });
  },
  insertTrack: (anchor, side = "before") => {
    const placed = insertLane(get().trackOrder, anchor, side);
    set({ trackOrder: placed.order });
    return placed.id;
  },
  moveClipToTrack: (clipId, trackId) => {
    const before = snap(get());
    set({
      clips: get().clips.map((clip) => (clip.id === clipId ? { ...clip, trackId } : clip)),
      past: [...get().past, before].slice(-60),
      future: [],
    });
  },
  addMarker: () => {
    const time = Number(playback.time.toFixed(2));
    const markers = [...get().markers];
    if (markers.some((item) => Math.abs(item - time) < 0.08)) return;
    markers.push(time);
    markers.sort((a, b) => a - b);
    set({ markers });
    get().tell(`Marca en ${time.toFixed(1)} s.`);
  },
  removeMarker: (time) => {
    set({ markers: get().markers.filter((item) => Math.abs(item - time) > 0.08) });
  },
  placeItem: (item, trackId, time) => {
    if (item.kind === "transition") {
      dropTransition(item.id, time);
      return;
    }
    if (item.kind === "grade" || item.kind === "filter") {
      get().placeAdjust(item.kind, item.id, item.name, time);
      return;
    }
    const before = snap(get());
    if (item.kind === "effect") {
      // 0.0.13: un efecto soltado sobre el video (o en un canal ocupado) va encima, alineado con el clip bajo el drop.
      const intent = readLaneIntent();
      if (intent.mode === "on" || !intent.trackId) {
        const at = Math.max(0, time);
        const onClip = get().clips.find(
          (c) => c.trackId === trackId && (c.type === "video" || c.type === "image" || c.type === "generator") && at >= c.start && at < c.start + c.duration,
        );
        const start = onClip ? onClip.start : at;
        const duration = onClip ? Math.min(8, Math.max(1.2, onClip.duration)) : 3;
        const pref = trackId && !isVideoTrack(trackId) && trackId !== "a1" ? trackId : null;
        const lane = fxLaneFor(get().trackOrder, get().clips, start, duration, pref);
        const clip = makeClip({ id: uid(), type: "fx", trackId: lane.trackId, name: item.name, start, duration, effect: item.id as EffectId });
        set({
          clips: [...get().clips, clip],
          trackOrder: lane.order,
          selectedId: clip.id,
          past: [...get().past, before].slice(-60),
          future: [],
        });
        return;
      }
    }
    const dest = takeLane(false, trackId);
    const placed = buildPlacement(item, get().assets, get().clips, get().layers, dest, time);
    if (!placed) {
      set({ trackOrder: before.trackOrder });
      return;
    }
    if (dest) {
      placed.clip.trackId = dest;
      placed.clip.start = findSlot(get().clips, dest, Math.max(0, time), placed.clip.duration);
    }
    const clips = [...get().clips, placed.clip];
    set({
      clips,
      layers: placed.layers,
      trackOrder: get().trackOrder,
      selectedId: placed.clip.id,
      past: [...get().past, before].slice(-60),
      future: [],
    });
    restartAudio(clips, get().muted);
  },
}));

function takeLane(forceNew: boolean, fallback: string | null = null) {
  const api = useEditor.getState();
  const resolved = resolveLane(api.trackOrder, readLaneIntent(), forceNew, fallback);
  if (resolved.created) useEditor.setState({ trackOrder: resolved.order });
  return resolved.trackId;
}

function applyLookAt(item: { kind: "grade"; id: string; name: string } | { kind: "filter"; id: FilterId; name: string }, time: number) {
  const api = useEditor.getState();
  const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";
  const target = api.clips.find((clip) => visual(clip) && time >= clip.start && time < clip.start + clip.duration);
  if (!target) {
    api.tell("Suelta el look encima de un video.");
    return;
  }
  const span = Math.min(3, Math.max(0.6, target.duration));
  const from = Math.max(target.start, time);
  const to = Math.min(target.start + target.duration, from + span);
  if (to - from < 0.35) {
    api.tell("Ese tramo es muy corto.");
    return;
  }
  const before = snap(api);
  const pieces: Clip[] = [];
  for (const clip of api.clips) {
    if (clip.id !== target.id) {
      pieces.push(clip);
      continue;
    }
    const left = from - clip.start;
    const right = clip.start + clip.duration - to;
    if (left > 0.12) {
      pieces.push({ ...clip, duration: left });
    }
    const midStart = left > 0.12 ? from : clip.start;
    const midDur = to - midStart;
    const mid: Clip = {
      ...clip,
      id: left > 0.12 ? uid() : clip.id,
      start: midStart,
      duration: midDur,
      inPoint: clip.inPoint + (midStart - clip.start) * (clip.speed || 1),
      transition: "none",
    };
    if (item.kind === "grade") {
      const grade = GRADES.find((entry) => entry.id === item.id);
      if (grade) Object.assign(mid, grade.patch);
    } else {
      mid.filter = item.id;
    }
    pieces.push(mid);
    if (right > 0.12) {
      pieces.push({
        ...clip,
        id: uid(),
        start: to,
        duration: right,
        inPoint: clip.inPoint + (to - clip.start) * (clip.speed || 1),
        transition: "none",
      });
    }
  }
  const applied = pieces.find((clip) => visual(clip) && time >= clip.start && time < clip.start + clip.duration);
  useEditor.setState({
    clips: pieces,
    selectedId: applied?.id ?? target.id,
    past: [...api.past, before].slice(-60),
    future: [],
  });
  api.tell(`${item.name} en ese tramo. Ajusta brillo y color en Ajustes.`);
}

async function readGrid(): Promise<
  { ok: true; bpm: number; beats: number[]; downbeat: number; message: string } | { ok: false; message: string }
> {
  const state = useEditor.getState();
  const clip = pickMusicClip(state.clips, state.selectedId);
  if (!clip) return { ok: false, message: "Añade el audio de la canción primero." };
  await mixer.resume();
  const windowed = audioWindow(clip);
  if (!windowed || windowed.samples.length < windowed.rate * 0.4) {
    return { ok: false, message: "No pude leer el audio. Vuelve a soltar el archivo." };
  }
  const grid = detectBeats(windowed.samples, windowed.rate);
  if (grid.beats.length < 2) return { ok: false, message: "No encontré un ritmo claro en esa pista." };
  const placed = gridOnTimeline(grid, clip);
  return { ok: true, ...placed, message: `${placed.bpm} BPM · ${placed.beats.length} beats` };
}

export function selectedClip(state: EditorState) {
  return state.clips.find((clip) => clip.id === state.selectedId) ?? null;
}

function dropTransition(id: TransitionId, time: number) {
  const api = useEditor.getState();
  const best = pickJoin(api.clips, time, api.pps);
  if (!best) {
    api.tell("Suelta la transición en el corte entre dos clips seguidos de la misma pista.");
    return;
  }
  api.patchClip(best.id, {
    transition: id,
    transitionDur: id === "none" ? best.transitionDur : Math.max(0.35, best.transitionDur || 0.45),
  });
  api.select(best.id);
  const name = TRANSITIONS.find((t) => t.id === id)?.name ?? "Transición";
  api.tell(`${name} en el corte de ${best.start.toFixed(1)} s.`);
}

export { pickJoin };

export function limitDuration(clip: Clip, duration: number, assets: Asset[]) {
  const max = Math.max(0.2, (sourceLength(clip, assets) - clip.inPoint) / (clip.speed || 1));
  return Math.min(Math.max(0.2, duration), max);
}

export { contentEnd };

let clipboard: Clip[] | null = null;
let styleClipboard: Partial<Clip> | null = null;

if (typeof window !== "undefined") {
  // Solo lectura, para pruebas y diagnóstico.
  (window as unknown as { __avcClips?: () => unknown }).__avcClips = () => useEditor.getState().clips.map((c) => ({ id: c.id, type: c.type, trackId: c.trackId, assetId: c.assetId, filter: c.filter, effect: c.effect, start: c.start, duration: c.duration }));
}
if (typeof window !== "undefined") {
  (window as unknown as { __avcAssets?: () => unknown }).__avcAssets = () => useEditor.getState().assets.map((a) => ({ id: a.id, name: a.name, kind: a.kind, duration: a.duration, thumb: Boolean(a.thumb), status: (a as { status?: string }).status, error: a.error, waveform: Boolean(a.waveform), audioOk: a.audioOk, audioError: a.audioError, codec: a.codec, proxy: a.proxy }));
}
if (typeof window !== "undefined") (window as unknown as { __avcBusy?: () => unknown }).__avcBusy = () => useEditor.getState().busy;

// 0.0.3: el visor necesita un <video>/<img> por medio importado. Antes nadie llamaba a pool.warm(), así que los
// videos e imágenes importados se veían en Medios pero el visor los dibujaba en blanco.
if (typeof window !== "undefined") {
  pool.warm(useEditor.getState().assets);
  useEditor.subscribe((s, p) => {
    if (s.assets !== p.assets) pool.warm(s.assets);
  });
}
if (typeof window !== "undefined") (window as unknown as { __avcEditor?: unknown }).__avcEditor = useEditor;
