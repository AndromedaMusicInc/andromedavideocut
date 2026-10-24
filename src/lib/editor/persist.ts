import type { AspectId, Asset, Clip } from "@/lib/editor/types";

const KEY = "framecut.project.v1";
const DB = "framecut";
const STORE = "blobs";

export interface SavedProject {
  v: 1;
  name: string;
  aspect: AspectId;
  clips: Clip[];
  muted: Record<string, boolean>;
  hidden?: Record<string, boolean>;
  assets: Omit<Asset, "url">[];
  beats?: number[];
  bpm?: number;
  downbeat?: number;
  layers?: number;
  fxCount?: number;
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(id: string, blob: Blob) {
  const base = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = base.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  base.close();
}

export async function idbGet(id: string) {
  const base = await db();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = base.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  base.close();
  return blob;
}

export async function idbDelete(id: string) {
  const base = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = base.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  base.close();
}

export function loadProject(): SavedProject | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedProject;
    if (!data || data.v !== 1 || !Array.isArray(data.clips)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveProject(project: {
  v: 1;
  name: string;
  aspect: AspectId;
  clips: Clip[];
  muted: Record<string, boolean>;
  hidden?: Record<string, boolean>;
  assets: Asset[];
  beats?: number[];
  bpm?: number;
  downbeat?: number;
  layers?: number;
  fxCount?: number;
}) {
  const assets: Omit<Asset, "url">[] = project.assets.map((asset) => {
    const copy = { ...asset };
    delete copy.url;
    return copy;
  });
  const payload = { ...project, assets };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    const slim = assets.map((asset) => {
      const copy = { ...asset };
      delete copy.waveform;
      delete copy.thumb;
      return copy;
    });
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...project, assets: slim }));
    } catch {
      /* the browser refused to store this project */
    }
  }
}
