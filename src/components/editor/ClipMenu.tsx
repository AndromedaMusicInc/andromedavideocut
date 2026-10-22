// Menú contextual (clic derecho) de los clips de la línea de tiempo. Funciona con la selección múltiple.
import { ingestFile } from "@/lib/editor/import-media";
import { mixer } from "@/lib/editor/audio";
import { playback } from "@/lib/editor/playback";
import { useEditor } from "@/lib/editor/store";
import { create } from "zustand";
import { useEffect, useRef } from "react";

export const useClipMenu = create<{ at: { x: number; y: number } | null; open: (x: number, y: number) => void; close: () => void }>((set) => ({
  at: null,
  open: (x, y) => set({ at: { x, y } }),
  close: () => set({ at: null }),
}));

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

type Item = { id: string; label: string; keys?: string; enabled: boolean; run: () => void } | "sep";

export function exportSelection(ids: string[]) {
  window.dispatchEvent(new CustomEvent("avc:export-selection", { detail: ids }));
}

export function ClipMenu() {
  const at = useClipMenu((s) => s.at);
  const close = useClipMenu((s) => s.close);
  const ref = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const replaceFor = useRef<string | null>(null);

  useEffect(() => {
    if (!at) return;
    const off = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", off, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => {
      window.removeEventListener("pointerdown", off, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
    };
  }, [at, close]);

  const state = useEditor.getState();
  const ids = at ? state.selection() : [];
  const sel = state.clips.filter((c) => ids.includes(c.id));
  const one = sel.length === 1 ? sel[0] : null;
  const t = playback.time;
  const canSplit = sel.some((c) => t > c.start + 0.05 && t < c.start + c.duration - 0.05);
  const canSeparate = sel.some((c) => c.type === "video" && c.assetId && mixer.buffers.has(c.assetId) && c.volume > 0);
  const anyOn = sel.some((c) => !c.disabled);
  const asset = one?.assetId ? state.assets.find((a) => a.id === one.assetId) : undefined;
  const desk = (window as unknown as { avcDesktop?: { showItemInFolder?: (p: string) => Promise<boolean> } }).avcDesktop;
  const canReplace = Boolean(one && (one.type === "video" || one.type === "image" || (one.type === "audio" && !one.generator)));

  const items: Item[] = [
    { id: "copy", label: "Copiar", keys: `${mod}+C`, enabled: sel.length > 0, run: () => state.copySelected() },
    { id: "cut", label: "Cortar", keys: `${mod}+X`, enabled: sel.length > 0, run: () => state.cutSelected() },
    { id: "paste", label: "Pegar", keys: `${mod}+V`, enabled: state.hasClipboard(), run: () => state.pasteClipboard() },
    { id: "delete", label: "Borrar", keys: "Supr", enabled: sel.length > 0, run: () => state.deleteSelected() },
    "sep",
    { id: "split", label: "Dividir en el cabezal", keys: `${mod}+B`, enabled: canSplit, run: () => state.splitSelection() },
    { id: "separate", label: "Separar audio", enabled: canSeparate, run: () => void state.separateAudio() },
    { id: "toggle", label: anyOn ? "Desactivar clip" : "Activar clip", keys: "V", enabled: sel.length > 0, run: () => state.toggleDisabled() },
    { id: "duplicate", label: "Duplicar", keys: `${mod}+D`, enabled: sel.length === 1, run: () => state.duplicateSelected() },
    "sep",
    {
      id: "replace",
      label: "Reemplazar clip…",
      enabled: canReplace,
      run: () => {
        replaceFor.current = one?.id ?? null;
        file.current?.click();
      },
    },
    { id: "export", label: sel.length > 1 ? `Exportar ${sel.length} clips seleccionados…` : "Exportar clip seleccionado…", enabled: sel.length > 0, run: () => exportSelection(ids) },
  ];
  if (desk?.showItemInFolder) {
    items.push({ id: "reveal", label: isMac ? "Mostrar en Finder" : "Abrir ubicación del archivo", enabled: Boolean(asset?.path), run: () => void desk.showItemInFolder!(asset!.path!) });
  }

  const accept = one?.type === "audio" ? "audio/*" : "video/*,image/*";
  // Mantener el menú dentro de la ventana.
  const x = at ? Math.min(at.x, window.innerWidth - 250) : 0;
  const y = at ? Math.min(at.y, window.innerHeight - 390) : 0;

  return (
    <>
      <input
        ref={file}
        type="file"
        accept={accept}
        className="hidden"
        data-replace-input=""
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          const id = replaceFor.current;
          if (!f || !id) return;
          useEditor.setState({ busy: "Importando…" });
          try {
            const loaded = await ingestFile(f);
            await useEditor.getState().addAsset(loaded.asset, loaded.blob);
            useEditor.getState().replaceAsset(id, loaded.asset);
          } catch {
            useEditor.getState().tell("No se pudo reemplazar con ese archivo.");
          } finally {
            useEditor.setState({ busy: null });
          }
        }}
      />
      {at ? (
        <div ref={ref} role="menu" aria-label="Acciones del clip" data-clip-menu="" className="fixed z-[60] w-60 rounded-lg border border-line bg-raised py-1 text-sm shadow-2xl" style={{ left: Math.max(4, x), top: Math.max(4, y) }}>
          {sel.length > 1 ? <p className="px-3 pb-1 pt-0.5 text-[11px] text-faint">{sel.length} clips seleccionados</p> : null}
          {items.map((it, i) =>
            it === "sep" ? (
              <div key={`s${i}`} role="separator" className="my-1 h-px bg-line" />
            ) : (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                data-menu={it.id}
                disabled={!it.enabled}
                onClick={() => {
                  close();
                  it.run();
                }}
                className="flex h-8 w-full items-center justify-between px-3 text-left text-fg hover:bg-surface focus:bg-surface focus:outline-none disabled:text-faint disabled:hover:bg-transparent"
              >
                <span>{it.label}</span>
                {it.keys ? <kbd className="font-sans text-[11px] text-muted">{it.keys}</kbd> : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </>
  );
}
