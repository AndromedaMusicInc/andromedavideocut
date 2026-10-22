// Visor separado en Electron: el renderer hace window.open("about:blank", "avc-viewer") y aquí se
// convierte en un BrowserWindow propio. Recuerda posición, tamaño, monitor, marco y pantalla completa
// en userData/viewer.json. El contenido (video del lienzo) lo pone el editor; el audio se queda allí.
const { app, BrowserWindow, screen } = require("electron");
const fs = require("fs");
const path = require("path");

const file = () => path.join(app.getPath("userData"), "viewer.json");
let viewer = null;
let onChange = () => {};

function load() {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    return { frameless: false };
  }
}
function save(patch) {
  const next = { ...load(), ...patch };
  try {
    fs.writeFileSync(file(), JSON.stringify(next));
  } catch {
    /* sin disco */
  }
  return next;
}

/** Ajusta los límites guardados a una pantalla que exista (si se desconectó el monitor, va a la principal). */
function boundsFor(cfg) {
  const displays = screen.getAllDisplays();
  const display = displays.find((d) => d.id === cfg.displayId) || screen.getPrimaryDisplay();
  const wa = display.workArea;
  const b = cfg.bounds && cfg.displayId === display.id ? cfg.bounds : { width: Math.min(960, wa.width), height: Math.min(600, wa.height), x: wa.x + 40, y: wa.y + 40 };
  const width = Math.min(b.width, wa.width);
  const height = Math.min(b.height, wa.height);
  return { width, height, x: Math.min(Math.max(b.x, wa.x), wa.x + wa.width - width), y: Math.min(Math.max(b.y, wa.y), wa.y + wa.height - height) };
}

function viewerOptions() {
  const cfg = load();
  return {
    ...boundsFor(cfg),
    title: "AndromedaVideoCut · Visor",
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    frame: !cfg.frameless,
    icon: path.join(__dirname, "app", "brand", "favicon-180.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  };
}

function track(win) {
  viewer = win;
  win.setMenuBarVisibility(false);
  const cfg = load();
  if (cfg.fullscreen) win.setFullScreen(true);
  const remember = () => {
    if (win.isDestroyed() || win.isFullScreen()) return;
    const b = win.getBounds();
    save({ bounds: b, displayId: screen.getDisplayMatching(b).id });
  };
  win.on("moved", remember);
  win.on("resized", remember);
  win.on("enter-full-screen", () => save({ fullscreen: true, displayId: screen.getDisplayMatching(win.getBounds()).id }));
  win.on("leave-full-screen", () => save({ fullscreen: false }));
  win.on("closed", () => {
    viewer = null;
    onChange();
  });
  onChange();
}

/** Mueve el visor a una pantalla (y lo deja en pantalla completa allí si se pide). */
function moveToDisplay(displayId, fullscreen) {
  const d = screen.getAllDisplays().find((x) => x.id === displayId);
  if (!d) return;
  const wa = d.workArea;
  const width = Math.min(1280, wa.width);
  const height = Math.min(800, wa.height);
  const bounds = { width, height, x: wa.x + Math.round((wa.width - width) / 2), y: wa.y + Math.round((wa.height - height) / 2) };
  save({ displayId, bounds, fullscreen: Boolean(fullscreen) });
  if (viewer && !viewer.isDestroyed()) {
    if (viewer.isFullScreen()) viewer.setFullScreen(false);
    viewer.setBounds(bounds);
    if (fullscreen) setTimeout(() => viewer && viewer.setFullScreen(true), 150);
    viewer.focus();
  }
}

module.exports = {
  VIEWER_NAME: "avc-viewer",
  viewerOptions,
  track,
  moveToDisplay,
  load,
  save,
  current: () => (viewer && !viewer.isDestroyed() ? viewer : null),
  setOnChange: (fn) => (onChange = fn),
};
