// F1-01 · Historial de versiones: lista los puntos de control del proyecto y restaura uno (antes guarda el estado actual).
import { useEffect, useState } from "react";
import { useEditor } from "@/lib/editor/store";
import { listVersions, readVersion, reasonLabel, type VersionMeta, type VersionReason } from "@/lib/editor/versions";

const fmt = (ts: number) => new Date(ts).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function VersionsSheet({ projectId, checkpoint }: { projectId: string; checkpoint: (r: VersionReason) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<VersionMeta[] | null>(null);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("avc:versions", on);
    return () => window.removeEventListener("avc:versions", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    setList(null);
    void listVersions(projectId).then(setList);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [open, projectId]);
  if (!open) return null;

  async function restore(v: VersionMeta) {
    const data = await readVersion(projectId, v.ts);
    if (!data) return useEditor.getState().tell("No se pudo leer esa versión.");
    await checkpoint("restaurar");
    const now = new Map(useEditor.getState().assets.map((a) => [a.id, a]));
    useEditor.getState().loadSaved(data);
    useEditor.getState().setAssets(useEditor.getState().assets.map((a) => now.get(a.id) ?? { ...a, status: "error", error: "Falta el archivo: vuelve a importarlo." }));
    setOpen(false);
    useEditor.getState().tell(`Versión del ${fmt(v.ts)} restaurada. La anterior quedó guardada en el historial.`);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Historial de versiones" data-versions="" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg border border-[#23232F] bg-[#11111A] p-5 text-white">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Historial de versiones</h2>
          <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="rounded px-2 text-muted hover:text-white">✕</button></div>
        <p className="mb-3 text-xs text-muted">Se guarda un punto de control al abrir, cada 2 minutos de edición y con Ctrl+S. Se conservan los últimos 30.</p>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {list === null ? <p className="text-sm text-muted">Cargando…</p> : list.length === 0 ? <p className="text-sm text-muted" data-versions-empty="">Aún no hay versiones.</p> :
            list.map((v) => (
              <div key={v.ts} data-version={v.ts} className="flex items-center justify-between rounded border border-[#23232F] px-3 py-2 text-sm">
                <div><div>{fmt(v.ts)}</div><div className="text-xs text-muted">{reasonLabel(v.reason)} · {v.clips} clips</div></div>
                <button type="button" data-version-restore="" onClick={() => void restore(v)} className="rounded bg-[#23232F] px-3 py-1 text-xs hover:bg-[#2C2C3A]">Restaurar</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
