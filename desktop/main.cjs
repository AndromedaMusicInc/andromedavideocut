// AndromedaVideoCut para escritorio: ventana Electron que sirve el build estático
// por un protocolo propio (app://), porque los módulos ES no cargan desde file://.
const { app, BrowserWindow, shell, Menu, protocol, net, dialog, ipcMain } = require("electron");
const { registerXaiIpc } = require("./xai-oauth.cjs");
const { setupUpdater } = require("./updater.cjs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "app");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: "AndromedaVideoCut",
    backgroundColor: "#0c0c0e",
    icon: path.join(ROOT, "brand", "favicon-180.png"),
    autoHideMenuBar: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, "preload.cjs") },
  });
  win.loadURL("app://andromeda/index.html");
  // Enlaces externos van al navegador del sistema; nada abre ventanas nuevas.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

let updates = null;

function buildMenu() {
  const template = [
    {
      label: "Archivo",
      submenu: [{ role: "reload", label: "Recargar" }, { type: "separator" }, { role: "quit", label: "Salir" }],
    },
    {
      label: "Ver",
      submenu: [
        { role: "togglefullscreen", label: "Pantalla completa" },
        { role: "resetZoom", label: "Tamaño real" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
      ],
    },
    {
      label: "Ayuda",
      submenu: [
        { label: "Buscar actualizaciones…", click: () => updates?.check(true) },
        { type: "separator" },
        { label: "Sitio de Andromeda Music Inc", click: () => shell.openExternal("https://andromedamusicinc.com") },
        {
          label: "Acerca de AndromedaVideoCut",
          click: () =>
            dialog.showMessageBox(BrowserWindow.getAllWindows()[0], {
              type: "info",
              title: "Acerca de",
              message: `AndromedaVideoCut ${app.getVersion()}`,
              detail: `Editor de video de Andromeda Music Inc.\nVersión ${app.getVersion()} · Electron ${process.versions.electron} · Chromium ${process.versions.chrome}\n© 2026 Andromeda Music Inc. Todos los derechos reservados.`,
              buttons: ["Aceptar"],
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function initUpdates() {
  let updater;
  if (process.env.AVC_UPDATER_TEST) {
    // Prueba local: NsisUpdater contra un servidor "generic" (dev-app-update.yml), respuestas automáticas.
    const { NsisUpdater } = require("electron-updater");
    updater = new NsisUpdater({ provider: "generic", url: process.env.AVC_UPDATER_TEST });
    updater.forceDevUpdateConfig = true;
    const cfgPath = path.join(app.getPath("temp"), "avc-dev-app-update.yml");
    require("fs").writeFileSync(cfgPath, `provider: generic\nurl: ${process.env.AVC_UPDATER_TEST}\nupdaterCacheDirName: andromedavideocut-desktop-updater-test\n`);
    updater.updateConfigPath = cfgPath;
    updater.verifyUpdateCodeSignature = async () => null;
    updates = setupUpdater(updater, {
      ask: async (opts) => {
        console.log("[dialogo]", opts.message, "|", (opts.buttons || []).join(" / "));
        return 0;
      },
    });
  } else {
    if (!app.isPackaged) return;
    updater = require("electron-updater").autoUpdater;
    updates = setupUpdater(updater);
  }
  setTimeout(() => updates.check(false), 5000); // al iniciar
  updates.startSchedule(); // y cada 4 horas
}
app.whenReady().then(() => {
  process.env.AVC_APP_VERSION = app.getVersion();
  ipcMain.handle("open-external", (_e, url) => {
    if (/^https:\/\//i.test(url)) return shell.openExternal(url);
  });
  // AVC_TEST_BROWSER=1: las pruebas simulan el navegador visitando la URL sin abrir nada.
  registerXaiIpc(process.env.AVC_TEST_BROWSER ? { testBrowser: (u) => { require("./test/fake-browser.cjs")(u); } } : {});
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT)) return new Response("Prohibido", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  buildMenu();
  createWindow();
  initUpdates();
  if (process.env.AVC_SMOKE) {
    // Prueba de humo: captura la ventana y sale.
    const win = BrowserWindow.getAllWindows()[0];
    win.webContents.on("console-message", (e) => console.log("[consola]", e.level, e.message));
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        const name = await win.webContents.executeJavaScript('document.querySelector("input[aria-label=\'Nombre del proyecto\']")?.value || "NO CARGÓ"');
        console.log("demo:", name);
        const img = await win.webContents.capturePage();
        require("fs").writeFileSync(process.env.AVC_SMOKE, img.toPNG());
        app.quit();
      }, 4000);
    });
  }
});
app.on("window-all-closed", () => app.quit());
