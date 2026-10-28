// F1-01 · Guardado a prueba de fallas: puntos de control (historial de versiones) y marca de sesión para detectar cierres inesperados.
// PC: userData/projects/history/<id>/<ts>.json (IPC, escritura atómica). Web: IndexedDB "avc-versions".
import type { SavedProject } from "@/lib/editor/persist";

export type VersionReason = "auto" | "manual" | "abrir" | "restaurar";
export interface VersionMeta { ts: number; reason: VersionReason; bytes: number; clips: number }
export const CHECKPOINT_EVERY = 2 * 60 * 1000;
export const KEEP_VERSIONS = 30;

/** ¿Toca un punto de control automático? */
export const dueCheckpoint = (last: number, now: number, every = CHECKPOINT_EVERY) => now - last >= every;

/** Qué versiones borrar: se quedan las `keep` más nuevas, y siempre la manual más reciente. */
export function pruneVersions(list: VersionMeta[], keep = KEEP_VERSIONS): number[] {
  const sorted = [...list].sort((a, b) => b.ts - a.ts);
  const lastManual = sorted.find((v) => v.reason === "manual")?.ts;
  return sorted.slice(keep).filter((v) => v.ts !== lastManual).map((v) => v.ts);
}

export function reasonLabel(r: VersionReason) {
  return r === "manual" ? "Guardado (Ctrl+S)" : r === "abrir" ? "Al abrir el proyecto" : r === "restaurar" ? "Antes de restaurar" : "Automático";
}

interface DesktopVersions {
  list(id: string): Promise<VersionMeta[]>;
  save(id: string, meta: VersionMeta, data: SavedProject): Promise<boolean>;
  read(id: string, ts: number): Promise<SavedProject | null>;
  remove(id: string, ts: number[]): Promise<boolean>;
}
const desk = () => (window as unknown as { avcDesktop?: { versions?: DesktopVersions } }).avcDesktop?.versions ?? null;

// ── Web: IndexedDB ──
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open("avc-versions", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("v");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
const key = (id: string, ts: number) => `${id}:${String(ts).padStart(15, "0")}`;
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const r = fn(d.transaction("v", mode).objectStore("v"));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const range = (id: string) => IDBKeyRange.bound(`${id}:`, `${id}:\uffff`);

export async function listVersions(id: string): Promise<VersionMeta[]> {
  const d = desk();
  if (d) return (await d.list(id)) ?? [];
  try {
    const rows = await tx("readonly", (s) => s.getAll(range(id)) as IDBRequest<{ meta: VersionMeta }[]>);
    return rows.map((r) => r.meta).sort((a, b) => b.ts - a.ts);
  } catch { return []; }
}

export async function readVersion(id: string, ts: number): Promise<SavedProject | null> {
  const d = desk();
  if (d) return d.read(id, ts);
  try { return ((await tx("readonly", (s) => s.get(key(id, ts)))) as { data: SavedProject } | undefined)?.data ?? null; } catch { return null; }
}

export async function saveVersion(id: string, data: SavedProject, reason: VersionReason, now = Date.now()): Promise<boolean> {
  const text = JSON.stringify(data);
  const meta: VersionMeta = { ts: now, reason, bytes: text.length, clips: data.clips.length };
  const d = desk();
  try {
    if (d) { if (!(await d.save(id, meta, data))) return false; }
    else await tx("readwrite", (s) => s.put({ meta, data: JSON.parse(text) }, key(id, now)));
    const drop = pruneVersions(await listVersions(id));
    if (drop.length) {
      if (d) await d.remove(id, drop);
      else for (const ts of drop) await tx("readwrite", (s) => s.delete(key(id, ts)));
    }
    return true;
  } catch { return false; }
}

export async function deleteVersions(id: string) {
  const d = desk();
  if (d) return d.remove(id, (await d.list(id)).map((v) => v.ts));
  try { await tx("readwrite", (s) => s.delete(range(id))); } catch { /* nada */ }
}

// ── Marca de sesión: si al abrir sigue puesta, la app se cerró sin despedirse (crash, corte de luz, kill). ──
const SESSION = (id: string) => `avc.session.${id}`;
export function openSession(id: string): boolean {
  let crashed = false;
  try { crashed = !!localStorage.getItem(SESSION(id)); localStorage.setItem(SESSION(id), String(Date.now())); } catch { /* sin almacenamiento */ }
  return crashed;
}
export function closeSession(id: string) {
  try { localStorage.removeItem(SESSION(id)); } catch { /* nada */ }
}
