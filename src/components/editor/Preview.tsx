import { drawFrame } from "@/lib/editor/draw";
import { pause, seek, startEngine, togglePlay } from "@/lib/editor/engine";
import { playback } from "@/lib/editor/playback";
import { useEditor } from "@/lib/editor/store";
import { contentEnd, formatTime } from "@/lib/editor/time";
import { isVideoTrack, paintOrder } from "@/lib/editor/tracks";
import { BOT_Y, MID_Y, TOP_Y } from "@/lib/editor/align";
import { ASPECTS, TEXT_FONTS, fontFace, type Clip } from "@/lib/editor/types";
import { cn } from "@/lib/cn";
import { Pause, SkipBack } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function fitCanvas(canvas: HTMLCanvasElement, box: HTMLElement, aspectW: number, aspectH: number) {
  const cs = getComputedStyle(box);
  const pw = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const ph = box.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
  if (pw < 8 || ph < 8) return;
  const ar = aspectW / aspectH;
  let cw = pw;
  let ch = cw / ar;
  if (ch > ph) {
    ch = ph;
    cw = ch * ar;
  }
  canvas.style.width = `${Math.max(2, Math.floor(cw))}px`;
  canvas.style.height = `${Math.max(2, Math.floor(ch))}px`;
  const dpr = Math.min(1.75, window.devicePixelRatio || 1);
  const bw = Math.max(2, Math.round(cw * dpr));
  const bh = Math.max(2, Math.round(bw / ar));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
}

export function Preview() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const playing = useEditor((s) => s.playing);
  const clips = useEditor((s) => s.clips);
  const [zona, setZona] = useState(false);
  const [fault, setFault] = useState<string | null>(null);
  const [coach, setCoach] = useState(false);
  const faultRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      setCoach(window.localStorage.getItem("avc-coach") !== "off");
    } catch {
      setCoach(true);
    }
  }, []);

  useLayoutEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!canvas || !stage) return;
      const aspect = ASPECTS[useEditor.getState().aspect];
      fitCanvas(canvas, stage, aspect.w, aspect.h);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      try {
        drawFrame(ctx, canvas.width, canvas.height, playback.time, useEditor.getState().clips, useEditor.getState().layers, useEditor.getState().trackOrder);
        if (faultRef.current) {
          faultRef.current = null;
          setFault(null);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "El preview se detuvo.";
        if (faultRef.current !== msg) {
          faultRef.current = msg;
          setFault(msg);
        }
      }
      placeFrame(hostRef.current, canvas, frameRef.current);
    };
    const kick = () => {
      draw();
      const stage = stageRef.current;
      if (stage && stage.clientWidth < 8) raf = requestAnimationFrame(kick);
    };
    kick();
    const stop = startEngine(draw);
    const box = stageRef.current;
    const observer = box ? new ResizeObserver(draw) : null;
    if (box) observer?.observe(box);
    for (const font of TEXT_FONTS) {
      const face = fontFace(font.family);
      void document.fonts?.load(`${font.weight} 72px "${face}"`).then(draw).catch(() => undefined);
      if (font.bold !== font.weight) {
        void document.fonts?.load(`${font.bold} 72px "${face}"`).then(draw).catch(() => undefined);
      }
    }
    return () => {
      cancelAnimationFrame(raf);
      stop();
      observer?.disconnect();
    };
  }, []);

  return (
    <section className="flex min-h-40 min-w-0 flex-1 flex-col bg-sunken" style={{ position: "relative" }}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={stageRef} className="absolute inset-0 flex items-center justify-center p-3">
          <div ref={hostRef} className="relative">
            <canvas
              ref={canvasRef}
              className="block shrink-0 cursor-move touch-none rounded-md bg-bg ring-1 ring-line"
              onPointerDown={pickClip}
            />
            <div
              ref={frameRef}
              className="pointer-events-none absolute z-10 border border-accent"
              style={{ display: "none" }}
              onPointerDown={startMove}
            >
              {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                <span
                  key={corner}
                  data-handle=""
                  aria-label="Tamaño"
                  className="pointer-events-auto absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-fg"
                  style={{
                    left: corner.endsWith("e") ? "100%" : 0,
                    top: corner.startsWith("s") ? "100%" : 0,
                    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  }}
                  onPointerDown={(event) => startResize(event, corner)}
                />
              ))}
              {(["nw", "ne", "sw", "se"] as const).map((corner) => {
                const x = corner.endsWith("e") ? 1 : -1;
                const y = corner.startsWith("s") ? 1 : -1;
                return (
                  <span
                    key={`turn-${corner}`}
                    data-rotate=""
                    aria-label="Girar"
                    title="Girar"
                    className="pointer-events-auto absolute grid size-4 place-items-center rounded-full border-2 border-accent bg-bg"
                    style={{
                      left: corner.endsWith("e") ? "100%" : 0,
                      top: corner.startsWith("s") ? "100%" : 0,
                      transform: `translate(calc(-50% + ${x * 16}px), calc(-50% + ${y * 16}px))`,
                      cursor: "grab",
                    }}
                    onPointerDown={startRotate}
                  >
                    <svg viewBox="0 0 16 16" className="size-2.5" aria-hidden>
                      <path
                        d="M8.2 3.1a4.6 4.6 0 1 1-3.9 2.1"
                        fill="none"
                        stroke="#00d4c8"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                      <path d="M8.1 1.4 10.4 3.2 8 4.3" fill="#00d4c8" />
                    </svg>
                  </span>
                );
              })}
              <span
                data-angle=""
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded bg-bg/90 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
                style={{ top: -28, display: "none" }}
              />
            </div>
            <div data-guides="" className="pointer-events-none absolute inset-0 z-20" style={{ display: "none" }}>
              <div
                data-guide="v"
                className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-[0_0_0_1px_rgba(0,0,0,0.7)]"
                style={{ left: "50%", display: "none", transform: "translateX(-50%)" }}
              />
              <div
                data-guide="h"
                className="absolute right-0 left-0 h-0.5 bg-accent shadow-[0_0_0_1px_rgba(0,0,0,0.7)]"
                style={{ display: "none" }}
              />
              <span
                data-guide="dot"
                className="absolute size-2 rounded-full bg-accent shadow-[0_0_0_1px_rgba(0,0,0,0.7)]"
                style={{ display: "none" }}
              />
              <span
                data-guide="label"
                className="absolute rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-ink"
                style={{ display: "none" }}
              />
            </div>
            {zona ? (
              <div data-safe="" className="pointer-events-none absolute inset-0 z-20">
                <div className="absolute inset-x-0 border-t border-dashed border-fg/70" style={{ top: "14%" }} />
                <div className="absolute inset-x-0 border-t border-dashed border-fg/70" style={{ top: "78%" }} />
                <div className="absolute inset-y-0 border-l border-dashed border-fg/50" style={{ left: "6%" }} />
                <div className="absolute inset-y-0 border-l border-dashed border-fg/50" style={{ left: "86%" }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {fault ? (
        <p className="mx-3 mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-pretty text-fg">
          El preview falló: {fault}
        </p>
      ) : null}
      {coach ? (
        <div
          className="flex items-start gap-2 rounded-md border border-line bg-raised px-3 py-2 shadow-lg"
          style={{ position: "absolute", left: 10, bottom: 56, maxWidth: 250, zIndex: 30, opacity: 0.95, fontSize: 12, lineHeight: 1.35 }}
        >
          <p className="text-pretty text-fg">
            Sube tu video, pon la línea roja encima y pulsa Dividir (S). Arrastra hasta que agarre arriba, el centro o abajo. Luego la frase, un look y Exportar.
          </p>
          <button
            type="button"
            className="h-8 shrink-0 rounded-md bg-accent px-2 text-xs font-semibold text-accent-ink"
            onClick={() => {
              setCoach(false);
              try {
                window.localStorage.setItem("avc-coach", "off");
              } catch {
                /* ignore */
              }
            }}
          >
            Listo
          </button>
        </div>
      ) : null}
      <div className="flex h-12 shrink-0 items-center justify-center gap-2 border-t border-line bg-surface px-3">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-fg hover:bg-raised"
          onClick={() => {
            pause();
            seek(0);
          }}
          aria-label="Ir al inicio"
        >
          <SkipBack className="size-4" />
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full bg-accent text-accent-ink"
          onClick={() => void togglePlay()}
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? (
            <Pause className="size-5" />
          ) : (
            <img src={`${import.meta.env.BASE_URL}brand/play.png`} alt="" className="size-7 object-contain" style={{ marginLeft: 3 }} />
          )}
        </button>
        <Clock />
        <span className="text-sm text-faint">/</span>
        <span className="text-sm text-muted tabular-nums">{formatTime(contentEnd(clips))}</span>
        <button
          type="button"
          aria-pressed={zona}
          title="Donde Instagram tapa el video"
          onClick={() => setZona((on) => !on)}
          className={cn(
            "ml-1 h-8 rounded-md px-2 text-xs font-semibold",
            zona ? "bg-accent text-accent-ink" : "text-muted",
          )}
        >
          Zona
        </button>
      </div>
    </section>
  );
}

const SNAP = 0.028;

type Bounds = { x: number; y: number; w: number; h: number; cx: number; cy: number };

function clampOffset(value: number) {
  return Math.max(-1.4, Math.min(1.4, value));
}

function aspectOf(canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth || canvas.width || 1;
  const h = canvas.clientHeight || canvas.height || 1;
  return w / h;
}

function boundsOf(clip: Clip, canvas: HTMLCanvasElement): Bounds {
  if (clip.type === "text") {
    const size = (clip.fontSize ?? 64) / 1080;
    const chars = Math.max(1, (clip.text ?? "").replace(/\s/g, "").length || 4);
    const perLine = Math.max(6, Math.floor(0.84 / Math.max(0.045, size * 0.52)));
    const lines = Math.max(1, Math.ceil(chars / perLine));
    const w = Math.min(0.92, Math.max(0.28, (chars * size * 0.55) / lines + 0.06));
    const h = Math.max(0.08, lines * size * 1.35 + 0.05);
    const cx = 0.5 + (clip.x ?? 0) * 0.28;
    const cy = 0.5 + (clip.y ?? 0) * 0.32;
    return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
  }
  if (clip.type === "sticker") {
    const aspect = aspectOf(canvas);
    const sc = Math.max(0.25, clip.scale ?? 1);
    const cx = 0.5 + (clip.x ?? 0) * 0.32;
    const cy = 0.46 + (clip.y ?? 0) * 0.32;
    const rx = (aspect < 1 ? 0.26 : 0.26 / aspect) * sc;
    const ry = (aspect < 1 ? 0.26 * aspect : 0.26) * sc;
    return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2, cx, cy };
  }
  const scale = Math.max(0.25, clip.scale ?? 1);
  const cx = 0.5 + (clip.x ?? 0) * 0.34;
  const cy = 0.5 + (clip.y ?? 0) * 0.36;
  return { x: cx - scale / 2, y: cy - scale / 2, w: scale, h: scale, cx, cy };
}

function toOffset(clip: Clip, cx: number, cy: number) {
  if (clip.type === "text") return { x: (cx - 0.5) / 0.28, y: (cy - 0.5) / 0.32 };
  if (clip.type === "sticker") return { x: (cx - 0.5) / 0.32, y: (cy - 0.46) / 0.32 };
  return { x: (cx - 0.5) / 0.34, y: (cy - 0.5) / 0.36 };
}

function snapCenter(cx: number, cy: number) {
  let x = cx;
  let y = cy;
  if (Math.abs(x - 0.5) < SNAP) x = 0.5;
  if (Math.abs(y - MID_Y) < SNAP) y = MID_Y;
  else if (Math.abs(y - TOP_Y) < SNAP) y = TOP_Y;
  else if (Math.abs(y - BOT_Y) < SNAP) y = BOT_Y;
  return { x, y };
}

function guideOf(cx: number, cy: number) {
  const v = Math.abs(cx - 0.5) < 0.012;
  const mid = Math.abs(cy - MID_Y) < 0.012;
  const up = Math.abs(cy - TOP_Y) < 0.012;
  const down = Math.abs(cy - BOT_Y) < 0.012;
  const h = mid || up || down;
  let hy = MID_Y;
  if (down && !mid && !up) hy = BOT_Y;
  else if (up && !mid) hy = TOP_Y;
  let label = "";
  if (v && mid) label = "Medio";
  else if (v && up) label = "Arriba";
  else if (v && down) label = "Abajo";
  else if (v) label = "Lados";
  else if (mid) label = "Centro";
  else if (up) label = "Arriba";
  else if (down) label = "Abajo";
  return { v, h, hy, label };
}

function isVisual(clip: Clip) {
  return clip.type === "video" || clip.type === "image" || clip.type === "generator";
}

function isMovable(clip: Clip) {
  return isVisual(clip) || clip.type === "text" || clip.type === "sticker";
}

function activeAt(clip: Clip) {
  return playback.time >= clip.start && playback.time < clip.start + clip.duration;
}

function covers(box: Bounds, nx: number, ny: number, rotation: number, canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth || canvas.width || 1;
  const h = canvas.clientHeight || canvas.height || 1;
  const dx = (nx - box.cx) * w;
  const dy = (ny - box.cy) * h;
  const a = (-rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= (box.w * w) / 2 && Math.abs(ly) <= (box.h * h) / 2;
}

function clipAt(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  const state = useEditor.getState();
  const order = [...paintOrder(state.layers, state.clips)].reverse();
  for (const trackId of order) {
    if (!isVideoTrack(trackId) && trackId !== "t1" && trackId !== "o1") continue;
    const list = state.clips
      .filter((clip) => clip.trackId === trackId && isMovable(clip) && activeAt(clip))
      .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const clip = list[i];
      if (!clip) continue;
      const box = boundsOf(clip, canvas);
      if (covers(box, nx, ny, clip.rotation ?? 0, canvas)) return clip;
    }
  }
  return null;
}

function paintGuides(host: HTMLDivElement | null, clip: Clip | null, canvas: HTMLCanvasElement) {
  const guides = host?.querySelector<HTMLElement>("[data-guides]");
  if (!guides) return;
  if (!clip) {
    guides.style.display = "none";
    return;
  }
  const box = boundsOf(clip, canvas);
  const guide = guideOf(box.cx, box.cy);
  if (!guide.v && !guide.h) {
    guides.style.display = "none";
    return;
  }
  guides.style.display = "block";
  const v = guides.querySelector<HTMLElement>("[data-guide=v]");
  const h = guides.querySelector<HTMLElement>("[data-guide=h]");
  const label = guides.querySelector<HTMLElement>("[data-guide=label]");
  if (v) v.style.display = guide.v ? "block" : "none";
  if (h) {
    h.style.display = guide.h ? "block" : "none";
    h.style.top = `${guide.hy * 100}%`;
    h.style.transform = "translateY(-50%)";
  }
  const dot = guides.querySelector<HTMLElement>("[data-guide=dot]");
  if (dot) {
    const showDot = guide.v && guide.h;
    dot.style.display = showDot ? "block" : "none";
    dot.style.left = "50%";
    dot.style.top = `${guide.hy * 100}%`;
    dot.style.transform = "translate(-50%, -50%)";
  }
  if (label) {
    label.style.display = guide.label ? "block" : "none";
    label.textContent = guide.label;
    label.style.left = guide.v ? "50%" : `${box.cx * 100}%`;
    label.style.top = guide.h ? `${guide.hy * 100}%` : `${box.cy * 100}%`;
    label.style.transform = "translate(-50%, -140%)";
  }
}

function placeFrame(host: HTMLDivElement | null, canvas: HTMLCanvasElement, frame: HTMLDivElement | null) {
  if (host) {
    host.style.width = canvas.style.width;
    host.style.height = canvas.style.height;
  }
  if (!frame) return;
  const state = useEditor.getState();
  const clip = state.clips.find((item) => item.id === state.selectedId) ?? null;
  const on = clip && isMovable(clip) && !state.playing && activeAt(clip);
  paintGuides(host, on && clip ? clip : null, canvas);
  if (!on || !clip) {
    frame.style.display = "none";
    return;
  }
  const box = boundsOf(clip, canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  frame.style.display = "block";
  frame.style.left = `${box.x * w}px`;
  frame.style.top = `${box.y * h}px`;
  frame.style.width = `${Math.max(12, box.w * w)}px`;
  frame.style.height = `${Math.max(12, box.h * h)}px`;
  frame.style.transform = `rotate(${clip.rotation ?? 0}deg)`;
  const angle = frame.querySelector<HTMLElement>("[data-angle]");
  if (angle) {
    const deg = Math.round(normTurn(clip.rotation ?? 0));
    angle.style.display = deg === 0 ? "none" : "block";
    angle.textContent = `${deg}°`;
  }
  frame.querySelectorAll<HTMLElement>("[data-handle], [data-rotate]").forEach((handle) => {
    handle.style.display = "block";
  });
}

function pickClip(event: ReactPointerEvent<HTMLCanvasElement>) {
  if (event.button !== 0) return;
  event.preventDefault();
  if (useEditor.getState().playing) pause();
  const hit = clipAt(event.currentTarget, event.clientX, event.clientY);
  useEditor.getState().select(hit?.id ?? null);
  if (hit) beginMove(event.currentTarget, hit, event.clientX, event.clientY);
}

function norm(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / Math.max(1, rect.width),
    y: (clientY - rect.top) / Math.max(1, rect.height),
  };
}

function beginMove(canvas: HTMLCanvasElement, clip: Clip, clientX: number, clientY: number) {
  const before = useEditor.getState().snapshot();
  const origin = norm(canvas, clientX, clientY);
  const box = boundsOf(clip, canvas);
  const ox = clip.x ?? 0;
  const oy = clip.y ?? 0;
  const id = clip.id;
  let armed = false;
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - clientX;
    const dy = ev.clientY - clientY;
    if (!armed && dx * dx + dy * dy < 16) return;
    armed = true;
    const point = norm(canvas, ev.clientX, ev.clientY);
    const snapped = snapCenter(box.cx + point.x - origin.x, box.cy + point.y - origin.y);
    const next = toOffset(clip, snapped.x, snapped.y);
    useEditor.getState().patchClip(id, { x: clampOffset(next.x), y: clampOffset(next.y) }, false);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    const cur = useEditor.getState().clips.find((item) => item.id === id);
    if (cur && (cur.x !== ox || cur.y !== oy)) useEditor.getState().pushHistory(before);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function startMove(event: ReactPointerEvent<HTMLDivElement>) {
  if (event.button !== 0) return;
  const clip = useEditor.getState().clips.find((item) => item.id === useEditor.getState().selectedId);
  const canvas = event.currentTarget.parentElement?.querySelector("canvas");
  if (!clip || !(canvas instanceof HTMLCanvasElement)) return;
  event.preventDefault();
  beginMove(canvas, clip, event.clientX, event.clientY);
}

function visualBox(clip: Clip) {
  const scale = Math.max(0.25, clip.scale ?? 1);
  const cx = 0.5 + (clip.x ?? 0) * 0.34;
  const cy = 0.5 + (clip.y ?? 0) * 0.36;
  return { x: cx - scale / 2, y: cy - scale / 2, scale };
}

function normTurn(deg: number) {
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function snapTurn(deg: number) {
  const d = normTurn(deg);
  const stops = [0, 45, 90, 135, 180, -45, -90, -135, -180];
  for (const stop of stops) {
    if (Math.abs(d - stop) <= 4) return stop;
  }
  return Math.round(d);
}

function pointerAngle(canvas: HTMLCanvasElement, clientX: number, clientY: number, cx: number, cy: number) {
  const rect = canvas.getBoundingClientRect();
  return Math.atan2(clientY - rect.top - cy * rect.height, clientX - rect.left - cx * rect.width);
}

function localNorm(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  cx: number,
  cy: number,
  rotationDeg: number,
) {
  const rect = canvas.getBoundingClientRect();
  const dx = clientX - rect.left - cx * rect.width;
  const dy = clientY - rect.top - cy * rect.height;
  const a = (-rotationDeg * Math.PI) / 180;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return { x: cx + lx / Math.max(1, rect.width), y: cy + ly / Math.max(1, rect.height) };
}

function startRotate(event: ReactPointerEvent<HTMLSpanElement>) {
  if (event.button !== 0) return;
  event.stopPropagation();
  event.preventDefault();
  const clip = useEditor.getState().clips.find((item) => item.id === useEditor.getState().selectedId);
  const canvas = event.currentTarget.parentElement?.parentElement?.querySelector("canvas");
  if (!clip || !(canvas instanceof HTMLCanvasElement)) return;
  const before = useEditor.getState().snapshot();
  const box = boundsOf(clip, canvas);
  const startAngle = pointerAngle(canvas, event.clientX, event.clientY, box.cx, box.cy);
  const startRot = clip.rotation ?? 0;
  const id = clip.id;
  const move = (ev: PointerEvent) => {
    const ang = pointerAngle(canvas, ev.clientX, ev.clientY, box.cx, box.cy);
    const delta = ((ang - startAngle) * 180) / Math.PI;
    useEditor.getState().patchClip(id, { rotation: snapTurn(startRot + delta) }, false);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    const cur = useEditor.getState().clips.find((item) => item.id === id);
    if (cur && cur.rotation !== startRot) useEditor.getState().pushHistory(before);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function startResize(event: ReactPointerEvent<HTMLSpanElement>, corner: "nw" | "ne" | "sw" | "se") {
  if (event.button !== 0) return;
  event.stopPropagation();
  event.preventDefault();
  const clip = useEditor.getState().clips.find((item) => item.id === useEditor.getState().selectedId);
  const canvas = event.currentTarget.parentElement?.parentElement?.querySelector("canvas");
  if (!clip || !(canvas instanceof HTMLCanvasElement)) return;
  const before = useEditor.getState().snapshot();
  const id = clip.id;
  if (clip.type === "text" || clip.type === "sticker") {
    const box = boundsOf(clip, canvas);
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + box.cx * rect.width;
    const cy = rect.top + box.cy * rect.height;
    const startDist = Math.max(16, Math.hypot(event.clientX - cx, event.clientY - cy));
    const startSize = clip.type === "text" ? (clip.fontSize ?? 64) : (clip.scale ?? 1);
    const move = (ev: PointerEvent) => {
      const ratio = Math.hypot(ev.clientX - cx, ev.clientY - cy) / startDist;
      if (clip.type === "text") {
        useEditor.getState().patchClip(id, { fontSize: Math.round(Math.max(20, Math.min(240, startSize * ratio))) }, false);
      } else {
        useEditor.getState().patchClip(id, { scale: Math.max(0.25, Math.min(2.5, startSize * ratio)) }, false);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const cur = useEditor.getState().clips.find((item) => item.id === id);
      if (cur && (cur.fontSize !== clip.fontSize || cur.scale !== clip.scale)) useEditor.getState().pushHistory(before);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return;
  }
  const box = visualBox(clip);
  const fixedX = corner.endsWith("w") ? box.x + box.scale : box.x;
  const fixedY = corner.startsWith("n") ? box.y + box.scale : box.y;
  const center = { x: box.x + box.scale / 2, y: box.y + box.scale / 2 };
  const startRot = clip.rotation ?? 0;
  const move = (ev: PointerEvent) => {
    const point = localNorm(canvas, ev.clientX, ev.clientY, center.x, center.y, startRot);
    const spanX = corner.endsWith("e") ? point.x - fixedX : fixedX - point.x;
    const spanY = corner.startsWith("s") ? point.y - fixedY : fixedY - point.y;
    const scale = Math.max(0.25, Math.min(1.5, Math.max(spanX, spanY)));
    const x0 = corner.endsWith("e") ? fixedX : fixedX - scale;
    const y0 = corner.startsWith("s") ? fixedY : fixedY - scale;
    useEditor.getState().patchClip(
      id,
      {
        scale,
        x: Math.max(-1.4, Math.min(1.4, (x0 + scale / 2 - 0.5) / 0.34)),
        y: Math.max(-1.4, Math.min(1.4, (y0 + scale / 2 - 0.5) / 0.36)),
      },
      false,
    );
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    const cur = useEditor.getState().clips.find((item) => item.id === id);
    if (cur && (cur.scale !== clip.scale || cur.x !== clip.x || cur.y !== clip.y)) useEditor.getState().pushHistory(before);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function Clock() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      el.textContent = formatTime(playback.time);
    };
    apply();
    return playback.subscribe(apply);
  }, []);
  return <span ref={ref} className="min-w-14 text-sm font-medium text-fg tabular-nums">{formatTime(1.15)}</span>;
}
