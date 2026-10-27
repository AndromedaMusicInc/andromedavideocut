import { HelpMenu } from "@/components/editor/SuggestionBox";
import { reloadAssetAudio } from "@/lib/editor/audio-import";
import { ClipMenu } from "@/components/editor/ClipMenu";
import { Inspector } from "@/components/editor/Inspector";
import { Library, ToolTabs } from "@/components/editor/Library";
import { Preview } from "@/components/editor/Preview";
import { Timeline } from "@/components/editor/Timeline";
import { mixer } from "@/lib/editor/audio";
import { pause, seek, togglePlay } from "@/lib/editor/engine";
import { EXPORT_PRESETS, exportVideo, FRAME_RATES, loadPreset, openBlob, outputSize, QUALITIES, saveBlob, savePreset, type FrameRate, type PresetId, type QualityId } from "@/lib/editor/export";
import { idbGet } from "@/lib/editor/persist";
import { readProject, writeProject, type ProjectMeta } from "@/lib/editor/projects";
import { playback } from "@/lib/editor/playback";
import { useEditor } from "@/lib/editor/store";
import { ASPECTS, type AspectId, type Asset, type ToolId } from "@/lib/editor/types";
import { contentEnd } from "@/lib/editor/time";
import { cn } from "@/lib/cn";
import { fullscreenElement, onFullscreenChange, toggleFullscreen } from "@/lib/fullscreen";
import { Download, House, LoaderCircle, Maximize, Minimize, Settings } from "lucide-react";
import { ConnectGrokWizard, SettingsDialog, useAiBoot } from "@/components/editor/ConnectGrok";
import { useAi } from "@/lib/ai/xai";
import { ingestFile } from "@/lib/editor/import-media";
import { useEffect, useRef, useState } from "react";

/** Miniatura JPEG pequeña del visor para la pantalla de inicio. */
/** Miniatura del primer clip de video/imagen (por si el visor aún no dibujó). */
function firstThumb(state: { clips: { type: string; assetId?: string; start: number }[]; assets: { id: string; thumb?: string }[] }) {
  const first = state.clips.filter((c) => (c.type === "video" || c.type === "image") && c.assetId).sort((a, b) => a.start - b.start)[0];
  return (first && state.assets.find((a) => a.id === first.assetId)?.thumb) || undefined;
}

function snapshot(): string | undefined {
  const src = document.querySelector<HTMLCanvasElement>("[data-preview-canvas]");
  if (!src || !src.width) return undefined;
  const w = 240;
  const h = Math.round((src.height / src.width) * w);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return undefined;
  try {
    ctx.drawImage(src, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

export function Editor({ project, onHome, tool: startTool }: { project: ProjectMeta; onHome: () => void; tool?: ToolId }) {
  const name = useEditor((s) => s.name);
  const setName = useEditor((s) => s.setName);
  const aspect = useEditor((s) => s.aspect);
  const setAspect = useEditor((s) => s.setAspect);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const splitAt = useEditor((s) => s.splitAt);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const copySelected = useEditor((s) => s.copySelected);
  const pasteClipboard = useEditor((s) => s.pasteClipboard);
  const tool = useEditor((s) => s.tool);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [exportFile, setExportFile] = useState<{ blob: Blob; name: string } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [onlyClips, setOnlyClips] = useState<string[] | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const ids = (e as CustomEvent<string[]>).detail;
      setOnlyClips(ids);
      setFileName(`${useEditor.getState().name} (selección)`);
      setExportOpen(true);
    };
    window.addEventListener("avc:export-selection", on);
    return () => window.removeEventListener("avc:export-selection", on);
  }, []);
  const [fileName, setFileName] = useState("");
  const [quality, setQuality] = useState<QualityId>("1080");
  const [fps, setFps] = useState<FrameRate>(30);
  const [preset, setPreset] = useState<PresetId>("reel");
  useEffect(() => {
    const saved = loadPreset();
    setPreset(saved.preset);
    setQuality(saved.quality);
    setFps(saved.fps);
  }, []);
  function choosePreset(id: PresetId) {
    const p = EXPORT_PRESETS.find((item) => item.id === id);
    if (!p) return;
    setPreset(id);
    if (id !== "custom") {
      setQuality(p.quality);
      setFps(p.fps);
      if (p.aspect) setAspect(p.aspect);
    }
    savePreset({ preset: id, quality: id === "custom" ? quality : p.quality, fps: id === "custom" ? fps : p.fps });
  }
  const [withAudio, setWithAudio] = useState(true);
  const [over, setOver] = useState(false);
  useAiBoot();
  const notice = useEditor((s) => s.notice);
  const cancel = useRef(false);

  const metaRef = useRef(project);
  const saveNow = useRef<() => Promise<void>>(async () => {});
  const flushRef = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let pending = false;
    let lastThumb = 0;
    const sizes = new Map<string, number>();
    let unsub = () => {};
    pause();
    seek(0);
    useEditor.setState({ hydrated: false });
    void (async () => {
      const saved = await readProject(project.id);
      if (!alive) return;
      if (saved) useEditor.getState().loadSaved(saved);
      else useEditor.getState().loadSaved({ v: 1, name: project.name, aspect: project.aspect, clips: [], muted: {}, assets: [] });
      useEditor.setState({ hydrated: true, selectedId: null, ...(startTool ? { tool: startTool } : {}) });
      if (saved?.assets.length) {
        const assets: Asset[] = [];
        for (const meta of saved.assets) {
          try {
            if (meta.status === "convirtiendo") {
              assets.push({ ...meta, status: "error", error: "Conversión interrumpida: vuelve a importarlo." });
              continue;
            }
            const blob = await idbGet(meta.id);
            if (!blob) {
              assets.push({ ...meta, status: "error", error: "Falta el archivo: vuelve a importarlo." });
              continue;
            }
            const url = URL.createObjectURL(blob);
            assets.push({ ...meta, url });
            if (meta.kind !== "image") void reloadAssetAudio(meta, blob);
          } catch {
            /* falta un archivo: se omite */
          }
        }
        if (alive && assets.length) useEditor.getState().setAssets(assets);
      }
      const payload = (state: ReturnType<typeof useEditor.getState>) => ({
        v: 1 as const,
        name: state.name,
        aspect: state.aspect,
        clips: state.clips,
        muted: state.muted,
        hidden: state.hidden,
        beats: state.beats,
        bpm: state.bpm,
        downbeat: state.downbeat,
        layers: state.layers,
        fxCount: state.fxCount,
        assets: state.assets,
      });
      // 0.0.2 (beta): si no se pudo guardar (disco/almacenamiento lleno) se avisa, no se calla.
      let failed = false;
      const reportSave = (ok: boolean | undefined) => {
        if (ok === false) {
          failed = true;
          (window as unknown as { __avcSaveFailed?: number }).__avcSaveFailed = Date.now();
          useEditor.getState().tell("⚠ No se pudo guardar el proyecto: el almacenamiento está lleno. Libera espacio o borra proyectos de la Papelera; tus últimos cambios aún no están guardados.");
        } else if (ok && failed) {
          failed = false;
          useEditor.getState().tell("Proyecto guardado de nuevo.");
        }
      };
      // Guardado inmediato y sin esperas (al cerrar la pestaña o cambiar de proyecto).
      flushRef.current = () => {
        if (!pending) return;
        pending = false;
        window.clearTimeout(timer);
        const state = useEditor.getState();
        if (!state.hydrated) return;
        metaRef.current = { ...metaRef.current, name: state.name, aspect: state.aspect, updatedAt: Date.now(), duration: contentEnd(state.clips), thumb: metaRef.current.thumb || firstThumb(state) };
        void writeProject(metaRef.current, payload(state)).then(reportSave);
      };
      const save = async () => {
        pending = false;
        const state = useEditor.getState();
        if (!state.hydrated) return;
        const now = Date.now();
        let thumb = metaRef.current.thumb;
        if (now - lastThumb > 3000 || !thumb) {
          thumb = snapshot() ?? thumb ?? firstThumb(state);
          lastThumb = now;
        }
        let bytes = 0;
        for (const a of state.assets) {
          if (!sizes.has(a.id)) sizes.set(a.id, (await idbGet(a.id).catch(() => undefined))?.size ?? 0);
          bytes += sizes.get(a.id) ?? 0;
        }
        bytes += JSON.stringify(state.clips).length;
        metaRef.current = { ...metaRef.current, name: state.name, aspect: state.aspect, thumb, updatedAt: now, bytes, duration: contentEnd(state.clips) };
        reportSave(await writeProject(metaRef.current, payload(state)));
      };
      saveNow.current = async () => {
        window.clearTimeout(timer);
        await save();
      };
      unsub = useEditor.subscribe((state, prev) => {
        if (!state.hydrated) return;
        // Solo cambios del proyecto (no el cabezal ni la reproducción).
        if (state.clips === prev.clips && state.name === prev.name && state.aspect === prev.aspect && state.muted === prev.muted && state.assets === prev.assets && state.beats === prev.beats && state.layers === prev.layers) return;
        window.clearTimeout(timer);
        pending = true;
        timer = window.setTimeout(() => void save(), 400);
      });
      // Primera miniatura cuando el visor ya dibujó.
      window.setTimeout(() => alive && void save(), 1200);
    })();
    const onHide = () => flushRef.current();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      // Cambiar de proyecto: guarda lo pendiente antes de soltar el editor.
      flushRef.current();
      flushRef.current = () => {};
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      alive = false;
      unsub();
      window.clearTimeout(timer);
    };
  }, [project.id]);

  async function goHome() {
    pause();
    await saveNow.current();
    onHome();
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
      }
      if (typing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "x") {
        event.preventDefault();
        useEditor.getState().cutSelected();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        useEditor.getState().splitSelection();
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "v") {
        useEditor.getState().toggleDisabled();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        // Selecciona todos los clips (no el texto de la app).
        event.preventDefault();
        useEditor.getState().selectAll();
        return;
      }
      if (event.key === "Escape") {
        if (document.querySelector("[role=dialog]")) return;
        useEditor.getState().clearSelection();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      // F1-10 · recortes al cabezal y por cuadro.
      if (!event.metaKey && !event.ctrlKey) {
        const k = event.key;
        const op = k === "[" ? "start" : k === "]" ? "end" : k.toLowerCase() === "q" && !event.altKey ? "rippleStart" : k.toLowerCase() === "w" && !event.altKey ? "rippleEnd"
          : event.altKey && (k === "," || k === "<") ? "nudge-" : event.altKey && (k === "." || k === ">") ? "nudge+" : null;
        if (op) {
          event.preventDefault();
          if (!useEditor.getState().trimKey(op, playback.time)) useEditor.getState().tell("Pon el cabezal dentro de un clip para recortar.");
          return;
        }
        if (!event.altKey && (k === "," || k === ".")) {
          event.preventDefault();
          seek(Math.max(0, playback.time + (k === "," ? -1 : 1) / 30));
          return;
        }
      }
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        // 0.0.2 (beta): Ctrl/Cmd+S guarda (antes cortaba el clip).
        event.preventDefault();
        void saveNow.current().then(() => useEditor.getState().tell("Proyecto guardado."));
      } else if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "s") {
        splitAt(playback.time);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        copySelected();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 1 : 0.1;
        seek(playback.time + (event.key === "ArrowLeft" ? -step : step));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, splitAt, deleteSelected, duplicateSelected, copySelected, pasteClipboard]);

  useEffect(() => {
    const unlock = () => {
      void mixer.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  async function onExport() {
    void mixer.resume();
    setExportError(null);
    setExportNote(null);
    setExportFile(null);
    setExportOpen(false);
    setProgress(0);
    setExporting(true);
    cancel.current = false;
    let stamp = 0;
    try {
      const result = await exportVideo(
        (value) => {
          const now = performance.now();
          if (now - stamp > 80 || value >= 1) {
            stamp = now;
            setProgress(value);
          }
        },
        () => cancel.current,
        { fileName: fileName.trim() || name, quality, fps, audio: withAudio, clipIds: onlyClips ?? undefined },
      );
      savePreset({ preset, quality, fps });
      if (result.ok) {
        setExportFile({ blob: result.blob, name: result.file });
        const note =
          result.audio === "off"
            ? `${result.file} está listo, sin audio. Pulsa Descargar.`
            : result.format === "mp4" && result.audio === "aac"
              ? `${result.file} está listo. Pulsa Descargar. Es MP4 con audio AAC, listo para Instagram y TikTok.`
              : result.aacMissing
                ? `Este navegador no puede codificar audio AAC, así que ${result.file} salió en WebM con audio Opus. Para MP4 con AAC exporta desde Chrome de escritorio o Safari. Pulsa Descargar.`
                : `${result.file} está listo. Pulsa Descargar. Este navegador lo bajó en WebM.`;
        setExportNote(note);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "No se pudo exportar");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      data-editor="" className="relative flex h-dvh min-h-0 w-full max-w-full select-none flex-col overflow-hidden bg-bg text-fg"
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const files = [...event.dataTransfer.files];
        if (!files.length) return;
        useEditor.setState({ busy: "Importando…" });
        void (async () => {
          try {
            for (const file of files) {
              try {
                const loaded = await ingestFile(file);
                await useEditor.getState().addAsset(loaded.asset, loaded.blob);
              } catch (err) {
                useEditor.getState().tell(err instanceof Error ? err.message : "Ese archivo no se pudo abrir.");
              }
            }
          } finally {
            useEditor.setState({ busy: null });
          }
        })();
      }}
    >
      <header className="flex h-14 min-w-0 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            data-go-home=""
            onClick={() => void goHome()}
            title="Volver al inicio (proyectos)"
            aria-label="Volver al inicio"
            className="grid size-11 shrink-0 place-items-center rounded-md text-fg hover:bg-raised"
          >
            <House className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => void togglePlay()}
            title="Reproducir / pausar (espacio)"
            aria-label="Reproducir o pausar"
            className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-raised"
          >
            <img src={`${import.meta.env.BASE_URL}brand/play.png`} alt="Andromeda" className="size-9 object-contain" />
          </button>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight" title="AndromedaVideoCut">
              AndromedaVideoCut
            </p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Nombre del proyecto"
              className="w-full max-w-16 min-w-0 bg-transparent text-xs text-muted outline-none sm:max-w-40"
            />
          </div>
        </div>
        <div className="mx-auto hidden items-center gap-1 sm:flex">
          {(Object.keys(ASPECTS) as AspectId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setAspect(id)}
              className={cn(
                "h-11 rounded-md px-2.5 text-xs font-medium",
                aspect === id ? "bg-accent text-accent-ink" : "text-muted hover:bg-raised",
              )}
            >
              {ASPECTS[id].label}
              <span className="ml-1 text-current/70">{ASPECTS[id].hint}</span>
            </button>
          ))}
        </div>
        <select
          className="h-11 max-w-28 shrink-0 rounded-md border border-line bg-raised px-2 text-sm sm:hidden"
          value={aspect}
          aria-label="Relación de aspecto"
          onChange={(event) => setAspect(event.target.value as AspectId)}
        >
          {(Object.keys(ASPECTS) as AspectId[]).map((id) => (
            <option key={id} value={id}>
              {ASPECTS[id].label} {ASPECTS[id].hint}
            </option>
          ))}
        </select>
        <HelpMenu />
        <button
          type="button"
          data-open-settings=""
          onClick={() => useAi.getState().openSettings()}
          aria-label="Ajustes"
          title="Ajustes (IA opcional)"
          className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-raised text-fg hover:bg-surface"
        >
          <Settings className="size-5" />
        </button>
        <FullscreenButton />
        <button
          type="button"
          onClick={() => {
            setOnlyClips(null);
            setFileName(name);
            setExportOpen(true);
          }}
          disabled={exporting}
          className="ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">Exportar</span>
          <span className="sr-only sm:hidden">Exportar</span>
        </button>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 basis-0">
        <div className="hidden w-80 shrink-0 border-r border-line lg:flex">
          <Library />
        </div>
        <Preview />
        <div className="hidden w-72 shrink-0 border-l border-line lg:block">
          <Inspector />
        </div>
      </div>

      <div className="flex min-h-0 w-full max-h-[46dvh] shrink flex-col overflow-hidden">
        <div className="min-w-0 max-w-full shrink-0 overflow-hidden border-t border-line bg-surface lg:hidden">
          <ToolTabs />
          <div className={cn("flex overflow-hidden", tool === "reel" || tool === "generate" || tool === "adjust" ? "h-56" : "h-40")}>
            {tool === "adjust" ? <Inspector /> : <Library rail={false} />}
          </div>
        </div>
        <Timeline />
      </div>

      <SettingsDialog />
      <ClipMenu />
      <ConnectGrokWizard />

      {notice ? (
        <div className="pointer-events-none absolute top-16 left-1/2 z-40 w-[min(32rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-md border border-line bg-raised px-3 py-2 text-sm text-pretty text-fg shadow-lg">
          {notice}
        </div>
      ) : null}

      {over ? (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-bg/70">
          <p className="rounded-md bg-raised px-4 py-3 text-sm">Suelta para añadir a la línea</p>
        </div>
      ) : null}

      {exportOpen && !exporting ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-bg/75 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="export-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-line bg-raised p-5">
            <h2 id="export-title" className="text-base font-semibold">{onlyClips ? `Exportar ${onlyClips.length} clip${onlyClips.length > 1 ? "s" : ""} seleccionado${onlyClips.length > 1 ? "s" : ""}` : "Exportar"}</h2>
            <label className="mt-3 flex flex-col gap-1 text-xs text-muted">
              Nombre del archivo
              <input
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                className="h-11 rounded-md border border-line bg-sunken px-3 text-sm text-fg"
              />
            </label>
            <p className="mt-3 text-xs text-muted">Preset</p>
            <div data-presets="" className="mt-1 grid grid-cols-3 gap-1">
              {EXPORT_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-preset={item.id}
                  aria-pressed={preset === item.id}
                  onClick={() => choosePreset(item.id)}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center rounded-md border px-1 py-1 text-center text-xs font-medium leading-tight",
                    preset === item.id ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
                  )}
                >
                  <span>{item.name}</span>
                  <span className="text-[10px] opacity-75">{item.hint}</span>
                </button>
              ))}
            </div>
            {preset === "custom" ? (
              <>
                <p className="mt-3 text-xs text-muted">Resolución</p>
                <div className="mt-1 grid grid-cols-5 gap-1">
                  {QUALITIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setQuality(item.id);
                        savePreset({ preset, quality: item.id, fps });
                      }}
                      className={cn(
                        "h-10 rounded-md border text-xs font-medium",
                        quality === item.id ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">Cuadros por segundo</p>
                <div className="mt-1 grid grid-cols-6 gap-1">
                  {FRAME_RATES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      data-fps={item}
                      onClick={() => {
                        setFps(item);
                        savePreset({ preset, quality, fps: item });
                      }}
                      className={cn(
                        "h-10 rounded-md border text-xs font-medium",
                        fps === item ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <p data-export-summary="" className="mt-2 text-xs text-fg tabular-nums">
              {(() => {
                const size = outputSize(aspect, quality);
                return `${aspect} · ${size.width}×${size.height} · ${fps} fps`;
              })()}
            </p>
            <p className="mt-3 text-xs text-muted">Audio</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setWithAudio(true)}
                className={cn(
                  "h-11 rounded-md border text-xs font-medium",
                  withAudio ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
                )}
              >
                Con audio
              </button>
              <button
                type="button"
                onClick={() => setWithAudio(false)}
                className={cn(
                  "h-11 rounded-md border text-xs font-medium",
                  !withAudio ? "border-accent bg-accent text-accent-ink" : "border-line text-muted",
                )}
              >
                Sin audio
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-11 rounded-md bg-sunken px-4 text-sm text-fg"
                onClick={() => setExportOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink"
                onClick={() => void onExport()}
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exporting || exportError || exportNote ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-bg/75 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="export-status-title" className="w-full max-w-sm rounded-lg border border-line bg-raised p-5">
            <h2 id="export-status-title" className="text-base font-semibold">{exportError ? "No se exportó" : exportNote ? "Listo" : "Exportando"}</h2>
            <p className="mt-1 text-sm text-muted">
              {exportError ?? exportNote ?? "Estamos armando el archivo. No cierres la pestaña."}
            </p>
            {exportFile ? (
              <video
                className="mt-3 max-h-40 w-full rounded-md bg-black"
                src={URL.createObjectURL(exportFile.blob)}
                controls
                playsInline
              />
            ) : null}
            {exportError || exportNote ? null : (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              {exportFile ? (
                <>
                  <button
                    type="button"
                    className="h-11 rounded-md bg-sunken px-4 text-sm text-fg"
                    onClick={() => openBlob(exportFile.blob)}
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink"
                    onClick={() => {
                    void saveBlob(exportFile.blob, exportFile.name).catch((err) => {
                      setExportError(err instanceof Error ? err.message : "No se pudo descargar.");
                    });
                  }}
                  >
                    Descargar
                  </button>
                </>
              ) : null}
              {exportError || exportNote ? (
                <button
                  type="button"
                  className="h-11 rounded-md bg-sunken px-4 text-sm text-fg"
                  onClick={() => {
                    setExportError(null);
                    setExportNote(null);
                    setExportFile(null);
                  }}
                >
                  Cerrar
                </button>
              ) : (
                <button
                  type="button"
                  className="h-11 rounded-md bg-sunken px-4 text-sm text-fg"
                  onClick={() => {
                    cancel.current = true;
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const BLOCKED_MSG = "Aquí no se permite pantalla completa. Abrí AndromedaVideoCut en una pestaña nueva.";

/** Pantalla completa de toda la app (la del visor está en la barra de reproducción). */
function FullscreenButton() {
  const [on, setOn] = useState(false);
  useEffect(() => onFullscreenChange(() => setOn(fullscreenElement() === document.documentElement)), []);
  return (
    <button
      type="button"
      onClick={() => {
        void toggleFullscreen(document.documentElement).then((r) => {
          if (r === "blocked") useEditor.getState().tell(BLOCKED_MSG);
        });
      }}
      aria-label={on ? "Salir de pantalla completa" : "App en pantalla completa"}
      title={on ? "Salir de pantalla completa" : "App en pantalla completa"}
      data-fullscreen-toggle=""
      className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-raised text-fg hover:bg-surface"
    >
      {on ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
    </button>
  );
}
