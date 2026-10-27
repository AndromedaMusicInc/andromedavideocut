// F1-10 · Hoja de atajos ("?", Ayuda → Atajos, menú de PC).
import { useEffect, useState } from "react";

export const SHORTCUTS: [string, string][][] = [
  [["Espacio", "Reproducir / pausar"], ["← →", "Mover cabezal 0,1 s (Shift: 1 s)"], [", .", "Cuadro anterior / siguiente"], ["Ctrl+S", "Guardar"], ["Ctrl+Z / Ctrl+Y", "Deshacer / rehacer"]],
  [["Ctrl+B · S", "Dividir en el cabezal"], ["[", "Recortar inicio al cabezal"], ["]", "Recortar final al cabezal"], ["Q", "Recortar inicio y cerrar hueco"], ["W", "Recortar final y cerrar hueco"], ["Alt+, / Alt+.", "Acortar / alargar 1 cuadro"]],
  [["Ctrl+C / Ctrl+V", "Copiar / pegar"], ["Ctrl+D", "Duplicar"], ["Ctrl+X", "Cortar"], ["Supr", "Borrar"], ["V", "Activar / desactivar clip"], ["Ctrl+A", "Seleccionar todo"], ["?", "Esta hoja"]],
];

export function ShortcutsSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen((v) => !v);
    window.addEventListener("avc:shortcuts", on);
    const q = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "?" || e.ctrlKey || e.metaKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      e.preventDefault(); on();
    };
    window.addEventListener("keydown", q);
    const d = (window as unknown as { avcDesktop?: { onMenu?: (n: string, f: () => void) => () => void } }).avcDesktop;
    const off = d?.onMenu?.("shortcuts", () => setOpen(true));
    return () => { window.removeEventListener("avc:shortcuts", on); window.removeEventListener("keydown", q); off?.(); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Atajos de teclado" data-shortcuts="" onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl rounded-lg border border-[#23232F] bg-[#11111A] p-5 text-white">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Atajos de teclado</h2>
          <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="rounded px-2 text-muted hover:text-white">✕</button></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {SHORTCUTS.map((col, i) => (
            <dl key={i} className="space-y-2 text-sm">
              {col.map(([k, d]) => (<div key={k} className="flex justify-between gap-3"><dt className="text-muted">{d}</dt><dd><kbd className="rounded border border-[#2C2C3A] bg-[#181822] px-1.5 py-0.5 font-mono text-xs">{k}</kbd></dd></div>))}
            </dl>
          ))}
        </div>
      </div>
    </div>
  );
}
