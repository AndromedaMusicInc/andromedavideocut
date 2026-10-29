// Varios proyectos. Índice con id, nombre, formato, miniatura y fechas; cada proyecto aparte.
// Escritorio: archivos JSON en userData/projects (vía IPC). Web: localStorage.
// Los archivos multimedia siguen en IndexedDB por id de recurso (en Electron también vive en userData).
import { idbDelete, idbGet, idbPut, type SavedProject } from "@/lib/editor/persist";
import { deleteVersions, listVersions, readVersion } from "@/lib/editor/versions";
import { DEMO_CLIPS, type AspectId, type Clip } from "@/lib/editor/types";

export const LEGACY_KEY = "framecut.project.v1";
const INDEX_KEY = "avc.projects.v2";
const DATA_KEY = (id: string) => `avc.project.v2.${id}`;
const MIGRATED_KEY = "avc.projects.migrated";

export interface ProjectMeta {
  id: string;
  name: string;
  aspect: AspectId;
  thumb?: string;
  createdAt: number;
  updatedAt: number;
  /** Tamaño aproximado (archivos importados + proyecto), en bytes. */
  bytes?: number;
  /** Duración de la línea de tiempo, en segundos. */
  duration?: number;
  /** En la papelera desde esta fecha (se puede recuperar). */
  trashedAt?: number;
}

interface DesktopProjects {
  list(): Promise<ProjectMeta[]>;
  read(id: string): Promise<SavedProject | null>;
  write(meta: ProjectMeta, data: SavedProject | null): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}

function desktop(): DesktopProjects | null {
  return (window as unknown as { avcDesktop?: { projects?: DesktopProjects } }).avcDesktop?.projects ?? null;
}

export function newId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function lsIndex(): ProjectMeta[] {
  try {
    const list = JSON.parse(localStorage.getItem(INDEX_KEY) || "[]") as ProjectMeta[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function lsSetIndex(list: ProjectMeta[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    // Sin espacio: quita miniaturas y reintenta.
    localStorage.setItem(INDEX_KEY, JSON.stringify(list.map(({ thumb: _t, ...m }) => m)));
  }
}

export function stripUrls(project: SavedProject): SavedProject {
  return { ...project, assets: project.assets.map(({ ...a }) => { delete (a as { url?: string }).url; return a; }) };
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await migrateLegacy();
  const d = desktop();
  const list = d ? await d.list() : lsIndex();
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 0.0.3 (QA): la tarjeta de inicio decía "0.0K | 00:00" sin miniatura aunque el proyecto tuviera clips, porque los
 * metadatos se guardaban sin tamaño/duración (guardado rápido al salir) o antes de que el visor dibujara. Aquí se
 * calculan de los datos reales: duración = fin del último clip, tamaño = archivos importados + proyecto,
 * miniatura = la del primer clip de video/imagen (o la del primer medio).
 */
export async function enrichMeta(meta: ProjectMeta): Promise<ProjectMeta> {
  if (meta.bytes && meta.duration && meta.thumb) return meta;
  const data = await readProject(meta.id).catch(() => null);
  if (!data) return meta;
  const clips = data.clips ?? [];
  const duration = meta.duration || clips.reduce((m, c) => Math.max(m, (Number(c.start) || 0) + (Number(c.duration) || 0)), 0);
  let bytes = meta.bytes || 0;
  if (!bytes) {
    bytes = JSON.stringify(clips).length;
    for (const a of data.assets ?? []) bytes += (await idbGet(a.id).catch(() => undefined))?.size ?? 0;
  }
  let thumb = meta.thumb;
  if (!thumb) {
    const first = [...clips].filter((c) => (c.type === "video" || c.type === "image") && c.assetId).sort((a, b) => a.start - b.start)[0];
    const byId = new Map((data.assets ?? []).map((a) => [a.id, a]));
    thumb = (first && byId.get(first.assetId!)?.thumb) || (data.assets ?? []).find((a) => a.thumb)?.thumb;
  }
  const next = { ...meta, duration, bytes, thumb };
  if (next.duration !== meta.duration || next.bytes !== meta.bytes || next.thumb !== meta.thumb) await writeProject(next, null).catch(() => false);
  return next;
}

export async function listProjectsFull(): Promise<ProjectMeta[]> {
  return Promise.all((await listProjects()).map((m) => enrichMeta(m)));
}

export async function readProject(id: string): Promise<SavedProject | null> {
  const d = desktop();
  if (d) return d.read(id);
  try {
    const data = JSON.parse(localStorage.getItem(DATA_KEY(id)) || "null") as SavedProject | null;
    return data && Array.isArray(data.clips) ? data : null;
  } catch {
    return null;
  }
}

/** Guarda datos y/o metadatos. `data` null = solo metadatos (renombrar). */
export async function writeProject(meta: ProjectMeta, data: SavedProject | null) {
  const d = desktop();
  if (d) return d.write(meta, data ? stripUrls(data) : null);
  if (data) {
    const clean = stripUrls(data);
    try {
      localStorage.setItem(DATA_KEY(meta.id), JSON.stringify(clean));
    } catch {
      const slim = { ...clean, assets: clean.assets.map(({ waveform: _w, thumb: _t, ...a }) => a) };
      try {
        localStorage.setItem(DATA_KEY(meta.id), JSON.stringify(slim));
      } catch {
        return false;
      }
    }
  }
  const list = lsIndex().filter((p) => p.id !== meta.id);
  lsSetIndex([meta, ...list]);
  return true;
}

export async function deleteProject(id: string) {
  const data = await readProject(id);
  // Candidatos a borrar: medios del proyecto y de su historial (incluye los quitados de la biblioteca).
  const mine = new Set((data?.assets ?? []).map((a) => a.id));
  for (const v of await listVersions(id)) for (const a of (await readVersion(id, v.ts))?.assets ?? []) mine.add(a.id);
  const d = desktop();
  if (d) await d.remove(id);
  else {
    await deleteVersions(id);
    localStorage.removeItem(DATA_KEY(id));
    lsSetIndex(lsIndex().filter((p) => p.id !== id));
  }
  // Borra los archivos que ningún otro proyecto usa.
  if (mine.size) {
    const used = new Set<string>();
    for (const p of await listProjects()) {
      const other = await readProject(p.id);
      for (const a of other?.assets ?? []) used.add(a.id);
      // F1-01: también cuentan los medios que usa alguna versión del historial de otro proyecto.
      for (const v of await listVersions(p.id)) for (const a of (await readVersion(p.id, v.ts))?.assets ?? []) used.add(a.id);
    }
    for (const a of mine) if (!used.has(a)) await idbDelete(a).catch(() => {});
  }
}

export async function duplicateProject(id: string): Promise<ProjectMeta | null> {
  const list = await listProjects();
  const meta = list.find((p) => p.id === id);
  const data = await readProject(id);
  if (!meta || !data) return null;
  // Copia los archivos con id nuevo para que borrar uno no afecte al otro.
  const map = new Map<string, string>();
  const assets = [];
  for (const a of data.assets) {
    const nid = `${a.id}-c${Math.random().toString(36).slice(2, 6)}`;
    const blob = await idbGet(a.id).catch(() => undefined);
    if (blob) await idbPut(nid, blob);
    map.set(a.id, nid);
    assets.push({ ...a, id: nid });
  }
  const clips = data.clips.map((c: Clip) => (c.assetId && map.has(c.assetId) ? { ...c, assetId: map.get(c.assetId) } : c));
  const now = Date.now();
  const copy: ProjectMeta = { ...meta, id: newId(), name: `${meta.name} (copia)`.slice(0, 48), createdAt: now, updatedAt: now };
  await writeProject(copy, { ...data, name: copy.name, assets, clips });
  return copy;
}

export function blankProject(name: string, aspect: AspectId, template: "vacio" | "ejemplo"): SavedProject {
  return {
    v: 1,
    name,
    aspect,
    clips: template === "ejemplo" ? DEMO_CLIPS.map((c) => ({ ...c })) : [],
    muted: {},
    assets: [],
  };
}

export async function createProject(name: string, aspect: AspectId, template: "vacio" | "ejemplo") {
  const now = Date.now();
  const meta: ProjectMeta = { id: newId(), name, aspect, createdAt: now, updatedAt: now };
  await writeProject(meta, blankProject(name, aspect, template));
  return meta;
}

/** Migra el proyecto único de la 1.0.0 (framecut.project.v1) sin borrarlo. */
let migrating: Promise<void> | null = null;
export function migrateLegacy() {
  migrating ??= (async () => {
    try {
      if (localStorage.getItem(MIGRATED_KEY)) return;
      const raw = localStorage.getItem(LEGACY_KEY);
      const d = desktop();
      const existing = d ? await d.list() : lsIndex();
      if (raw && !existing.length) {
        const data = JSON.parse(raw) as SavedProject;
        if (data && Array.isArray(data.clips)) {
          const now = Date.now();
          await writeProject({ id: newId(), name: data.name || "Mi primer reel", aspect: data.aspect || "9:16", createdAt: now, updatedAt: now }, data);
        }
      }
      if (!raw && !existing.length) {
        // Primera vez: el proyecto de ejemplo de siempre.
        const now = Date.now();
        await writeProject({ id: newId(), name: "Mi primer reel", aspect: "9:16", createdAt: now, updatedAt: now }, blankProject("Mi primer reel", "9:16", "ejemplo"));
      }
      // La clave vieja se conserva como respaldo; solo se marca como migrada.
      localStorage.setItem(MIGRATED_KEY, String(Date.now()));
    } catch {
      /* si falla, se reintenta en el próximo arranque */
      migrating = null;
    }
  })();
  return migrating;
}

/** Renombra en la lista y dentro del proyecto (si no, el editor volvería a poner el nombre viejo). */
export async function renameProject(meta: ProjectMeta, name: string) {
  const clean = (name.trim() || meta.name).slice(0, 48);
  const data = await readProject(meta.id);
  return writeProject({ ...meta, name: clean, updatedAt: Date.now() }, data ? { ...data, name: clean } : null);
}

export async function trashProject(meta: ProjectMeta) {
  return writeProject({ ...meta, trashedAt: Date.now() }, null);
}
export async function restoreProject(meta: ProjectMeta) {
  const { trashedAt: _t, ...rest } = meta;
  return writeProject({ ...rest, updatedAt: Date.now() }, null);
}

/** "2.1G", "54.1M", "69.0K" como CapCut. */
export function formatBytes(n = 0) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return `${(n / 1e3).toFixed(1)}K`;
}
/** "03:47" (o "1:02:05"). */
export function formatDuration(sec = 0) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDate(ms: number) {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(ms);
}
