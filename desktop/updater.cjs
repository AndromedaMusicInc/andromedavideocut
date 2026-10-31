// Actualizaciones online (electron-updater, GitHub Releases de AndromedaMusicInc/andromedavideocut).
// Pregunta en español antes de descargar e instalar y muestra el progreso.
const { app, dialog, BrowserWindow } = require("electron");

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000; // cada 4 horas
const RELEASES = "https://github.com/AndromedaMusicInc/andromedavideocut/releases";

// Mac sin firma de Apple: electron-updater no puede instalar solo (Squirrel.Mac exige firma).
// En Mac se avisa y se abre la descarga del .dmg de nombre fijo de la última release.
function macDownloadUrl(arch) {
  return `${RELEASES}/latest/download/AndromedaVideoCut-Mac-${arch === "arm64" ? "arm64" : "x64"}.dmg`;
}
const canSelfInstall = (platform) => platform !== "darwin";

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
  const platform = hooks.platform ?? process.platform;
  const openUrl = hooks.openUrl ?? ((u) => require("electron").shell.openExternal(u));
  updater.autoDownload = false;
  // Betas 0.0.x: se publican como release NORMAL (no pre-release) para que 0.0.2 → 0.0.3 se actualice solo.
  // Si algún día se marcan como pre-release, hay que poner allowPrerelease = true.
  updater.allowPrerelease = false;
  // Nunca bajar de versión (un PC con 1.0.x no pasa a 0.0.x: hay que reinstalar a mano).
  updater.allowDowngrade = false;
  // Windows: la actualización se instala en silencio (NSIS /S, sin asistente) y reutiliza la carpeta
  // de instalación guardada. Debe estar en true ANTES de terminar la descarga: electron-updater registra el
  // instalador "al cerrar" justo al terminarla (antes de que el usuario responda el diálogo). Solo se descarga
  // con el OK del usuario, así que no instala nada sin preguntar.
  updater.autoInstallOnAppQuit = true;
  let manual = false;
  let busy = false;

  const setTitle = (text) => {
    const win = mainWindow();
    const v = app.getVersion();
    const base = `AndromedaVideoCut · ${v.startsWith("0.") ? `Beta ${v}` : v}`;
    if (win) win.setTitle(text ? `${base} — ${text}` : base);
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
    if (!canSelfInstall(platform)) {
      busy = false;
      const c = await ask({
        type: "question",
        title: "Actualización disponible",
        message: `Hay una nueva versión ${info.version}.`,
        detail: `Tienes la ${app.getVersion()}. En Mac se instala a mano: descarga el .dmg y arrastra AndromedaVideoCut a Aplicaciones (reemplaza la anterior).`,
        buttons: ["Descargar", "Más tarde"],
        defaultId: 0,
        cancelId: 1,
      });
      if (c === 0) await openUrl(macDownloadUrl(hooks.arch ?? process.arch));
      return;
    }
    const choice = await ask({
      type: "question",
      title: "Actualización disponible",
      message: `Hay una nueva versión ${info.version}, ¿actualizar?`,
      detail: `Tienes la ${app.getVersion()}. Se descarga ahora y se instala dentro de la app, sin abrir el instalador.`,
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
      detail: "Instalando actualización, la app se reabrirá sola en unos segundos. Tu proyecto se guarda solo. Si eliges «Al cerrar la app», se instalará en silencio cuando cierres AndromedaVideoCut.",
      buttons: ["Actualizar ahora", "Al cerrar la app"],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) {
      log("instalando en silencio");
      setTitle("instalando actualización, la app se reabrirá");
      // isSilent=true: sin asistente del instalador; isForceRunAfter=true: reabre la app al terminar.
      if (!process.env.AVC_UPDATER_TEST) updater.quitAndInstall(true, true);
    } else {
      log("se instalará en silencio al cerrar la app");
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

module.exports = { setupUpdater, CHECK_EVERY_MS, macDownloadUrl, canSelfInstall };
