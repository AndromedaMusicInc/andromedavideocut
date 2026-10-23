import { useClipMenu } from "@/components/editor/ClipMenu";
import { mixer, waveformUrl } from "@/lib/editor/audio";
import { pause, seek } from "@/lib/editor/engine";
import { playback } from "@/lib/editor/playback";
import { registerHitTest, subscribeDragPoint, setLaneIntent, readLaneIntent, publishDrag, commitLaneAt, registerLaneResolver, setCursorTag, type DragPoint } from "@/lib/editor/place";
import { limitDuration, useEditor } from "@/lib/editor/store";
import { formatTime, findSlot, snapMove, snapTo, timelineSpan } from "@/lib/editor/time";
import { laneIntentFromBands, pruneTracks } from "@/lib/editor/tracks";
import type { Clip } from "@/lib/editor/types";
import { TRANSITIONS } from "@/lib/editor/types";
import { cn } from "@/lib/cn";
import { Blend, Bookmark, Copy, Magnet, Pause, Plus, Repeat, Scissors, Trash2, Undo2, Redo2, Volume2, VolumeX, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export function Timeline() {
  const clips = useEditor((s) => s.clips);
  const pps = useEditor((s) => s.pps);
  const setPps = useEditor((s) => s.setPps);
  const snap = useEditor((s) => s.snap);
  const toggleSnap = useEditor((s) => s.toggleSnap);
  const splitAt = useEditor((s) => s.splitAt);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const rippleDelete = useEditor((s) => s.rippleDelete);
  const freezeSelected = useEditor((s) => s.freezeSelected);
  const reverseSelected = useEditor((s) => s.reverseSelected);
  const copyStyle = useEditor((s) => s.copyStyle);
  const pasteStyle = useEditor((s) => s.pasteStyle);
  const addFxTrack = useEditor((s) => s.addFxTrack);
  const addMarker = useEditor((s) => s.addMarker);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const selectedId = useEditor((s) => s.selectedId);
  const scroller = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragPoint | null>(null);
  const [ghostTime, setGhostTime] = useState(0);
  const [gap, setGap] = useState<string | null>(null);
  const [ghostSpan, setGhostSpan] = useState(4);
  const trackOrder = useEditor((s) => s.trackOrder);
  const rows = trackOrder.map((id) => ({
    id,
    name: trackLabel(id),
    type: id.startsWith("a") ? "audio" as const : id.startsWith("t") ? "text" as const : "overlay" as const,
  }));
  const width = timelineSpan(clips) * pps + 48;
  const bands: Array<
    | { kind: "track"; id: string; name: string }
    | { kind: "insert"; key: string; mode: "before" | "after"; anchor: string }
  > = [];
  for (const track of rows) {
    if (gap === `before:${track.id}`) {
      bands.push({ kind: "insert", key: `b:${track.id}`, mode: "before", anchor: track.id });
    }
    bands.push({ kind: "track", id: track.id, name: track.name });
    if (gap === `after:${track.id}`) {
      bands.push({ kind: "insert", key: `a:${track.id}`, mode: "after", anchor: track.id });
    }
  }

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const follow = () => {
      const ppsNow = useEditor.getState().pps;
      const x = playback.time * ppsNow;
      const pad = 32;
      if (x < box.scrollLeft + pad || x > box.scrollLeft + box.clientWidth - pad) {
        box.scrollLeft = Math.max(0, x - box.clientWidth * 0.3);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const current = useEditor.getState().pps;
      useEditor.getState().setPps(current + (event.deltaY < 0 ? 10 : -10));
    };
    const stop = playback.subscribe(follow);
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stop();
      box.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    return registerHitTest((x, y) => {
      const el = document.elementFromPoint(x, y);
      if (!el?.closest("[data-timeline]")) return { trackId: null, time: -1 };
      const trackId = el?.closest("[data-track]")?.getAttribute("data-track") ?? null;
      const box = scroller.current;
      const ppsNow = useEditor.getState().pps;
      let time = playback.time;
      if (box) {
        const rect = box.getBoundingClientRect();
        time = Math.max(0, (x - rect.left + box.scrollLeft) / ppsNow);
      }
      return { trackId, time };
    });
  }, []);

  useEffect(() => {
    let hold: { y: number; mode: "on" | "before" | "after"; trackId: string | null } | null = null;
    const resolve = (y: number) => {
      const slotEl = document.querySelector("[data-timeline] .lanes [data-insert]") as HTMLElement | null;
      if (slotEl) {
        const slot = slotEl.getBoundingClientRect();
        if (y >= slot.top - 16 && y <= slot.bottom + 16) {
          const mode = (slotEl.getAttribute("data-insert-mode") === "after" ? "after" : "before") as "before" | "after";
          const trackId = slotEl.getAttribute("data-insert-anchor");
          if (trackId) {
            hold = { y, mode, trackId };
            return { mode, trackId };
          }
        }
      }
      const rowsEl = [...document.querySelectorAll("[data-timeline] .lanes [data-track]")] as HTMLElement[];
      const rows = rowsEl.map((el) => {
        const rect = el.getBoundingClientRect();
        return { id: el.getAttribute("data-track") || "", top: rect.top, bottom: rect.bottom };
      });
      const decided = laneIntentFromBands(rows, y, null, slotEl ? 8 : 14);
      if (hold && hold.mode !== "on" && decided.mode === "on" && Math.abs(y - hold.y) < 12) {
        return { mode: hold.mode, trackId: hold.trackId };
      }
      hold = { y, mode: decided.mode, trackId: decided.trackId };
      return decided;
    };
    const unregister = registerLaneResolver(resolve);
    let lastPoint: DragPoint | null = null;
    let frame = 0;
    const edgeScroll = () => {
      const point = lastPoint;
      const row = scroller.current?.parentElement;
      if (!point || !row) {
        frame = 0;
        return;
      }
      const rect = row.getBoundingClientRect();
      const before = row.scrollTop;
      if (point.y > rect.bottom - 56) row.scrollTop += 22;
      else if (point.y < rect.top + 36) row.scrollTop -= 22;
      if (row.scrollTop !== before) {
        const shell = document.querySelector("[data-timeline]")?.getBoundingClientRect();
        const inside = Boolean(shell && point.x >= shell.left && point.x <= shell.right && point.y >= shell.top && point.y <= shell.bottom);
        if (inside && point.kind !== "transition") {
          const intent = resolve(point.y);
          setLaneIntent(intent);
          setGap(intent.mode === "on" || !intent.trackId ? null : `${intent.mode}:${intent.trackId}`);
          setHot(intent.mode === "on" ? intent.trackId : null);
        }
      }
      frame = window.requestAnimationFrame(edgeScroll);
    };
    const unsubscribe = subscribeDragPoint((point) => {
      lastPoint = point;
      if (point && !frame) frame = window.requestAnimationFrame(edgeScroll);
      if (!point) {
        hold = null;
        setHot(null);
        setDrag(null);
        setGap(null);
        setCursorTag(null);
        return;
      }
      const shell = document.querySelector("[data-timeline]")?.getBoundingClientRect();
      const inside = Boolean(
        shell && point.x >= shell.left && point.x <= shell.right && point.y >= shell.top && point.y <= shell.bottom,
      );
      const box = scroller.current;
      const ppsNow = useEditor.getState().pps;
      if (box) {
        const rect = box.getBoundingClientRect();
        const raw = Math.max(0, (point.x - rect.left + box.scrollLeft) / ppsNow);
        const state = useEditor.getState();
        if (point.kind === "transition") setGhostTime(nearestJoin(state.clips, raw));
        else if (point.kind === "video") {
          const selected = state.clips.find((clip) => clip.id === state.selectedId);
          setGhostTime(selected ? selected.start : raw);
          setGhostSpan(selected ? selected.duration : 4);
        } else {
          setGhostTime(raw);
          setGhostSpan(4);
        }
      }
      if (!inside || point.kind === "transition") {
        setLaneIntent({ mode: "on", trackId: null });
        setGap(null);
        setHot(null);
        setDrag(point);
        setCursorTag(point.kind === "transition" ? "Soltar en el corte" : "Suelta en la línea de tiempo", point.x, point.y);
        return;
      }
      const intent = resolve(point.y);
      setLaneIntent(intent);
      setGap(intent.mode === "on" || !intent.trackId ? null : `${intent.mode}:${intent.trackId}`);
      setHot(intent.mode === "on" ? intent.trackId : null);
      setDrag(point);
      setCursorTag(intent.mode === "on" ? "Soltar en este canal" : "Canal nuevo", point.x, point.y);
    });
    return () => {
      lastPoint = null;
      hold = null;
      unregister();
      unsubscribe();
      if (frame) window.cancelAnimationFrame(frame);
      setCursorTag(null);
    };
  }, []);

  useEffect(() => {
    if (!gap) return;
    const slot = document.querySelector("[data-timeline] .lanes [data-insert]") as HTMLElement | null;
    const row = scroller.current?.parentElement;
    if (!slot || !row) return;
    const slotRect = slot.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (slotRect.bottom > rowRect.bottom - 4) row.scrollTop += slotRect.bottom - rowRect.bottom + 12;
    else if (slotRect.top < rowRect.top + 4) row.scrollTop -= rowRect.top - slotRect.top + 12;
  }, [gap]);

  function timeAt(clientX: number) {
    const el = scroller.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const raw = Math.max(0, (clientX - rect.left + el.scrollLeft) / pps);
    const state = useEditor.getState();
    if (!state.snap) return raw;
    const points = [0, playback.time, ...state.beats];
    for (const clip of state.clips) points.push(clip.start, clip.start + clip.duration);
    return snapTo(raw, points, pps);
  }

  return (
    <section data-timeline="" data-tracks={trackOrder.join(" ")} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-line bg-surface">
      <div data-toolbar="" className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-line px-2 [scrollbar-width:thin]">
        <Tool icon={Scissors} label="Dividir" onClick={() => splitAt(playback.time)} />
        <button
          type="button"
          onClick={addFxTrack}
          className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted hover:text-fg"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Canal</span>
        </button>
        <Tool icon={Pause} label="Congelar" onClick={freezeSelected} />
        <Tool icon={Repeat} label="Invertir" onClick={reverseSelected} disabled={!selectedId} />
        <Tool icon={Copy} label="Duplicar" onClick={duplicateSelected} disabled={!selectedId} />
        <Tool icon={Trash2} label="Borrar" onClick={deleteSelected} disabled={!selectedId} />
        <Tool icon={Trash2} label="Borrar y correr" onClick={rippleDelete} disabled={!selectedId} />
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool icon={Copy} label="Copiar estilo" onClick={copyStyle} disabled={!selectedId} />
        <Tool icon={Blend} label="Pegar estilo" onClick={pasteStyle} disabled={!selectedId} />
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool icon={Undo2} label="Deshacer" onClick={undo} />
        <Tool icon={Redo2} label="Rehacer" onClick={redo} />
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <button
          type="button"
          onClick={toggleSnap}
          className={cn(
            "inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm",
            snap ? "text-accent" : "text-muted",
          )}
          aria-pressed={snap}
        >
          <Magnet className="size-4" />
          <span className="hidden sm:inline">Imán</span>
        </button>
        <BeatReadout />
        <TempoBox />
        <button
          type="button"
          onClick={addMarker}
          className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted hover:text-fg"
        >
          <Bookmark className="size-4" />
          <span className="hidden sm:inline">Marca</span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="grid size-11 place-items-center text-muted" onClick={() => setPps(pps - 12)} aria-label="Alejar">
            <ZoomOut className="size-4" />
          </button>
          <button type="button" className="grid size-11 place-items-center text-muted" onClick={() => setPps(pps + 12)} aria-label="Acercar">
            <ZoomIn className="size-4" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="w-24 shrink-0 border-r border-line sm:w-28">
          <div className="h-7 border-b border-line" />
          {bands.map((band) =>
            band.kind === "insert" ? (
              <div
                key={band.key}
                className="flex h-10 items-center bg-accent px-2 text-[10px] font-semibold text-accent-ink"
              >
                Nuevo
              </div>
            ) : (
              <TrackHeader key={band.id} id={band.id} name={band.name} />
            ),
          )}
        </div>
        <div
          ref={scroller}
          className="scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return;
            pause();
            seek(timeAt(event.clientX));
            useEditor.getState().select(null);
          }}
        >
          <div className="lanes relative" style={{ width }}>
            <Ruler
              pps={pps}
              span={timelineSpan(clips)}
              onSeek={(clientX) => {
                pause();
                seek(timeAt(clientX));
              }}
            />
            {bands.map((band) =>
              band.kind === "insert" ? (
                <div
                  key={band.key}
                  data-insert=""
                  data-insert-mode={band.mode}
                  data-insert-anchor={band.anchor}
                  className="relative h-10 border-y-2 border-accent bg-accent/30"
                >
                  <span className="pointer-events-none absolute top-1 right-2 z-10 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-ink">
                    Canal nuevo
                  </span>
                  {drag ? <GhostBar pps={pps} time={ghostTime} span={ghostSpan} /> : null}
                </div>
              ) : (
                <div
                  key={band.id}
                  data-track={band.id}
                  className={cn("relative h-10 border-b border-line", hot === band.id && "bg-accent/20 ring-1 ring-inset ring-accent")}
                  onPointerDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    pause();
                    seek(timeAt(event.clientX));
                    useEditor.getState().select(null);
                  }}
                >
                  {hot === band.id && drag ? (
                    <span className="pointer-events-none absolute top-0 left-2 z-10 rounded-b bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">
                      Soltar aquí
                    </span>
                  ) : null}
                  {drag && hot === band.id && drag.kind !== "video" ? <GhostBar pps={pps} time={ghostTime} span={ghostSpan} /> : null}
                  {clips
                    .filter((clip) => clip.trackId === band.id)
                    .map((clip) => (
                      <ClipView key={clip.id} clip={clip} pps={pps} parked={gap != null} />
                    ))}
                  <Joins trackId={band.id} pps={pps} />
                </div>
              ),
            )}
            <Playhead pps={pps} />
          </div>
        </div>
      </div>
    </section>
  );
}

function GhostBar({ pps, time, span }: { pps: number; time: number; span: number }) {
  return (
    <div
      className="pointer-events-none absolute top-1 bottom-1 rounded-sm bg-accent/60 ring-1 ring-accent"
      style={{ left: Math.max(0, time) * pps, width: Math.max(28, span * pps) }}
    />
  );
}

function trackLabel(id: string) {
  if (id === "t1") return "Texto";
  if (id === "o1") return "Overlay";
  if (id === "a1") return "Audio";
  if (id === "v1") return "Base";
  if (id.startsWith("v")) return `Capa ${id.slice(1)}`;
  if (id === "fx1") return "Efectos";
  return "Canal";
}

function nearestJoin(clips: Clip[], time: number) {
  let best = time;
  let bestDist = 0.55;
  for (const clip of clips) {
    if (clip.type !== "video" && clip.type !== "image" && clip.type !== "generator") continue;
    if (clip.start < 0.05) continue;
    const dist = Math.abs(clip.start - time);
    if (dist < bestDist) {
      best = clip.start;
      bestDist = dist;
    }
  }
  return best;
}

function Joins({ trackId, pps }: { trackId: string; pps: number }) {
  const clips = useEditor((s) => s.clips);
  if (!/^v\d+$/.test(trackId)) return null;
  const row = clips
    .filter(
      (clip) =>
        clip.trackId === trackId &&
        (clip.type === "video" || clip.type === "image" || clip.type === "generator"),
    )
    .sort((a, b) => a.start - b.start);
  const marks: Clip[] = [];
  for (let i = 1; i < row.length; i += 1) {
    const prev = row[i - 1];
    const cur = row[i];
    if (!prev || !cur) continue;
    if (cur.start - (prev.start + prev.duration) > 0.25) continue;
    marks.push(cur);
  }
  return (
    <>
      {marks.map((clip) => {
        const on = clip.transition !== "none";
        const named = TRANSITIONS.find((item) => item.id === clip.transition)?.name ?? "Corte";
        // 0.0.2 (beta): sin "+" que agrega solo; el fundido se pone arrastrándolo desde Fundidos.
        if (!on) return null;
        return (
          <button
            key={clip.id}
            type="button"
            title={on ? named : "Poner fundido entre estos dos"}
            aria-label={on ? named : "Poner fundido"}
            className={cn(
              "absolute top-1/2 z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-sm font-semibold",
              on ? "bg-accent text-accent-ink" : "bg-raised text-accent ring-1 ring-accent",
            )}
            style={{ left: clip.start * pps }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              useEditor.getState().select(clip.id);
            }}
          >
            {on ? <Blend className="size-3.5" /> : "+"}
          </button>
        );
      })}
    </>
  );
}

function Tool({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Scissors;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-sm text-fg hover:bg-raised disabled:text-faint"
    >
      <Icon className="size-4 shrink-0" />
      <span className="hidden whitespace-nowrap xl:inline">{label}</span>
    </button>
  );
}

function TrackHeader({ id, name }: { id: string; name: string }) {
  const muted = useEditor((s) => Boolean(s.muted[id]));
  const toggleMute = useEditor((s) => s.toggleMute);
  return (
    <button
      type="button"
      onClick={() => toggleMute(id)}
      className="flex h-10 w-full items-center justify-between px-2 text-xs text-muted"
      data-track={id}
      aria-pressed={muted}
    >
      <span className="truncate">{name}</span>
      {id === "t1" || id === "fx1" ? null : muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
    </button>
  );
}

function Ruler({
  pps,
  span,
  onSeek,
}: {
  pps: number;
  span: number;
  onSeek: (clientX: number) => void;
}) {
  const step = pps > 110 ? 1 : pps > 60 ? 2 : 5;
  const ticks = [];
  for (let second = 0; second <= span; second += step) ticks.push(second);
  return (
    <div
      className="relative h-7 border-b border-line"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onSeek(event.clientX);
        const move = (ev: PointerEvent) => onSeek(ev.clientX);
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
    >
      {ticks.map((second) => (
        <div key={second} className="absolute top-0 h-full border-l border-line" style={{ left: second * pps }}>
          <span className="pl-1 text-xs text-faint tabular-nums">{formatTime(second).slice(0, -2)}</span>
        </div>
      ))}
      <BeatMarks pps={pps} />
      <MarkerMarks pps={pps} />
    </div>
  );
}

function TempoBox() {
  const bpm = useEditor((s) => s.bpm);
  const setBpm = useEditor((s) => s.setBpm);
  const analyze = useEditor((s) => s.analyzeBeat);
  const cut = useEditor((s) => s.cutBeats);
  const [value, setValue] = useState(bpm ? String(bpm) : "");
  useEffect(() => {
    if (bpm) setValue(String(bpm));
  }, [bpm]);
  return (
    <div className="flex items-center gap-1">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={() => {
          if (value) setBpm(Number(value));
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            if (value) setBpm(Number(value));
            event.currentTarget.blur();
          }
        }}
        inputMode="numeric"
        placeholder="BPM"
        aria-label="BPM"
        className="h-9 w-14 rounded-md border border-line bg-sunken px-1.5 text-center text-sm text-fg"
      />
      <button type="button" onClick={() => setBpm(Math.max(60, (bpm || 100) - 1))} className="grid size-9 place-items-center rounded-md text-muted hover:bg-raised" aria-label="Bajar BPM">
        −
      </button>
      <button type="button" onClick={() => setBpm(Math.min(200, (bpm || 100) + 1))} className="grid size-9 place-items-center rounded-md text-muted hover:bg-raised" aria-label="Subir BPM">
        +
      </button>
      <button type="button" onClick={() => void analyze()} className="hidden h-9 rounded-md px-2 text-xs text-muted hover:bg-raised sm:inline" title="Detectar tempo">
        Detectar
      </button>
      <button type="button" onClick={() => cut(1, false)} className="hidden h-9 rounded-md px-2 text-xs text-muted hover:bg-raised lg:inline">
        Cortar
      </button>
    </div>
  );
}

function BeatReadout() {
  const bpm = useEditor((s) => s.bpm);
  if (!bpm) return null;
  return <span className="hidden text-xs font-medium text-accent tabular-nums sm:inline">{bpm} BPM</span>;
}

function MarkerMarks({ pps }: { pps: number }) {
  const markers = useEditor((s) => s.markers);
  const remove = useEditor((s) => s.removeMarker);
  if (!markers.length) return null;
  return (
    <>
      {markers.map((time) => (
        <button
          key={time}
          type="button"
          className="absolute top-0 h-full w-2 -translate-x-1/2"
          style={{ left: time * pps }}
          onClick={() => remove(time)}
          aria-label="Quitar marca"
        >
          <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-amber-400" />
        </button>
      ))}
    </>
  );
}

function BeatMarks({ pps }: { pps: number }) {
  const beats = useEditor((s) => s.beats);
  if (!beats.length) return null;
  return (
    <>
      {beats.map((time) => (
        <span
          key={time}
          className="absolute bottom-0 h-1.5 w-px bg-accent"
          style={{ left: time * pps }}
        />
      ))}
    </>
  );
}

function Playhead({ pps }: { pps: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      el.style.transform = `translate3d(${playback.time * pps}px,0,0)`;
    };
    apply();
    return playback.subscribe(apply);
  }, [pps]);
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-accent">
      <svg viewBox="0 0 12 8" className="absolute -left-[5px] top-0 w-3 text-accent">
        <path d="M0 0h12L6 8z" fill="currentColor" />
      </svg>
    </div>
  );
}

function Waveform({ id }: { id: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    setSrc(waveformUrl(id));
  }, [id]);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className="pointer-events-none absolute inset-x-1 bottom-0.5 h-4 w-[calc(100%-8px)] object-fill opacity-70"
    />
  );
}

function ClipView({ clip, pps, parked }: { clip: Clip; pps: number; parked?: boolean }) {
  const selected = useEditor((s) => s.selectedId === clip.id || s.selectedIds.includes(clip.id));
  return (
    <div
      data-clip={clip.id}
      data-clip-type={clip.type}
      className={cn(
        "absolute top-1 bottom-1 cursor-grab touch-none overflow-hidden rounded-sm text-left",
        clip.type === "fx"
          ? "bg-accent"
          : clip.type === "audio"
            ? "bg-accent/15"
            : clip.type === "text"
              ? "bg-fg/10"
              : "bg-accent/25",
        selected && "ring-2 ring-accent ring-inset",
        parked && selected && "opacity-40",
      )}
      style={{ left: clip.start * pps, width: Math.max(8, clip.duration * pps) }}
      onPointerDown={(event) => {
        if (event.button === 2) return;
        beginDrag(event, clip, "move");
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const st = useEditor.getState();
        if (!st.selection().includes(clip.id)) st.select(clip.id);
        useClipMenu.getState().open(event.clientX, event.clientY);
      }}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1",
          clip.type === "text" ? "bg-fg" : clip.type === "audio" ? "bg-fg/35" : clip.type === "sticker" ? "bg-accent/60" : "bg-accent",
        )}
      />
      <span className={cn("pointer-events-none block truncate px-2 py-1 text-xs", clip.type === "fx" ? "font-medium text-accent-ink" : "text-fg")}>
        {clip.name}
      </span>
      {clip.type === "audio" && clip.generator ? <Waveform id={clip.generator} /> : null}
      {(clip.type === "audio" || clip.type === "video") && clip.assetId ? <AssetWave id={clip.assetId} /> : null}
      <span
        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize"
        onPointerDown={(event) => beginDrag(event, clip, "start")}
      />
      <span
        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
        onPointerDown={(event) => beginDrag(event, clip, "end")}
      />
    </div>
  );
}

/** Arrastra toda la selección múltiple en el tiempo (misma pista de cada clip). */
function beginGroupDrag(event: ReactPointerEvent, clip: Clip) {
  const state = useEditor.getState();
  const ids = [...state.selectedIds];
  const orig: Record<string, number> = {};
  for (const c of state.clips) if (ids.includes(c.id)) orig[c.id] = c.start;
  const before = state.snapshot();
  const originX = event.clientX;
  const pps = state.pps;
  const others = state.clips.filter((c) => !ids.includes(c.id));
  const move = (ev: PointerEvent) => {
    let dx = (ev.clientX - originX) / pps;
    const now = useEditor.getState();
    if (now.snap) {
      const points = [0, playback.time, ...now.beats, ...others.flatMap((o) => [o.start, o.start + o.duration])];
      const s0 = (orig[clip.id] ?? 0) + dx;
      dx = snapMove(s0, clip.duration, points, pps) - (orig[clip.id] ?? 0);
    }
    now.moveSelection(ids, orig, dx);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    const now = useEditor.getState();
    if (now.clips.some((c) => ids.includes(c.id) && c.start !== orig[c.id])) now.pushHistory(before);
    if (playback.playing) mixer.playFrom(playback.time, now.clips, now.muted);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function beginDrag(event: ReactPointerEvent, clip: Clip, mode: "move" | "start" | "end") {
  event.stopPropagation();
  event.preventDefault();
  const state = useEditor.getState();
  if (mode === "move" && (event.shiftKey || event.ctrlKey || event.metaKey)) {
    state.toggleSelect(clip.id);
    return;
  }
  if (mode === "move" && state.selectedIds.length > 1 && state.selectedIds.includes(clip.id)) {
    beginGroupDrag(event, clip);
    return;
  }
  state.select(clip.id);
  const pps = state.pps;
  const originX = event.clientX;
  const orig = { ...clip };
  const before = state.snapshot();
  const move = (ev: PointerEvent) => {
    const dx = (ev.clientX - originX) / pps;
    const now = useEditor.getState();
    const points = [0, playback.time, ...now.beats];
    for (const other of now.clips) {
      if (other.id !== clip.id) points.push(other.start, other.start + other.duration);
    }
    if (mode === "move") {
      let start = Math.max(0, orig.start + dx);
      if (now.snap) {
        start = snapMove(start, orig.duration, points, pps);
      }
      publishDrag({ x: ev.clientX, y: ev.clientY, kind: "video" });
      const intent = readLaneIntent();
      if (intent.mode === "on" && intent.trackId) {
        now.patchClip(clip.id, { start, trackId: intent.trackId }, false);
        return;
      }
      now.patchClip(clip.id, { start }, false);
      return;
    }
    if (mode === "end") {
      let duration = orig.duration + dx;
      if (now.snap) duration = snapTo(orig.start + duration, points, pps) - orig.start;
      duration = limitDuration(orig, duration, now.assets);
      now.patchClip(clip.id, { duration }, false);
      return;
    }
    let start = Math.max(0, Math.min(orig.start + orig.duration - 0.2, orig.start + dx));
    if (now.snap) start = snapTo(start, points, pps);
    const delta = start - orig.start;
    const duration = Math.max(0.2, orig.duration - delta);
    const inPoint = Math.max(0, orig.inPoint + delta * orig.speed);
    now.patchClip(clip.id, { start, duration, inPoint }, false);
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (mode === "move") commitLaneAt(ev.clientY);
    const state = useEditor.getState();
    let cur = state.clips.find((item) => item.id === clip.id);
    const intent = readLaneIntent();
    if (cur && mode === "move" && intent.mode !== "on" && intent.trackId) {
      const newId = state.insertTrack(intent.trackId, intent.mode);
      state.patchClip(clip.id, { trackId: newId }, false);
      cur = useEditor.getState().clips.find((item) => item.id === clip.id);
    }
    if (cur && mode === "move") {
      const latest = useEditor.getState();
      const order = pruneTracks(latest.trackOrder, latest.clips);
      if (order.join() !== latest.trackOrder.join()) useEditor.setState({ trackOrder: order });
      cur = useEditor.getState().clips.find((item) => item.id === clip.id);
    }
    if (cur && mode === "move") {
      const slot = findSlot(
        useEditor.getState().clips.filter((item) => item.id !== cur!.id),
        cur.trackId,
        cur.start,
        cur.duration,
      );
      if (Math.abs(slot - cur.start) > 0.02) {
        useEditor.getState().patchClip(cur.id, { start: slot }, false);
        cur = useEditor.getState().clips.find((item) => item.id === clip.id);
      }
    }
    if (
      cur &&
      (cur.start !== orig.start ||
        cur.duration !== orig.duration ||
        cur.inPoint !== orig.inPoint ||
        cur.trackId !== orig.trackId)
    ) {
      useEditor.getState().pushHistory(before);
    }
    setLaneIntent({ mode: "on", trackId: null });
    setCursorTag(null);
    publishDrag(null);
    if (playback.playing) {
      const latest = useEditor.getState();
      mixer.playFrom(playback.time, latest.clips, latest.muted);
    }
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function AssetWave({ id }: { id: string }) {
  const src = useEditor((s) => s.assets.find((a) => a.id === id)?.waveform);
  if (!src) return null;
  return <img data-clip-wave="" src={src} alt="" className="pointer-events-none absolute inset-x-1 bottom-0.5 h-4 w-[calc(100%-8px)] object-fill opacity-70" />;
}
