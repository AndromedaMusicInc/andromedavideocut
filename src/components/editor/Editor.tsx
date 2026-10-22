import { Inspector } from "@/components/editor/Inspector";
import { Library, ToolTabs } from "@/components/editor/Library";
import { Preview } from "@/components/editor/Preview";
import { Timeline } from "@/components/editor/Timeline";
import { mixer } from "@/lib/editor/audio";
import { seek, togglePlay } from "@/lib/editor/engine";
import { EXPORT_PRESETS, exportVideo, FRAME_RATES, loadPreset, openBlob, outputSize, QUALITIES, saveBlob, savePreset, type FrameRate, type PresetId, type QualityId } from "@/lib/editor/export";
import { idbGet, loadProject, saveProject } from "@/lib/editor/persist";
import { playback } from "@/lib/editor/playback";
import { useEditor } from "@/lib/editor/store";
import { ASPECTS, type AspectId, type Asset } from "@/lib/editor/types";
import { cn } from "@/lib/cn";
import { fullscreenElement, onFullscreenChange, toggleFullscreen } from "@/lib/fullscreen";
import { Download, LoaderCircle, Maximize, Minimize, Settings } from "lucide-react";
import { ConnectGrokWizard, SettingsDialog, useAiBoot } from "@/components/editor/ConnectGrok";
import { useAi } from "@/lib/ai/xai";
import { ingestFile } from "@/lib/editor/import-media";
import { useEffect, useRef, useState } from "react";

export function Editor() {
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

  useEffect(() => {
    const saved = loadProject();
    if (saved) {
      useEditor.getState().loadSaved(saved);
      void (async () => {
        const assets: Asset[] = [];
        for (const meta of saved.assets) {
          try {
            const blob = await idbGet(meta.id);
            if (!blob) continue;
            const url = URL.createObjectURL(blob);
            assets.push({ ...meta, url });
            if (meta.kind !== "image") mixer.queue(meta.id, await blob.arrayBuffer());
          } catch {
            /* skip a missing blob */
          }
        }
        if (assets.length) useEditor.getState().setAssets(assets);
      })();
    } else {
      useEditor.setState({ hydrated: true });
    }

    let timer = 0;
    const unsub = useEditor.subscribe((state) => {
      if (!state.hydrated) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        saveProject({
          v: 1,
          name: state.name,
          aspect: state.aspect,
          clips: state.clips,
          muted: state.muted,
          beats: state.beats,
          bpm: state.bpm,
          downbeat: state.downbeat,
          layers: state.layers,
          assets: state.assets,
        });
      }, 400);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
      }
      if (typing) return;
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
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key.toLowerCase() === "s") {
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
        { fileName: fileName.trim() || name, quality, fps, audio: withAudio },
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
      className="relative flex h-dvh min-h-0 w-full max-w-full flex-col overflow-hidden bg-bg text-fg"
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
            <h2 id="export-title" className="text-base font-semibold">Exportar</h2>
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
