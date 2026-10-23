// B17 · Pantalla de inicio estilo FL Studio (PC). Ventana sin bordes, transparente, siempre encima, centrada,
// fuera de la barra de tareas; visible mientras carga la app y se cierra con fundido en ready-to-show.
// Preferencia: userData/settings.json { openingClip: "off" } (el renderer la escribe desde Ajustes).
const fs = require("fs");
const path = require("path");

const W = 480, H = 540, FADE_MS = 250, MAX_MS = 10000;

function settingsPath(userData) { return path.join(userData, "settings.json"); }
function readSettings(userData) {
  try { return JSON.parse(fs.readFileSync(settingsPath(userData), "utf8")) || {}; } catch { return {}; }
}
function writeSettings(userData, patch) {
  const next = { ...readSettings(userData), ...patch };
  fs.mkdirSync(userData, { recursive: true });
  const tmp = settingsPath(userData) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, settingsPath(userData));
  return next;
}
function setOpening(userData, on) { return writeSettings(userData, { openingClip: on ? "on" : "off" }); }

/** Movimiento reducido del sistema (Windows/macOS). AVC_REDUCED_MOTION=1 lo fuerza en pruebas. */
function prefersReducedMotion(systemPreferences) {
  if (process.env.AVC_REDUCED_MOTION === "1") return true;
  try {
    const a = systemPreferences?.getAnimationSettings?.();
    if (a && (a.prefersReducedMotion || a.shouldRenderRichAnimation === false)) return true;
  } catch { /* plataforma sin esta API */ }
  return false;
}

function shouldShowSplash({ settings, reducedMotion, env = process.env }) {
  if (env.AVC_NO_SPLASH === "1") return false;
  if (reducedMotion) return false;
  return (settings || {}).openingClip !== "off";
}

/** Crea la splash. `url` es la página (app://andromeda/splash.html). Devuelve { win, close(fade) }. */
function createSplash(BrowserWindow, url, title = "AndromedaVideoCut") {
  const win = new BrowserWindow({
    width: W, height: H, center: true, frame: false, transparent: true, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, alwaysOnTop: true, skipTaskbar: true,
    hasShadow: false, show: false, backgroundColor: "#00000000", title,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  let closed = false;
  win.on("closed", () => { closed = true; });
  win.once("ready-to-show", () => { if (!closed) win.showInactive ? win.show() : win.show(); });
  win.loadURL(url);
  const close = (fade = true) => {
    if (closed || win.isDestroyed()) return;
    if (!fade) { win.destroy(); return; }
    win.webContents.executeJavaScript("document.documentElement.classList.add('out')").catch(() => {});
    setTimeout(() => { if (!win.isDestroyed()) win.destroy(); }, FADE_MS + 30);
  };
  const cap = setTimeout(() => close(false), MAX_MS); // nunca se queda colgada
  cap.unref?.();
  return { win, close, isClosed: () => closed || win.isDestroyed() };
}

module.exports = { readSettings, writeSettings, setOpening, prefersReducedMotion, shouldShowSplash, createSplash, settingsPath, W, H, FADE_MS };
