import { useEditor, limitDuration } from "@/lib/editor/store";
import { isVideoTrack } from "@/lib/editor/tracks";
import { TEXT_COLORS, TEXT_FONTS, TEXT_LOOKS, TEXT_ANIMS, TEXT_SHADOWS, EFFECTS, ENTERS, LEAVES, MIDS, FILTERS, lookFields, lookPreviewStyle, sameLook, textFont, type Clip } from "@/lib/editor/types";
import { alignMark, centerAt } from "@/lib/editor/align";
import { cn } from "@/lib/cn";
import { INSPECTOR_TABS, loadInspectorTab, nextTab, saveInspectorTab, tabHasContent, type InspectorTab } from "@/lib/editor/inspector-tabs";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const FieldUnit = createContext("");

export function Inspector() {
  const clip = useEditor((s) => s.clips.find((item) => item.id === s.selectedId) ?? null);
  return (
    <aside className="scroll h-full overflow-y-auto bg-surface p-3">
      {clip ? <ClipInspector clip={clip} /> : <EmptyInspector />}
    </aside>
  );
}

function EmptyInspector() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-fg">Ajustes</h2>
      <p className="text-sm text-pretty text-muted">
        Selecciona un clip, o toca en el preview lo que se ve para moverlo. Al arrastrar, el imán agarra arriba, el centro y abajo.
      </p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-sm text-muted">
        <li>Sube el video en Medios, o suéltalo en la pantalla.</li>
        <li>Pon la línea roja encima y pulsa Dividir, o la tecla S.</li>
        <li>Cada pedazo tiene su entrada, su salida y su color.</li>
        <li>Escribe la frase. Escribiendo, rebote, glitch o retro.</li>
        <li>En Filtros, un look de cine. Luego Exportar.</li>
      </ol>
      <ul className="flex flex-col gap-1.5 text-sm text-muted">
        <li>Espacio — reproducir</li>
        <li>S — dividir donde está la línea roja</li>
        <li>Supr — borrar el clip</li>
        <li>Ctrl/⌘ Z — deshacer</li>
        <li>Quitar fondo — verde o azul, en Ajustes del clip</li>
      </ul>
    </div>
  );
}

function ClipInspector({ clip }: { clip: Clip }) {
  const patchClip = useEditor((s) => s.patchClip);
  const assets = useEditor((s) => s.assets);
  const snapshot = useEditor((s) => s.snapshot);
  const pushHistory = useEditor((s) => s.pushHistory);
  const before = useRef<ReturnType<typeof snapshot> | null>(null);
  const [tab, setTab] = useInspectorTab();
  const [sub, setSub] = useState<"basico" | "fondo">("basico");
  const kind: string = clip.type;

  if (clip.type === "fx") return <FxInspector clip={clip} />;

  function live(partial: Partial<Clip>) {
    patchClip(clip.id, partial, false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs tracking-wide text-faint uppercase">{labelOf(clip.type)}</p>
        <h2 className="truncate text-sm font-semibold text-fg">{clip.name}</h2>
        {clip.type === "text" ? <LookGrid clip={clip} /> : null}
      </div>
      <InspectorTabs tab={tab} onTab={setTab} />
      <div role="tabpanel" id={`insp-panel-${tab}`} aria-labelledby={`insp-tab-${tab}`} data-insp-panel={tab} className="flex flex-col gap-4">
      {tab === "colores" ? (<>
      {kind === "text" ? (
        <Section id="tcolor" title="Color del texto" onReset={() => patchClip(clip.id, { color: "#ffffff" })}>
      {clip.type === "text" ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Color</span>
          <div className="flex flex-wrap gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Color ${color}`}
                onClick={() => patchClip(clip.id, { color })}
                className={cn(
                  "size-8 rounded-full ring-2 ring-offset-2 ring-offset-surface",
                  (clip.color ?? "").toLowerCase() === color ? "ring-accent" : "ring-line",
                )}
                style={{ background: color }}
              />
            ))}
            <label className="relative size-8 overflow-hidden rounded-full ring-2 ring-line ring-offset-2 ring-offset-surface" title="Otro color">
              <span className="grid size-8 place-items-center text-xs text-fg">+</span>
              <input
                type="color"
                aria-label="Elegir color"
                value={toHex(clip.color)}
                onPointerDown={() => {
                  before.current = snapshot();
                }}
                onChange={(event) => live({ color: event.target.value })}
                onBlur={() => {
                  if (before.current) pushHistory(before.current);
                  before.current = null;
                }}
                className="absolute inset-0 size-8 cursor-pointer opacity-0"
              />
            </label>
          </div>
          <HexField color={toHex(clip.color)} onCommit={(color) => patchClip(clip.id, { color })} />
        </div>
      ) : null}
        </Section>
      ) : null}
      {(kind === "video" || kind === "image" || kind === "generator") ? (
        <Section id="color" title="Corrección de color" onReset={() => patchClip(clip.id, { brightness: 1, contrast: 1, saturate: 1, temperature: 0, tint: 0, wash: 0, vignette: 0 })}>
      {clip.type === "video" || clip.type === "image" || clip.type === "generator" ? (<>
          <Field label="Brillo" value={clip.brightness.toFixed(2)}>
            <Range
              min={0.4}
              max={1.6}
              step={0.01}
              value={clip.brightness}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ brightness: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Contraste" value={clip.contrast.toFixed(2)}>
            <Range
              min={0.5}
              max={1.6}
              step={0.01}
              value={clip.contrast}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ contrast: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Saturación" value={`${Math.round((clip.saturate ?? 1) * 100)}%`}>
            <Range
              min={0}
              max={2}
              step={0.02}
              value={clip.saturate ?? 1}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ saturate: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Temperatura" value={Math.round((clip.temperature ?? 0) * 100)}>
            <Range
              min={-1}
              max={1}
              step={0.02}
              value={clip.temperature ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ temperature: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Tinte" value={Math.round((clip.tint ?? 0) * 100)}>
            <Range
              min={-1}
              max={1}
              step={0.02}
              value={clip.tint ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ tint: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Lavado" value={`${Math.round((clip.wash ?? 0) * 100)}%`}>
            <Range
              min={0}
              max={1}
              step={0.02}
              value={clip.wash ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ wash: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Viñeta" value={`${Math.round((clip.vignette ?? 0) * 100)}%`}>
            <Range
              min={0}
              max={1}
              step={0.02}
              value={clip.vignette ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ vignette: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <button
            type="button"
            onClick={() =>
              patchClip(clip.id, {
                brightness: 1,
                contrast: 1,
                saturate: 1,
                temperature: 0,
                tint: 0,
                wash: 0,
                vignette: 0,
              })
            }
            className="h-11 rounded-md bg-raised text-sm text-fg"
          >
            Color original
          </button>
        </>
      ) : null}
        </Section>
      ) : null}
      </>) : null}
      {tab === "ems" ? (<>
      {kind !== "audio" && kind !== "text" ? (
        <Section id="motion" title="Animación del clip" onReset={() => patchClip(clip.id, { enter: "none", middle: "none", leave: "none" })}>
      {clip.type !== "audio" && clip.type !== "text" ? <MotionFields clip={clip} /> : null}
        </Section>
      ) : null}
      {kind === "text" ? (
        <Section id="tanim" title="Animación de la frase" onReset={() => patchClip(clip.id, { anim: "none", middle: "none", leave: "none" })}>
      {clip.type === "text" ? (
        <div className="flex flex-col gap-2">
          <Pick
            label="Entrada de la frase"
            value={clip.anim ?? "none"}
            options={TEXT_ANIMS}
            onChange={(anim) => patchClip(clip.id, { anim })}
          />
          <Pick
            label="Medio"
            value={clip.middle ?? "none"}
            options={MIDS}
            onChange={(middle) => patchClip(clip.id, { middle })}
          />
          <Pick
            label="Salida"
            value={clip.leave ?? "none"}
            options={LEAVES}
            onChange={(leave) => patchClip(clip.id, { leave })}
          />
          <Field label="Tiempo de entrada" value={`${(clip.enterDur ?? 0.4).toFixed(2)}s`}>
            <Range
              min={0.1}
              max={2.4}
              step={0.05}
              value={clip.enterDur ?? 0.4}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ enterDur: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Tiempo de salida" value={`${(clip.leaveDur ?? 0.4).toFixed(2)}s`}>
            <Range
              min={0.1}
              max={2.4}
              step={0.05}
              value={clip.leaveDur ?? 0.4}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ leaveDur: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
        </div>
      ) : null}
        </Section>
      ) : null}
      {true ? (
        <Section id="fades" title="Fundidos y transición" onReset={() => patchClip(clip.id, { fadeIn: 0, fadeOut: 0 })}>
      <Field label="Fundido entrada" value={`${clip.fadeIn.toFixed(1)}s`}>
        <Range
          min={0}
          max={2}
          step={0.05}
          value={clip.fadeIn}
          onStart={() => {
            before.current = snapshot();
          }}
          onChange={(value) => live({ fadeIn: value })}
          onEnd={() => before.current && pushHistory(before.current)}
        />
      </Field>
      <Field label="Fundido salida" value={`${clip.fadeOut.toFixed(1)}s`}>
        <Range
          min={0}
          max={2}
          step={0.05}
          value={clip.fadeOut}
          onStart={() => {
            before.current = snapshot();
          }}
          onChange={(value) => live({ fadeOut: value })}
          onEnd={() => before.current && pushHistory(before.current)}
        />
      </Field>
      {isVideoTrack(clip.trackId) ? (
        <Field label="Transición" value={`${clip.transitionDur.toFixed(2)}s`}>
          <Range
            min={0.15}
            max={1.5}
            step={0.05}
            value={clip.transitionDur}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ transitionDur: value })}
            onEnd={() => before.current && pushHistory(before.current)}
          />
        </Field>
      ) : null}
        </Section>
      ) : null}
      </>) : null}
      {tab === "ajustes" && (kind === "video" || kind === "image" || kind === "generator") ? (<>
        <Segmented value={sub} onChange={setSub} options={[{ id: "basico", label: "Básico" }, { id: "fondo", label: "Quitar fondo" }]} />
      </>) : null}
      {tab === "ajustes" && sub === "basico" ? (<>
      {kind !== "audio" ? (
        <Section id="transform" title="Transformación" onReset={() => patchClip(clip.id, { rotation: 0, scale: 1, x: 0, y: 0 })}>
        <AlignButtons clip={clip} />
      {clip.type !== "audio" ? (
        <Field label="Giro" value={`${Math.round(normTurn(clip.rotation ?? 0))}°`}>
          <Range
            min={-180}
            max={180}
            step={1}
            value={normTurn(clip.rotation ?? 0)}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ rotation: value })}
            onEnd={() => before.current && pushHistory(before.current)}
          />
        </Field>
      ) : null}
      {clip.type === "text" || clip.type === "sticker" ? (
        <>
          <Field label="Horizontal" value={(clip.x ?? 0).toFixed(2)}>
            <Range
              min={-1}
              max={1}
              step={0.02}
              value={clip.x ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ x: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Vertical" value={(clip.y ?? 0).toFixed(2)}>
            <Range
              min={-1}
              max={1}
              step={0.02}
              value={clip.y ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ y: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
        </>
      ) : null}
      {clip.type === "video" || clip.type === "image" || clip.type === "generator" ? (
        <div className="flex gap-2">
          {(["cover", "contain"] as const).map((fit) => (
            <button
              key={fit}
              type="button"
              onClick={() => patchClip(clip.id, { fit })}
              className={cn(
                "h-11 flex-1 rounded-md text-sm",
                clip.fit === fit ? "bg-accent text-accent-ink" : "bg-raised text-muted",
              )}
            >
              {fit === "cover" ? "Cubrir" : "Ajustar"}
            </button>
          ))}
        </div>
      ) : null}
      {clip.type === "video" || clip.type === "image" || clip.type === "generator" ? (
        <>
          <Field label="Tamaño" value={`${Math.round((clip.scale ?? 1) * 100)}%`}>
            <Range
              min={0.25}
              max={1.5}
              step={0.01}
              value={clip.scale ?? 1}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ scale: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Horizontal" value={(clip.x ?? 0).toFixed(2)}>
            <Range
              min={-1}
              max={1}
              step={0.02}
              value={clip.x ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ x: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <Field label="Vertical" value={(clip.y ?? 0).toFixed(2)}>
            <Range
              min={-1}
              max={1}
              step={0.02}
              value={clip.y ?? 0}
              onStart={() => {
                before.current = snapshot();
              }}
              onChange={(value) => live({ y: value })}
              onEnd={() => before.current && pushHistory(before.current)}
            />
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => patchClip(clip.id, { scale: 1, x: 0, y: 0 })} className="h-11 flex-1 rounded-md bg-raised text-sm text-fg">
              Pantalla
            </button>
            <button
              type="button"
              onClick={() => patchClip(clip.id, { scale: 0.48, x: 0, y: -0.22 })}
              className="h-11 flex-1 rounded-md bg-raised text-sm text-fg"
            >
              Ventana
            </button>
          </div>
        </>
      ) : null}
        </Section>
      ) : null}
      {kind === "text" ? (
        <Section id="texto" title="Texto">
      {clip.type === "text" ? (
        <label className="flex flex-col gap-1 text-xs text-muted">
          Frase
          <textarea
            value={clip.text ?? ""}
            rows={3}
            onFocus={() => {
              before.current = snapshot();
            }}
            onChange={(event) => live({ text: event.target.value })}
            onBlur={() => {
              if (before.current) pushHistory(before.current);
              before.current = null;
            }}
            className="resize-none rounded-md border border-line bg-sunken px-3 py-2 text-sm text-fg"
          />
        </label>
      ) : null}
      {clip.type === "text" ? (
        <label className="flex flex-col gap-1 text-xs text-muted">
          Fuente
          <select
            value={clip.font ?? "jakarta"}
            onChange={(event) => patchClip(clip.id, { font: event.target.value })}
            className="h-11 rounded-md border border-line bg-sunken px-2 text-sm text-fg"
            style={{ fontFamily: textFont(clip).family }}
          >
            {TEXT_FONTS.map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {clip.type === "text" ? (
        <Field label="Espaciado" value={(clip.tracking ?? 0).toFixed(2)}>
          <Range
            min={-0.08}
            max={0.2}
            step={0.005}
            value={clip.tracking ?? 0}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ tracking: value })}
            onEnd={() => {
              if (before.current) pushHistory(before.current);
            }}
          />
        </Field>
      ) : null}
      {clip.type === "text" ? (
        <Field label="Tamaño" value={Math.round(clip.fontSize ?? 64)}>
          <Range
            min={28}
            max={160}
            step={1}
            value={clip.fontSize ?? 64}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ fontSize: value })}
            onEnd={() => {
              if (before.current) pushHistory(before.current);
            }}
          />
        </Field>
      ) : null}
      {clip.type === "text" ? (
        <div className="flex gap-2">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => patchClip(clip.id, { align })}
              className={cn(
                "h-11 flex-1 rounded-md text-sm",
                (clip.align ?? "center") === align ? "bg-accent text-accent-ink" : "bg-raised text-muted",
              )}
            >
              {align === "left" ? "Izq" : align === "right" ? "Der" : "Centro"}
            </button>
          ))}
        </div>
      ) : null}
        </Section>
      ) : null}
      {kind === "text" ? (
        <Section id="sombra" title="Sombra" onReset={() => patchClip(clip.id, { shadow: 0 })}>
      {clip.type === "text" ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Sombra</span>
            <div className="grid grid-cols-3 gap-1">
              {TEXT_SHADOWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => patchClip(clip.id, { shadow: item.id })}
                  className={cn(
                    "h-11 rounded-md text-xs",
                    (clip.shadow ?? 0) === item.id ? "bg-accent text-accent-ink" : "bg-raised text-muted",
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
      ) : null}
        </Section>
      ) : null}
      {kind !== "text" && kind !== "sticker" ? (
        <Section id="speed" title="Velocidad y audio">
      {clip.type !== "text" && clip.type !== "sticker" && clip.type !== "audio" ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Velocidad</span>
          <div className="grid grid-cols-4 gap-1">
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => {
                  const spanned = clip.duration * clip.speed;
                  const next = { ...clip, speed };
                  const duration = Math.min(spanned / speed, limitDuration(next, spanned / speed, assets));
                  patchClip(clip.id, { speed, duration });
                }}
                className={cn(
                  "h-11 rounded-md text-sm",
                  clip.speed === speed ? "bg-accent text-accent-ink" : "bg-raised text-muted",
                )}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {clip.type === "video" || clip.type === "image" || clip.type === "generator" || clip.type === "audio" ? (
        <Field label="Velocidad" value={`${clip.speed.toFixed(2)}×`}>
          <Range
            min={0.25}
            max={4}
            step={0.05}
            value={Math.abs(clip.speed) || 1}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ speed: clip.speed < 0 ? -value : value })}
            onEnd={() => before.current && pushHistory(before.current)}
          />
        </Field>
      ) : null}
      {clip.type !== "text" && clip.type !== "sticker" ? (
        <Field label="Volumen" value={Math.round(clip.volume * 100)}>
          <Range
            min={0}
            max={1}
            step={0.01}
            value={clip.volume}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ volume: value })}
            onEnd={() => before.current && pushHistory(before.current)}
          />
        </Field>
      ) : null}
        </Section>
      ) : null}
      {kind !== "audio" ? (
        <Section id="blend" title="Mezcla" onReset={() => patchClip(clip.id, { opacity: 1 })}>
      {clip.type !== "audio" ? (
        <Field label="Opacidad" value={Math.round(clip.opacity * 100)}>
          <Range
            min={0.05}
            max={1}
            step={0.01}
            value={clip.opacity}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ opacity: value })}
            onEnd={() => before.current && pushHistory(before.current)}
          />
        </Field>
      ) : null}
        </Section>
      ) : null}
      </>) : null}
      {tab === "ajustes" && sub === "fondo" && (kind === "video" || kind === "image" || kind === "generator") ? (<>
      {true ? (
        <Section id="key" title="Quitar fondo" enabled={clip.effect === "key"} onToggle={(on) => patchClip(clip.id, on ? { effect: "key", keyColor: clip.keyColor || "#00ff00", keyTol: clip.keyTol ?? 0.42 } : { effect: "none" })}>
      {clip.type === "video" || clip.type === "image" || clip.type === "generator" ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Quitar fondo</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patchClip(clip.id, { effect: "key", keyColor: "#00ff00", keyTol: clip.keyTol ?? 0.42 })}
              className="h-11 rounded-md bg-raised text-sm text-fg"
            >
              Verde
            </button>
            <button
              type="button"
              onClick={() => patchClip(clip.id, { effect: "key", keyColor: "#0044ff", keyTol: clip.keyTol ?? 0.42 })}
              className="h-11 rounded-md bg-raised text-sm text-fg"
            >
              Azul
            </button>
          </div>
          {clip.effect === "key" ? (
            <>
              <Field label="Tolerancia" value={(clip.keyTol ?? 0.42).toFixed(2)}>
                <Range
                  min={0.12}
                  max={0.85}
                  step={0.01}
                  value={clip.keyTol ?? 0.42}
                  onStart={() => {
                    before.current = snapshot();
                  }}
                  onChange={(value) => live({ keyTol: value })}
                  onEnd={() => before.current && pushHistory(before.current)}
                />
              </Field>
              <label className="flex items-center justify-between text-xs text-muted">
                Color que se borra
                <input
                  type="color"
                  aria-label="Color del fondo"
                  value={toHex(clip.keyColor || "#00ff00")}
                  onChange={(event) => patchClip(clip.id, { keyColor: event.target.value, effect: "key" })}
                  className="h-11 w-16 cursor-pointer rounded-md border border-line bg-sunken"
                />
              </label>
              <button type="button" onClick={() => patchClip(clip.id, { effect: "none" })} className="h-11 rounded-md bg-raised text-sm text-fg">
                Dejar el fondo
              </button>
            </>
          ) : (
            <p className="text-xs text-pretty text-muted">Elige el color de atrás. Si queda un borde, sube la tolerancia.</p>
          )}
        </div>
      ) : null}
        </Section>
      ) : null}
      </>) : null}
      {tab === "filtros" ? (<>
      {(kind === "video" || kind === "image" || kind === "generator") ? (
        <Section id="filtro" title="Filtro" onReset={() => patchClip(clip.id, { filter: "none" })}>
      {clip.type === "video" || clip.type === "image" || clip.type === "generator" ? (
          <div>
            <p className="mb-1.5 text-xs text-muted">Filtro de este pedazo</p>
            <div className="grid grid-cols-3 gap-1">
              {FILTERS.slice(0, 9).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => patchClip(clip.id, { filter: item.id })}
                  className={cn(
                    "rounded-md border px-1.5 py-1 text-xs",
                    clip.filter === item.id ? "border-accent text-accent" : "border-line text-muted",
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
      ) : null}
        </Section>
      ) : null}
      </>) : null}
      <TabHint tab={tab} type={clip.type} />
      </div>
    </div>
  );
}

function MotionFields({ clip }: { clip: Clip }) {
  const patchClip = useEditor((s) => s.patchClip);
  const snapshot = useEditor((s) => s.snapshot);
  const pushHistory = useEditor((s) => s.pushHistory);
  const before = useRef<ReturnType<typeof snapshot> | null>(null);
  function live(partial: Partial<Clip>) {
    patchClip(clip.id, partial, false);
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted">Entrada y salida del clip</span>
      <Pick
        label="Entrada"
        value={clip.enter ?? "none"}
        options={ENTERS}
        onChange={(enter) => patchClip(clip.id, { enter })}
      />
      {(clip.enter ?? "none") !== "none" ? (
        <Field label="Tiempo de entrada" value={`${(clip.enterDur ?? 0.4).toFixed(2)}s`}>
          <Range
            min={0.1}
            max={2.4}
            step={0.05}
            value={clip.enterDur ?? 0.4}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ enterDur: value })}
            onEnd={() => before.current && pushHistory(before.current)}
          />
        </Field>
      ) : null}
      <Pick
        label="Medio"
        value={clip.middle ?? "none"}
        options={MIDS}
        onChange={(middle) => patchClip(clip.id, { middle })}
      />
      <Pick
        label="Salida"
        value={clip.leave ?? "none"}
        options={LEAVES}
        onChange={(leave) => patchClip(clip.id, { leave })}
      />
      {(clip.leave ?? "none") !== "none" ? (
        <Field label="Tiempo de salida" value={`${(clip.leaveDur ?? 0.4).toFixed(2)}s`}>
          <Range
            min={0.1}
            max={2.4}
            step={0.05}
            value={clip.leaveDur ?? 0.4}
            onStart={() => {
              before.current = snapshot();
            }}
            onChange={(value) => live({ leaveDur: value })}
            onEnd={() => before.current && pushHistory(before.current)}
          />
        </Field>
      ) : null}
    </div>
  );
}

function Pick<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 rounded-md border border-line bg-sunken px-2 text-sm text-fg"
      >
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function FxInspector({ clip }: { clip: Clip }) {
  const patchClip = useEditor((s) => s.patchClip);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs tracking-wide text-faint uppercase">Efecto</p>
        <h2 className="truncate text-sm font-semibold text-fg">{clip.name}</h2>
        <p className="mt-1 text-sm text-pretty text-muted">
          Solo cubre el tramo de la barra. Arrastra los bordes en la línea para alargarlo o acortarlo.
        </p>
      </div>
      <Pick
        label="Efecto"
        value={clip.effect ?? "none"}
        options={EFFECTS}
        onChange={(id) => {
          const name = EFFECTS.find((item) => item.id === id)?.name ?? clip.name;
          patchClip(clip.id, { effect: id, name: id === "none" ? "Sin efecto" : name });
        }}
      />
    </div>
  );
}

function labelOf(type: Clip["type"]) {
  if (type === "text") return "Texto";
  if (type === "audio") return "Audio";
  if (type === "sticker") return "Sticker";
  if (type === "image") return "Imagen";
  if (type === "fx") return "Efecto";
  return "Video";
}

function Field({ label, value, children }: { label: string; value: string | number; children: ReactNode }) {
  return (
    <FieldUnit.Provider value={String(value).match(/[^\d.\-]+$/)?.[0]?.trim() ?? ""}>
      <div className="flex flex-col gap-1" data-field={label}>
        <span className="flex items-center justify-between text-xs text-muted">
          {label}
          <span className="sr-only">{value}</span>
        </span>
        {children}
      </div>
    </FieldUnit.Provider>
  );
}

function normTurn(deg: number) {
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function toHex(color: string | undefined) {
  return /^#[0-9a-fA-F]{6}$/.test(color ?? "") ? (color ?? "#f7f7f8").toLowerCase() : "#f7f7f8";
}

function HexField({ color, onCommit }: { color: string; onCommit: (hex: string) => void }) {
  const [draft, setDraft] = useState(color);
  useEffect(() => setDraft(color), [color]);
  return (
    <input
      aria-label="Color hexadecimal"
      value={draft}
      spellCheck={false}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (/^#[0-9a-fA-F]{6}$/.test(next)) onCommit(next.toLowerCase());
      }}
      className="h-11 rounded-md border border-line bg-sunken px-2 font-mono text-sm text-fg"
    />
  );
}

function LookGrid({ clip }: { clip: Clip }) {
  const patchClip = useEditor((s) => s.patchClip);
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {TEXT_LOOKS.map((look) => (
        <button
          key={look.id}
          type="button"
          onClick={() => patchClip(clip.id, lookFields(look))}
          className={cn(
            "flex h-11 items-center justify-center overflow-hidden rounded-md border bg-sunken px-1",
            sameLook(clip, look) ? "border-accent" : "border-line",
          )}
        >
          <span className="truncate text-sm leading-none" style={lookPreviewStyle(look)}>
            {look.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function AlignButtons({ clip }: { clip: Clip }) {
  const patchClip = useEditor((s) => s.patchClip);
  const mark = alignMark(clip);
  return (
    <div className="mt-2 grid grid-cols-4 gap-1">
      {(
        [
          ["arriba", "Arriba"],
          ["medio", "Medio"],
          ["abajo", "Abajo"],
          ["lados", "Lados"],
        ] as const
      ).map(([where, label]) => (
        <button
          key={where}
          type="button"
          onClick={() => patchClip(clip.id, centerAt(clip, where))}
          className={cn(
            "h-11 rounded-md text-xs",
            mark === where ? "bg-accent text-accent-ink" : "bg-raised text-fg",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Range({
  min,
  max,
  step,
  value,
  onChange,
  onStart,
  onEnd,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
}) {
  const unit = useContext(FieldUnit);
  const k = unit === "%" && max <= 4 ? 100 : 1; // 0..1 se muestra como %
  const dec = Math.max(0, Math.min(2, Math.ceil(-Math.log10(step * k) - 1e-9)));
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const nudge = (dir: number) => { onStart?.(); onChange(clamp(+(value + dir * step).toFixed(6))); onEnd?.(); };
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value * k).toFixed(dec);
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onStart}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onEnd}
        className="h-8 min-w-0 flex-1"
      />
      <div className="flex h-8 shrink-0 items-stretch rounded-md border border-line bg-sunken focus-within:border-accent">
        <input
          type="text"
          inputMode="decimal"
          data-num=""
          aria-label="Valor"
          value={shown}
          onFocus={() => setDraft(shown)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setDraft(null); nudge(e.key === "ArrowUp" ? 1 : -1); }
            else if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            else e.stopPropagation();
          }}
          onBlur={() => {
            const n = Number((draft ?? "").replace(",", "."));
            if (draft !== null && Number.isFinite(n)) { onStart?.(); onChange(clamp(n / k)); onEnd?.(); }
            setDraft(null);
          }}
          className="w-12 bg-transparent px-1.5 text-right text-xs tabular-nums text-fg outline-none"
        />
        {unit ? <span className="grid place-items-center pr-1 text-xs text-muted">{unit}</span> : null}
        <div className="flex flex-col border-l border-line">
          <button type="button" tabIndex={-1} aria-label="Subir" data-num-up="" onClick={() => nudge(1)} className="flex-1 px-1 text-[8px] leading-none text-muted hover:text-fg">▲</button>
          <button type="button" tabIndex={-1} aria-label="Bajar" data-num-down="" onClick={() => nudge(-1)} className="flex-1 px-1 text-[8px] leading-none text-muted hover:text-fg">▼</button>
        </div>
      </div>
    </div>
  );
}

function useInspectorTab() {
  const [tab, set] = useState<InspectorTab>(() => loadInspectorTab());
  return [tab, (t: InspectorTab) => { set(t); saveInspectorTab(t); }] as const;
}

/** Pestañas del inspector: subrayado dorado, teclado con flechas/Inicio/Fin, se acomodan en 2 filas si el panel es angosto. */
function InspectorTabs({ tab, onTab }: { tab: InspectorTab; onTab: (t: InspectorTab) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function key(e: React.KeyboardEvent) {
    const n = nextTab(tab, e.key);
    if (!n) return;
    e.preventDefault();
    e.stopPropagation();
    onTab(n);
    refs.current[n]?.focus();
  }
  return (
    <div role="tablist" aria-label="Edición del clip" data-insp-tabs="" onKeyDown={key}
      className="sticky -top-3 z-10 -mx-3 flex flex-wrap gap-1 border-b border-line bg-surface px-3 py-1.5">
      {INSPECTOR_TABS.map((t) => {
        const on = t.id === tab;
        return (
          <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} type="button" role="tab" id={`insp-tab-${t.id}`}
            aria-selected={on} aria-controls={`insp-panel-${t.id}`} tabIndex={on ? 0 : -1} data-insp-tab={t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "min-h-9 flex-auto basis-[40%] rounded-md border-b-2 px-2 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-accent sm:basis-0",
              on ? "border-accent bg-raised text-fg" : "border-transparent text-muted hover:bg-raised/60 hover:text-fg",
            )}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function TabHint({ tab, type }: { tab: InspectorTab; type: Clip["type"] }) {
  if (tabHasContent(tab, type)) return null;
  return <p data-insp-empty="" className="text-xs text-pretty text-muted">Este tipo de clip no tiene opciones en esta pestaña.</p>;
}

/** Sección plegable: título con flecha, casilla opcional (activar/desactivar) y botón de restablecer. */
function Section({ id, title, children, onReset, enabled, onToggle }: { id: string; title: string; children: ReactNode; onReset?: () => void; enabled?: boolean; onToggle?: (on: boolean) => void }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(`avc.sec.${id}`) !== "0"; } catch { return true; } });
  const toggleOpen = () => { setOpen(!open); try { localStorage.setItem(`avc.sec.${id}`, open ? "0" : "1"); } catch { /* */ } };
  const off = onToggle && !enabled;
  return (
    <section data-insp-section={id} className="border-b border-line pb-3 last:border-b-0">
      <div className="flex items-center gap-2">
        {onToggle ? (
          <input type="checkbox" aria-label={`Activar ${title}`} data-sec-toggle={id} checked={Boolean(enabled)} onChange={(e) => onToggle(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--color-accent)]" />
        ) : null}
        <button type="button" aria-expanded={open} aria-controls={`sec-${id}`} onClick={toggleOpen}
          className="flex min-h-9 flex-1 items-center gap-1.5 rounded text-left text-sm font-semibold text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {title}
          <span aria-hidden className={cn("text-[10px] text-muted transition-transform", open ? "" : "-rotate-90")}>▼</span>
        </button>
        {onReset ? (
          <button type="button" data-sec-reset={id} onClick={onReset} title="Restablecer" aria-label={`Restablecer ${title}`}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg">↺</button>
        ) : null}
      </div>
      {open ? <div id={`sec-${id}`} className={cn("mt-2 flex flex-col gap-3", off && "pointer-events-none opacity-40")} aria-disabled={off || undefined}>{children}</div> : null}
    </section>
  );
}

/** Sub-pestañas en barra segmentada. */
function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div role="radiogroup" aria-label="Sub-sección" data-insp-sub="" className="grid gap-1 rounded-lg bg-sunken p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} data-insp-subtab={o.id} onClick={() => onChange(o.id)}
          className={cn("min-h-8 rounded-md px-2 text-xs", value === o.id ? "bg-raised font-semibold text-fg shadow-sm" : "text-muted hover:text-fg")}>{o.label}</button>
      ))}
    </div>
  );
}
