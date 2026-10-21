import { onPlate, paintLook, watchSwatch } from "@/lib/editor/fx-paint";
import { GeneratePane } from "@/components/editor/Generate";
import { ReelPane } from "@/components/editor/Reel";
import { eatenClick, startLibraryDrag, type DragItem } from "@/lib/editor/place";
import { waveformUrl } from "@/lib/editor/audio";
import { drawGenerator, drawSticker } from "@/lib/editor/generators";
import { ingestFile } from "@/lib/editor/import-media";
import { useEditor } from "@/lib/editor/store";
import { playback } from "@/lib/editor/playback";
import {
  AUDIO_GENS,
  EFFECTS,
  FILTERS,
  GRADES,
  STICKERS,
  TEXT_LOOKS,
  TEXT_PRESETS,
  TRANSITIONS,
  VISUALS,
  lookFields,
  lookPreviewStyle,
  textFont,
  type TextDraft,
  type TextLook,
  type ToolId,
} from "@/lib/editor/types";
import { cn } from "@/lib/cn";
import { Aperture, Blend, Clapperboard, Film, Music2, SlidersHorizontal, Sparkles, Sticker, Type, Upload, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function sourceProps(item: DragItem, add: () => void) {
  return {
    onPointerDown: (event: ReactPointerEvent) => {
      startLibraryDrag(event.nativeEvent, item.kind, (hit) => {
        useEditor.getState().placeItem(item, hit.trackId, hit.time);
      });
    },
    onClick: () => {
      if (eatenClick()) return;
      add();
    },
  };
}

const TOOLS: { id: ToolId; label: string; icon: typeof Film }[] = [
  { id: "reel", label: "Reel", icon: Clapperboard },
  { id: "generate", label: "Generar", icon: WandSparkles },
  { id: "media", label: "Medios", icon: Film },
  { id: "audio", label: "Audio", icon: Music2 },
  { id: "text", label: "Texto", icon: Type },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "filters", label: "Filtros", icon: Sparkles },
  { id: "effects", label: "Efectos", icon: Aperture },
  { id: "transitions", label: "Fundidos", icon: Blend },
];

export function ToolTabs({ className }: { className?: string }) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const items = [...TOOLS, { id: "adjust" as const, label: "Ajustes", icon: SlidersHorizontal }];
  return (
    <div className={cn("flex min-w-0 gap-1 overflow-x-auto px-2 py-2", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setTool(item.id)}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm",
            tool === item.id ? "bg-accent text-accent-ink" : "bg-raised text-muted",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Library({ rail = true }: { rail?: boolean }) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-surface">
      {rail ? (
        <nav className="scroll flex w-20 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line p-1.5">
          {TOOLS.map((item) => {
            const active = tool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTool(item.id)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md text-xs",
                  active ? "bg-accent text-accent-ink" : "text-muted hover:bg-raised hover:text-fg",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      ) : null}
      <div className="scroll min-w-0 flex-1 overflow-y-auto p-3">
        {rail && tool !== "reel" ? (
          <img
            src="/brand/lockup.png"
            alt="Andromeda Video"
            className="mb-3 h-auto w-full object-contain"
          />
        ) : null}
        {tool === "reel" ? <ReelPane /> : null}
        {tool === "generate" ? <GeneratePane /> : null}
        {tool === "media" ? <MediaPane /> : null}
        {tool === "audio" ? <AudioPane /> : null}
        {tool === "text" ? <TextPane /> : null}
        {tool === "stickers" ? <StickerPane /> : null}
        {tool === "filters" ? <FilterPane /> : null}
        {tool === "effects" ? <EffectPane /> : null}
        {tool === "transitions" ? <TransitionPane /> : null}
        {tool === "adjust" ? (
          <p className="text-sm text-muted">
            Elige un clip. El color, la entrada, el medio y la salida de ese pedazo están aquí. La textura está en Efectos.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MediaPane() {
  const inputRef = useRef<HTMLInputElement>(null);
  const assets = useEditor((s) => s.assets);
  const addGenerator = useEditor((s) => s.addGenerator);
  const addAsset = useEditor((s) => s.addAsset);
  const removeAsset = useEditor((s) => s.removeAsset);
  const loadDemo = useEditor((s) => s.loadDemo);
  const clearTimeline = useEditor((s) => s.clearTimeline);
  const busy = useEditor((s) => s.busy);
  const [error, setError] = useState<string | null>(null);

  async function take(files: File[]) {
    if (!files.length) return;
    setError(null);
    useEditor.setState({ busy: "Importando…" });
    try {
      for (const file of files) {
        const loaded = await ingestFile(file);
        await addAsset(loaded.asset, loaded.blob);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar");
    } finally {
      useEditor.setState({ busy: null });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-fg">Medios</h2>
        <p className="mt-1 text-sm text-muted">Arrastra el clip a la línea. Si choca con otro, se pone a continuación. El tamaño se cambia en el preview.</p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-dashed border-line bg-sunken text-sm font-medium text-fg hover:border-accent"
      >
        <Upload className="size-4 text-accent" />
        {busy ?? "Subir archivos"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          void take([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {assets.length ? (
        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative overflow-hidden rounded-md border border-line bg-sunken">
              <button
                type="button"
                className="block w-full cursor-grab text-left touch-none"
                {...sourceProps({ kind: "asset", id: asset.id }, () => void addAsset({ ...asset }))}
              >
                {asset.thumb ? (
                  <img src={asset.thumb} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="grid aspect-video place-items-center text-xs text-muted">{asset.kind}</div>
                )}
                <span className="block truncate px-2 py-1.5 text-xs text-fg">{asset.name}</span>
              </button>
              <button
                type="button"
                className="absolute top-1 right-1 grid size-7 place-items-center rounded-md bg-bg/80 text-fg"
                aria-label={`Quitar ${asset.name}`}
                onClick={() => removeAsset(asset.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Clips listos</h3>
        <div className="grid grid-cols-2 gap-2">
          {VISUALS.map((item) => (
            <button
              key={item.id}
              type="button"
              {...sourceProps({ kind: "generator", id: item.id, name: item.name }, () => addGenerator(item.id, item.name))}
              className="cursor-grab touch-none overflow-hidden rounded-md border border-line bg-sunken text-left hover:border-accent"
            >
              <MiniGen id={item.id} />
              <span className="block truncate px-2 py-1.5 text-xs text-fg">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" className="h-11 flex-1 rounded-md bg-raised text-sm text-fg" onClick={loadDemo}>
          Cargar demo
        </button>
        <button type="button" className="h-11 flex-1 rounded-md bg-raised text-sm text-muted" onClick={clearTimeline}>
          Limpiar
        </button>
      </div>
    </div>
  );
}

function MiniGen({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawGenerator(ctx, id, canvas.width, canvas.height, 1.4);
  }, [id]);
  return <canvas ref={ref} width={320} height={180} className="aspect-video w-full" />;
}

function AudioPane() {
  const addAudioGen = useEditor((s) => s.addAudioGen);
  const [waves, setWaves] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const item of AUDIO_GENS) next[item.id] = waveformUrl(item.id);
    setWaves(next);
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Audio</h2>
        <p className="mt-1 text-sm text-muted">Arrastra la pista a Audio, o haz clic para soltarla en el cabezal.</p>
      </div>
      {AUDIO_GENS.map((item) => (
        <button
          key={item.id}
          type="button"
          {...sourceProps({ kind: "audio", id: item.id, name: item.name }, () => addAudioGen(item.id, item.name))}
          className="cursor-grab touch-none overflow-hidden rounded-md border border-line bg-sunken text-left hover:border-accent"
        >
          {waves[item.id] ? <img src={waves[item.id]} alt="" className="h-12 w-full object-cover" /> : <div className="h-12" />}
          <span className="block px-2 py-1.5 text-sm text-fg">{item.name}</span>
        </button>
      ))}
    </div>
  );
}

function TextPane() {
  const addText = useEditor((s) => s.addText);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Texto</h2>
        <p className="mt-1 text-sm text-muted">Un estilo y la frase ya se lee en silencio. Arrastra o haz clic.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TEXT_LOOKS.map((look) => {
          const draft = draftFromLook(look);
          return (
            <button
              key={look.id}
              type="button"
              {...sourceProps({ kind: "text", ...draft }, () => addText(draft))}
              className="cursor-grab touch-none rounded-md border border-line bg-sunken px-1 py-2 text-center hover:border-accent"
            >
              <span className="block truncate text-sm leading-none" style={lookPreviewStyle(look)}>
                {look.name}
              </span>
            </button>
          );
        })}
      </div>
      {TEXT_PRESETS.map((preset) => (
        <button
          key={preset.name}
          type="button"
          {...sourceProps(
            {
              kind: "text",
              name: preset.name,
              text: preset.text,
              fontSize: preset.fontSize,
              anim: preset.anim,
              bold: preset.bold,
              plate: preset.plate,
              align: preset.align,
              y: preset.y,
              font: preset.font,
              duration: preset.duration,
            },
            () => addText(preset),
          )}
          className="cursor-grab touch-none rounded-md border border-line bg-sunken px-3 py-3 text-left hover:border-accent"
        >
          <span className="block text-sm font-semibold text-fg">{preset.name}</span>
          <span
            className="mt-1 block truncate text-lg leading-tight text-fg"
            style={{ fontFamily: textFont(preset).family }}
          >
            {preset.text}
          </span>
        </button>
      ))}
    </div>
  );
}

function draftFromLook(look: TextLook): TextDraft {
  return {
    name: look.name,
    text: "TU HOOK",
    fontSize: 86,
    anim: look.id === "neon" ? "slam" : "pop",
    duration: 2.4,
    y: -0.05,
    ...lookFields(look),
  };
}

function StickerPane() {
  const addSticker = useEditor((s) => s.addSticker);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Stickers</h2>
        <p className="mt-1 text-sm text-muted">Arrástralos encima del video.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {STICKERS.map((item) => (
          <button
            key={item.id}
            type="button"
            {...sourceProps({ kind: "sticker", id: item.id, name: item.name }, () => addSticker(item.id, item.name))}
            className="cursor-grab touch-none rounded-md border border-line bg-sunken p-2 text-left hover:border-accent"
          >
            <MiniSticker id={item.id} />
            <span className="mt-1 block text-xs text-fg">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniSticker({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSticker(ctx, id, canvas.width, canvas.height, 0.4, 0, 0);
  }, [id]);
  return <canvas ref={ref} width={160} height={100} className="h-16 w-full" />;
}

function FilterPane() {
  const setFilter = useEditor((s) => s.setFilter);
  const selected = useEditor((s) => s.clips.find((clip) => clip.id === s.selectedId));
  const [query, setQuery] = useState("");
  const [asChannel, setAsChannel] = useState(false);
  const groups = Array.from(new Set(GRADES.map((item) => item.group)));
  const filtered = GRADES.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
  });
  const shownGroups = groups.filter((group) => filtered.some((item) => item.group === group));
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Looks de película</h2>
        <p className="mt-1 text-sm text-muted">
          Arrástralo a un canal, o entre dos canales para abrir uno nuevo. Tócalo para pintar solo el clip seleccionado.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setAsChannel(false)}
          className={cn(
            "h-10 rounded-md border text-xs",
            !asChannel ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
          )}
        >
          Este clip
        </button>
        <button
          type="button"
          onClick={() => setAsChannel(true)}
          className={cn(
            "h-10 rounded-md border text-xs",
            asChannel ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
          )}
        >
          Canal nuevo
        </button>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar Portra, teal, vintage…"
        className="rounded-md border border-line bg-sunken px-3 py-2 text-sm text-fg"
      />
      {shownGroups.map((group) => (
        <div key={group}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{group}</h3>
          <div className="grid grid-cols-2 gap-2">
            {filtered
              .filter((item) => item.group === group)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={(event) => {
                    startLibraryDrag(event.nativeEvent, "effect", (hit) => {
                      useEditor.getState().placeAdjust("grade", item.id, item.name, hit.time);
                    });
                  }}
                  onClick={() => {
                    if (eatenClick()) return;
                    if (asChannel) useEditor.getState().placeAdjust("grade", item.id, item.name, playback.time, true);
                    else useEditor.getState().setGrade(item.id);
                  }}
                  className="overflow-hidden rounded-md border border-line text-left hover:border-accent"
                >
                  <GradeThumb patch={item.patch} />
                  <span className="block px-2 pt-1 text-xs text-fg">{item.name}</span>
                  <span className="block px-2 pb-1 text-xs text-muted">{item.hint}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
      <h3 className="text-sm font-semibold text-fg">Filtros simples</h3>
      <p className="text-sm text-muted">La misma foto, para comparar el color antes de usarlo.</p>
      <div className="grid grid-cols-2 gap-2">
        {FILTERS.map((item) => {
          const active = selected?.filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onPointerDown={(event) => {
                if (item.id === "none") return;
                startLibraryDrag(event.nativeEvent, "effect", (hit) => {
                  useEditor.getState().placeAdjust("filter", item.id, item.name, hit.time);
                });
              }}
              onClick={() => {
                if (eatenClick()) return;
                if (asChannel) useEditor.getState().placeAdjust("filter", item.id, item.name, playback.time, true);
                else setFilter(item.id);
              }}
              className={cn(
                "overflow-hidden rounded-md border text-left",
                active ? "border-accent" : "border-line",
              )}
            >
              <FilterThumb id={item.id} css={item.css} />
              <span className="block px-2 py-1.5 text-xs text-fg">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EffectPane() {
  const setEffect = useEditor((s) => s.setEffect);
  const selected = useEditor((s) => s.clips.find((clip) => clip.id === s.selectedId));
  const [asChannel, setAsChannel] = useState(false);
  const [query, setQuery] = useState("");
  const catalog = EFFECTS.filter((item) => item.id !== "none");
  const groups = Array.from(new Set(catalog.map((item) => item.group)));
  const filtered = catalog.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.tags.toLowerCase().includes(q)
    );
  });
  const shown = groups.filter((group) => filtered.some((item) => item.group === group));
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Efectos</h2>
        <p className="mt-1 text-sm text-muted">
          {catalog.length} efectos. La miniatura se mueve antes de soltarlo. Arrástralo a un canal, o entre dos
          canales para abrir uno nuevo.
        </p>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar glitch, vhs, shake, zoom…"
        className="rounded-md border border-line bg-sunken px-3 py-2 text-sm text-fg"
      />
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setAsChannel(false)}
          className={cn(
            "h-10 rounded-md border text-xs",
            !asChannel ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
          )}
        >
          Este clip
        </button>
        <button
          type="button"
          onClick={() => setAsChannel(true)}
          className={cn(
            "h-10 rounded-md border text-xs",
            asChannel ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
          )}
        >
          Canal nuevo
        </button>
      </div>
      {shown.map((group) => (
        <div key={group}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{group}</h3>
          <div className="grid grid-cols-2 gap-2">
            {filtered
              .filter((item) => item.group === group)
              .map((item) => {
                const active = selected?.type === "fx" && (selected.effect ?? "none") === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onPointerDown={(event) => {
                      if (item.id === "none") return;
                      startLibraryDrag(event.nativeEvent, "effect", (hit) => {
                        useEditor.getState().placeAdjust("effect", item.id, item.name, hit.time);
                      });
                    }}
                    onClick={() => {
                      if (eatenClick()) return;
                      if (asChannel || item.id === "none") {
                        if (item.id !== "none") useEditor.getState().placeAdjust("effect", item.id, item.name, playback.time, true);
                        return;
                      }
                      setEffect(item.id);
                    }}
                    data-fx={item.id}
                    className={cn(
                      "overflow-hidden rounded-md border text-left",
                      active ? "border-accent" : "border-line",
                    )}
                  >
                    <EffectSwatch id={item.id} />
                    <span className="block px-2 py-1.5 text-xs text-fg">{item.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EffectSwatch({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return watchSwatch(canvas, id);
  }, [id]);
  return <canvas ref={ref} width={160} height={90} className="block h-14 w-full bg-sunken" aria-hidden />;
}

function GradeThumb({ patch }: { patch: (typeof GRADES)[number]["patch"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const paint = () => {
      if (ref.current) paintLook(ref.current, { patch });
    };
    paint();
    return onPlate(paint);
  }, [patch]);
  return <canvas ref={ref} width={160} height={90} className="block h-12 w-full bg-sunken" aria-hidden />;
}

function FilterThumb({ id, css }: { id: string; css: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const paint = () => {
      if (ref.current) paintLook(ref.current, { css, filterId: id });
    };
    paint();
    return onPlate(paint);
  }, [id, css]);
  return <canvas ref={ref} width={160} height={90} className="block h-12 w-full bg-sunken" aria-hidden />;
}

function TransitionPane() {
  const setTransition = useEditor((s) => s.setTransition);
  const selected = useEditor((s) => s.clips.find((clip) => clip.id === s.selectedId));
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Transiciones</h2>
        <p className="mt-1 text-sm text-muted">
          Suéltala en el corte, o toca el + entre dos clips. El fundido entra al inicio del clip de la derecha.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TRANSITIONS.map((item) => {
          const active = selected?.transition === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onPointerDown={(event) => {
                if (item.id === "none") return;
                startLibraryDrag(event.nativeEvent, "transition", (hit) => {
                  useEditor.getState().placeItem(
                    { kind: "transition", id: item.id, name: item.name },
                    hit.trackId,
                    hit.time,
                  );
                });
              }}
              onClick={() => {
                if (eatenClick()) return;
                setTransition(item.id);
              }}
              className={cn(
                "h-11 rounded-md border text-sm",
                active ? "border-accent bg-accent/15 text-fg" : "border-line bg-sunken text-muted",
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
