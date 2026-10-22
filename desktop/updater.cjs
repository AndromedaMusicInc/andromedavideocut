// Actualizaciones online (electron-updater, GitHub Releases de AndromedaMusicInc/andromedavideocut).
// Pregunta en español antes de descargar e instalar y muestra el progreso.
const { app, dialog, BrowserWindow } = require("electron");

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000; // cada 4 horas

function mainWindow() {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

/**
 * @param {import("electron-updater").AppUpdater} updater
 * @param {{ ask?: (opts: Electron.MessageBoxOptions) => Promise<number>, log?: (...a: unknown[]) => void }} [hooks]
 */
function setupUpdater(updater, hooks = {}) {
  const log = hooks.log ?? ((...a) => console.log("[updater]", ...a));
  const ask = hooks.ask ?? (async (opts) => {
    const win = mainWindow();
    const r = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts);
    return r.response;
  });
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  let manual = false;
  let busy = false;

  const setTitle = (text) => {
    const win = mainWindow();
    if (win) win.setTitle(text ? `AndromedaVideoCut — ${text}` : "AndromedaVideoCut");
  };

  updater.on("checking-for-update", () => log("buscando actualizaciones…"));
  updater.on("update-not-available", async (info) => {
    log("sin actualizaciones; versión", info?.version);
    busy = false;
    if (manual) {
      manual = false;
      await ask({ type: "info", title: "Actualizaciones", message: `Ya tienes la última versión (${app.getVersion()}).`, buttons: ["Aceptar"] });
    }
  });
  updater.on("update-available", async (info) => {
    log("disponible", info.version);
    manual = false;
    const choice = await ask({
      type: "question",
      title: "Actualización disponible",
      message: `Hay una nueva versión ${info.version}, ¿actualizar?`,
      detail: `Tienes la ${app.getVersion()}. Se descargará ahora y se instalará al terminar.`,
      buttons: ["Actualizar", "Más tarde"],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice !== 0) {
      log("el usuario dijo más tarde");
      busy = false;
      return;
    }
    setTitle("descargando actualización 0%");
    updater.downloadUpdate().catch((err) => log("error al descargar", err?.message));
  });
  updater.on("download-progress", (p) => {
    const pct = Math.round(p.percent);
    log(`progreso ${pct}%`);
    setTitle(`descargando actualización ${pct}%`);
    mainWindow()?.setProgressBar(p.percent / 100);
  });
  updater.on("update-downloaded", async (info) => {
    log("descargada", info.version);
    mainWindow()?.setProgressBar(-1);
    setTitle("");
    busy = false;
    const choice = await ask({
      type: "info",
      title: "Actualización lista",
      message: `La versión ${info.version} está lista.`,
      detail: "AndromedaVideoCut se cerrará para instalarla y se volverá a abrir. Guarda tu trabajo: el proyecto se guarda solo.",
      buttons: ["Instalar y reiniciar", "Al cerrar la app"],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) {
      log("instalando");
      if (!process.env.AVC_UPDATER_TEST) updater.quitAndInstall(false, true);
    } else {
      updater.autoInstallOnAppQuit = true;
    }
  });
  updater.on("error", async (err) => {
    log("error", err?.message);
    mainWindow()?.setProgressBar(-1);
    setTitle("");
    busy = false;
    if (manual) {
      manual = false;
      await ask({ type: "warning", title: "Actualizaciones", message: "No se pudo buscar actualizaciones.", detail: String(err?.message ?? err), buttons: ["Aceptar"] });
    }
  });

  const check = (isManual = false) => {
    if (busy) return;
    busy = true;
    manual = isManual;
    updater.checkForUpdates().catch((err) => {
      busy = false;
      log("error", err?.message);
    });
  };
  return { check, startSchedule: () => setInterval(() => check(false), CHECK_EVERY_MS) };
}

module.exports = { setupUpdater, CHECK_EVERY_MS };
