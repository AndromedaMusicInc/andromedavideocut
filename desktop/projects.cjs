// Proyectos en el disco del usuario: %APPDATA%/AndromedaVideoCut/projects/{index.json, <id>.json}.
// Escritura atómica (tmp + rename) para no corromper un proyecto si se corta la luz.
const { app, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

const dir = () => path.join(app.getPath("userData"), "projects");
const idOk = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
const MAX = 50 * 1024 * 1024;

function atomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}
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
    try {
      return JSON.parse(fs.readFileSync(path.join(dir(), `${id}.json`), "utf8"));
    } catch {
      return null;
    }
  });
  ipcMain.handle("projects:write", (_e, meta, data) => {
    if (!meta || !idOk(meta.id)) return false;
    try {
      if (data) {
        const text = JSON.stringify(data);
        if (text.length > MAX) return false;
        atomic(path.join(dir(), `${meta.id}.json`), text);
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

module.exports = { registerProjectsIpc };
