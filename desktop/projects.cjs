// Proyectos en el disco del usuario: %APPDATA%/AndromedaVideoCut/projects/{index.json, <id>.json}.
// Escritura atómica (tmp + rename) para no corromper un proyecto si se corta la luz.
const { app, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

const dir = () => path.join(app.getPath("userData"), "projects");
const idOk = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
const MAX = 50 * 1024 * 1024;

function atomic(file, text, keepBak = false) {
  const tmp = `${file}.tmp`;
  // fsync antes del rename: si se corta la luz, o queda el archivo viejo o el nuevo completo.
  const fd = fs.openSync(tmp, "w");
  try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  // F1-01: copia del último guardado bueno, por si el principal se daña.
  if (keepBak && fs.existsSync(file)) { try { fs.copyFileSync(file, `${file}.bak`); } catch { /* sigue */ } }
  fs.renameSync(tmp, file);
}
// F1-01 (tanda 2): si quedó un .tmp huérfano (corte entre escribir y renombrar), válido y más nuevo
// que el principal, se usa ese y se promueve a principal.
function mtime(f) { try { return fs.statSync(f).mtimeMs; } catch { return -1; } }
function readJson(file) {
  const tmp = `${file}.tmp`;
  if (fs.existsSync(tmp)) {
    try {
      const d = JSON.parse(fs.readFileSync(tmp, "utf8"));
      if (d && Array.isArray(d.clips) && mtime(tmp) > mtime(file)) {
        try { if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`); fs.renameSync(tmp, file); } catch { /* sigue */ }
        return d;
      }
    } catch { /* .tmp a medias: se descarta */ }
    try { fs.rmSync(tmp, { force: true }); } catch { /* nada */ }
  }
  for (const f of [file, `${file}.bak`]) {
    try {
      const d = JSON.parse(fs.readFileSync(f, "utf8"));
      if (d && Array.isArray(d.clips)) return d;
    } catch { /* prueba la copia */ }
  }
  return null;
}
const hdir = (id) => path.join(dir(), "history", id);
function readIndex() {
  try {
    const list = JSON.parse(fs.readFileSync(path.join(dir(), "index.json"), "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function cleanMeta(m) {
  return {
    id: m.id,
    name: String(m.name || "Sin título").slice(0, 48),
    aspect: ["9:16", "16:9", "1:1", "4:5"].includes(m.aspect) ? m.aspect : "9:16",
    thumb: typeof m.thumb === "string" && m.thumb.startsWith("data:image/") && m.thumb.length < 200_000 ? m.thumb : undefined,
    createdAt: Number(m.createdAt) || Date.now(),
    updatedAt: Number(m.updatedAt) || Date.now(),
    bytes: Number(m.bytes) || 0,
    duration: Number(m.duration) || 0,
    trashedAt: Number(m.trashedAt) || undefined,
  };
}

function registerProjectsIpc() {
  fs.mkdirSync(dir(), { recursive: true });
  ipcMain.handle("projects:list", () => readIndex());
  ipcMain.handle("projects:read", (_e, id) => {
    if (!idOk(id)) return null;
    return readJson(path.join(dir(), `${id}.json`));
  });
  // F1-01 · historial de versiones
  const tsOk = (ts) => Number.isSafeInteger(ts) && ts > 0;
  ipcMain.handle("versions:list", (_e, id) => {
    if (!idOk(id)) return [];
    try {
      return JSON.parse(fs.readFileSync(path.join(hdir(id), "index.json"), "utf8"));
    } catch {
      return [];
    }
  });
  ipcMain.handle("versions:save", (_e, id, meta, data) => {
    if (!idOk(id) || !meta || !tsOk(meta.ts) || !data) return false;
    try {
      const text = JSON.stringify(data);
      if (text.length > MAX) return false;
      fs.mkdirSync(hdir(id), { recursive: true });
      atomic(path.join(hdir(id), `${meta.ts}.json`), text);
      let list = [];
      try { list = JSON.parse(fs.readFileSync(path.join(hdir(id), "index.json"), "utf8")); } catch { /* nuevo */ }
      const m = { ts: meta.ts, reason: String(meta.reason).slice(0, 12), bytes: text.length, clips: Number(meta.clips) || 0 };
      atomic(path.join(hdir(id), "index.json"), JSON.stringify([m, ...list.filter((v) => v.ts !== m.ts)]));
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("versions:read", (_e, id, ts) => (idOk(id) && tsOk(ts) ? readJson(path.join(hdir(id), `${ts}.json`)) : null));
  ipcMain.handle("versions:remove", (_e, id, list) => {
    if (!idOk(id) || !Array.isArray(list)) return false;
    try {
      const drop = new Set(list.filter(tsOk));
      for (const ts of drop) fs.rmSync(path.join(hdir(id), `${ts}.json`), { force: true });
      let idx = [];
      try { idx = JSON.parse(fs.readFileSync(path.join(hdir(id), "index.json"), "utf8")); } catch { /* nada */ }
      atomic(path.join(hdir(id), "index.json"), JSON.stringify(idx.filter((v) => !drop.has(v.ts))));
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("projects:write", (_e, meta, data) => {
    if (!meta || !idOk(meta.id)) return false;
    try {
      if (data) {
        const text = JSON.stringify(data);
        if (text.length > MAX) return false;
        atomic(path.join(dir(), `${meta.id}.json`), text, true);
      }
      const list = readIndex().filter((p) => p.id !== meta.id);
      atomic(path.join(dir(), "index.json"), JSON.stringify([cleanMeta(meta), ...list]));
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("projects:remove", (_e, id) => {
    if (!idOk(id)) return false;
    fs.rmSync(path.join(dir(), `${id}.json`), { force: true });
    fs.rmSync(path.join(dir(), `${id}.json.bak`), { force: true });
    fs.rmSync(hdir(id), { recursive: true, force: true });
    atomic(path.join(dir(), "index.json"), JSON.stringify(readIndex().filter((p) => p.id !== id)));
    return true;
  });
  ipcMain.handle("feed:cache", (_e, op, text) => {
    const f = path.join(app.getPath("userData"), "andromeda-feed.json");
    if (op === "get") {
      try {
        return fs.readFileSync(f, "utf8");
      } catch {
        return null;
      }
    }
    if (op === "set" && typeof text === "string" && text.length < 2_000_000) atomic(f, text);
    return null;
  });
}

module.exports = { registerProjectsIpc, readJson };
