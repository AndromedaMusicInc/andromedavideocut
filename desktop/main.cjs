// AndromedaVideoCut para escritorio: ventana Electron que sirve el build estático
// por un protocolo propio (app://), porque los módulos ES no cargan desde file://.
const { app, BrowserWindow, shell, Menu, protocol, net, dialog, ipcMain, screen, systemPreferences } = require("electron");
const splash = require("./splash.cjs");
let primaryWin = null;
let mainCommitted = false;
let afterMainCommit = null;
let splashRef = null;
const mainWindow = () => (primaryWin && !primaryWin.isDestroyed() ? primaryWin : BrowserWindow.getAllWindows().find((w) => !splashRef || w !== splashRef.win) || null);
const { registerXaiIpc } = require("./xai-oauth.cjs");
const { registerProjectsIpc } = require("./projects.cjs");
const viewer = require("./viewer.cjs");
const media = require("./media.cjs");
// Las 0.x son betas; 1.0.0 será el lanzamiento oficial.
const versionLabel = () => (app.getVersion().startsWith("0.") ? `Beta ${app.getVersion()}` : app.getVersion());
const INSTAGRAM_URL = "https://www.instagram.com/andromedavideocut/";
const appTitle = () => `AndromedaVideoCut · ${versionLabel()}`;
const { setupUpdater } = require("./updater.cjs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "app");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
  { scheme: "avcmedia", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".wasm": "application/wasm",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".wav": "audio/wav", ".ogg": "audio/ogg", ".opus": "audio/ogg",
  ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
};

/** app:// con tipo MIME correcto y soporte de Range (206): <audio>/<video> lo necesitan para buscar y reproducir. */
async function serveApp(request) {
  const fs = require("fs");
  const { Readable } = require("stream");
  const { pathname } = new URL(request.url);
  const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
  if (!file.startsWith(ROOT + path.sep)) return new Response("Prohibido", { status: 403 });
  let stat;
  try {
    stat = await fs.promises.stat(file);
    if (!stat.isFile()) throw new Error("no es archivo");
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
  const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
    let end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${stat.size}` } });
    const body = Readable.toWeb(fs.createReadStream(file, { start, end }));
    return new Response(body, { status: 206, headers: { ...base, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) } });
  }
  const body = request.method === "HEAD" ? null : Readable.toWeb(fs.createReadStream(file));
  return new Response(body, { status: 200, headers: { ...base, "Content-Length": String(stat.size) } });
}

/** Permite elegir la salida de audio (setSinkId) y ver los nombres de los dispositivos, solo para app://. */
function allowAudioDevices() {
  const { session } = require("electron");
  const ses = session.defaultSession;
  const ours = (origin) => typeof origin === "string" && origin.startsWith("app://andromeda");
  const OK = new Set(["speaker-selection", "media", "audioCapture"]);
  ses.setPermissionCheckHandler((_wc, permission, origin, details) => {
    if (!ours(origin || details?.requestingUrl)) return false;
    if (permission === "media") return details?.mediaType !== "video";
    return OK.has(permission);
  });
  ses.setPermissionRequestHandler((wc, permission, cb, details) => {
    const url = details?.requestingUrl || wc.getURL();
    if (!ours(url)) return cb(false);
    if (permission === "media") return cb(!(details?.mediaTypes || []).includes("video"));
    cb(OK.has(permission));
  });
  ses.setDevicePermissionHandler?.((details) => ours(details.origin) && details.deviceType !== "hid" && details.deviceType !== "usb" && details.deviceType !== "serial");
}

/** Muestra el estado del audio (para soporte) y permite copiarlo. */
async function audioDiagnostics() {
  const win = mainWindow();
  if (!win) return;
  const js = `(async () => {
    const a = window.__avcAudio ? window.__avcAudio.info() : { state: "sin-iniciar" };
    let outs = [];
    try { outs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audiooutput").map(d => d.label || d.deviceId.slice(0, 8)); } catch (e) { outs = ["error: " + e]; }
    return { ...a, salidas: outs, sinkGuardado: localStorage.getItem("avc-audio-sink") || "predeterminado", userAgent: navigator.userAgent };
  })()`;
  let info;
  try {
    info = await win.webContents.executeJavaScript(js);
  } catch (e) {
    info = { error: String(e) };
  }
  const text = [
    `Versión: ${app.getVersion()}  ·  Windows/SO: ${process.platform} ${require("os").release()}`,
    `AudioContext: ${info.state}  ·  ${info.sampleRate || "?"} Hz  ·  sonando: ${info.active ?? 0}  ·  nivel: ${(info.level ?? 0).toFixed(3)}`,
    `Salida elegida: ${info.sinkGuardado}`,
    `Salidas disponibles: ${(info.salidas || []).join(" | ") || "ninguna"}`,
    `Sonidos cargados: ${(info.buffers || []).length}`,
    info.error ? `Último error: ${info.error}` : "",
  ].filter(Boolean).join("\n");
  const r = await dialog.showMessageBox(win, {
    type: "info",
    title: "Diagnóstico de audio",
    message: "Diagnóstico de audio",
    detail: `${text}\n\nPulsa Reproducir y vuelve a abrir este diagnóstico: “AudioContext: running” y nivel mayor que 0 indican que la app envía sonido.`,
    buttons: ["Copiar", "Cerrar"],
    defaultId: 1,
  });
  if (r.response === 0) require("electron").clipboard.writeText(text);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: appTitle(),
    backgroundColor: "#0c0c0e",
    show: false, // se muestra en ready-to-show (mientras, la pantalla de inicio)
    icon: path.join(ROOT, "brand", "favicon-180.png"),
    autoHideMenuBar: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
      // La vista previa debe sonar sin depender de la política de autoplay de Chromium.
      autoplayPolicy: "no-user-gesture-required",
      backgroundThrottling: false,
    },
  });
  primaryWin = win;
  win.webContents.once("did-navigate", () => { mainCommitted = true; afterMainCommit?.(); });
  win.once("ready-to-show", () => {
    win.show();
    // AVC_SPLASH_MIN_MS: solo para pruebas (mantener la splash un rato para probar clic/tecla).
    const hold = Number(process.env.AVC_SPLASH_MIN_MS || 0);
    setTimeout(() => { if (splashRef) splashRef.close(true); }, hold);
  });
  win.loadURL("app://andromeda/index.html");
  // Enlaces externos van al navegador del sistema; nada abre ventanas nuevas.
  win.webContents.setWindowOpenHandler(({ url, frameName }) => {
    // El visor separado es la única ventana propia permitida.
    if (frameName === viewer.VIEWER_NAME && url === "about:blank") {
      return { action: "allow", overrideBrowserWindowOptions: viewer.viewerOptions() };
    }
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("did-create-window", (child, { frameName }) => {
    if (frameName !== viewer.VIEWER_NAME) return;
    viewer.track(child);
    child.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    child.webContents.on("will-navigate", (e) => e.preventDefault());
  });
}

let updates = null;

function mainWin() {
  return BrowserWindow.getAllWindows().find((w) => w !== viewer.current() && (!splashRef || w !== splashRef.win)) || null;
}
async function toggleViewer() {
  const w = mainWin();
  if (!w) return;
  // userGesture=true: window.open necesita gesto del usuario.
  await w.webContents.executeJavaScript("window.__avcViewer ? (window.__avcViewer.isOpen() ? (window.__avcViewer.close(), 'cerrado') : (window.__avcViewer.open() ? 'abierto' : 'falló')) : 'sin-editor'", true);
}
async function openViewerOn(displayId, fullscreen) {
  viewer.moveToDisplay(displayId, fullscreen);
  if (!viewer.current()) {
    const w = mainWin();
    if (w) await w.webContents.executeJavaScript("window.__avcViewer && window.__avcViewer.open()", true);
  }
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    // Mac: menú de la app (Acerca de, Ocultar, Salir con ⌘Q) y Edición para que ⌘C/⌘V funcionen en campos de texto.
    ...(isMac
      ? [
          {
            label: "AndromedaVideoCut",
            submenu: [
              { role: "about", label: "Acerca de AndromedaVideoCut" },
              { label: "Buscar actualizaciones…", click: () => updates?.check(true) },
              { type: "separator" },
              { role: "hide", label: "Ocultar AndromedaVideoCut" },
              { role: "hideOthers", label: "Ocultar otros" },
              { role: "unhide", label: "Mostrar todo" },
              { type: "separator" },
              { role: "quit", label: "Salir de AndromedaVideoCut" },
            ],
          },
          { label: "Edición", submenu: [{ role: "undo", label: "Deshacer" }, { role: "redo", label: "Rehacer" }, { type: "separator" }, { role: "cut", label: "Cortar" }, { role: "copy", label: "Copiar" }, { role: "paste", label: "Pegar" }, { role: "selectAll", label: "Seleccionar todo" }] },
        ]
      : []),
    {
      label: "Archivo",
      submenu: isMac ? [{ role: "reload", label: "Recargar" }, { type: "separator" }, { role: "close", label: "Cerrar ventana" }] : [{ role: "reload", label: "Recargar" }, { type: "separator" }, { role: "quit", label: "Salir" }],
    },
    {
      label: "Ver",
      submenu: [
        { role: "togglefullscreen", label: "Pantalla completa" },
        { type: "separator" },
        { label: viewer.current() ? "Unir visor al editor" : "Separar visor", accelerator: "CmdOrCtrl+Shift+V", click: () => toggleViewer() },
        {
          label: "Visor en pantalla",
          submenu: screen.getAllDisplays().map((d, i) => ({
            label: `Pantalla ${i + 1}${d.id === screen.getPrimaryDisplay().id ? " (principal)" : ""} · ${d.size.width}×${d.size.height}`,
            type: "radio",
            checked: (viewer.load().displayId ?? screen.getPrimaryDisplay().id) === d.id,
            click: () => openViewerOn(d.id, true),
          })),
        },
        {
          label: "Visor en pantalla completa",
          enabled: Boolean(viewer.current()),
          click: () => {
            const v = viewer.current();
            if (v) v.setFullScreen(!v.isFullScreen());
          },
        },
        {
          label: "Visor sin marco",
          type: "checkbox",
          checked: Boolean(viewer.load().frameless),
          click: (item) => {
            viewer.save({ frameless: item.checked });
            // El marco solo se aplica al crear la ventana: se reabre si ya estaba separado.
            if (viewer.current()) {
              viewer.current().close();
              setTimeout(() => toggleViewer(), 300);
            }
          },
        },
        { type: "separator" },
        { role: "resetZoom", label: "Tamaño real" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
      ],
    },
    {
      label: "Ayuda",
      submenu: [
        { label: "Buzón de sugerencias…", click: () => mainWindow()?.webContents.send("menu", "feedback") },
        { label: "Atajos de teclado", accelerator: "Shift+/", registerAccelerator: false, click: () => mainWindow()?.webContents.send("menu", "shortcuts") },
        { label: "Buscar actualizaciones…", click: () => updates?.check(true) },
        { label: "Diagnóstico de audio…", click: () => audioDiagnostics() },
        { type: "separator" },
        { label: "Abrir registro de importación de medios", click: () => shell.showItemInFolder(media.logFile()) },
        { label: "Sitio de Andromeda Music Inc", click: () => shell.openExternal("https://andromedamusicinc.com") },
        {
          label: "Instagram @andromedavideocut",
          click: () => shell.openExternal(INSTAGRAM_URL),
        },
        { type: "separator" },
        {
          label: "Acerca de AndromedaVideoCut",
          click: () =>
            dialog.showMessageBox(mainWindow(), {
              type: "info",
              title: "Acerca de",
              message: `AndromedaVideoCut ${versionLabel()}`,
              detail: `Editor de video de Andromeda Music Inc.\nVersión ${versionLabel()}${app.getVersion().startsWith("0.") ? " (beta de prueba; la 1.0.0 será el lanzamiento oficial)" : ""} · Electron ${process.versions.electron} · Chromium ${process.versions.chrome}\nInstagram: @andromedavideocut · instagram.com/andromedavideocut\n© 2026 Andromeda Music Inc. Todos los derechos reservados.`,
              buttons: ["Aceptar", "Instagram @andromedavideocut"],
            }).then((r) => { if (r.response === 1) shell.openExternal(INSTAGRAM_URL); }),
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
    // https o el mailto: del buzón de sugerencias (solo a nuestro correo).
    if (/^https:\/\//i.test(url) || /^mailto:info@andromedamusicinc\.com\?/i.test(url)) return shell.openExternal(url);
  });
  // AVC_TEST_BROWSER=1: las pruebas simulan el navegador visitando la URL sin abrir nada.
  registerXaiIpc(process.env.AVC_TEST_BROWSER ? { testBrowser: (u) => { require("./test/fake-browser.cjs")(u); } } : {});
  protocol.handle("app", serveApp);
  registerProjectsIpc();
  media.registerMediaIpc();
  protocol.handle("avcmedia", media.serveProxy);
  ipcMain.handle("viewer:displays", () => {
    const cur = viewer.current();
    const at = cur ? screen.getDisplayMatching(cur.getBounds()).id : viewer.load().displayId ?? screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((d, i) => ({ id: d.id, label: d.label || `Pantalla ${i + 1}`, primary: d.id === screen.getPrimaryDisplay().id, current: d.id === at, w: d.size.width, h: d.size.height }));
  });
  ipcMain.handle("viewer:move", (_e, displayId, fullscreen) => openViewerOn(Number(displayId), Boolean(fullscreen)));
  ipcMain.handle("viewer:fullscreen", () => {
    const v = viewer.current();
    if (v) v.setFullScreen(!v.isFullScreen());
    return v ? v.isFullScreen() : false;
  });
  ipcMain.handle("updates:check", () => updates?.check(true));
  ipcMain.handle("file:show", (_e, p) => {
    // Solo rutas absolutas de archivos que existen (las que el usuario importó).
    if (typeof p !== "string" || !path.isAbsolute(p) || !require("fs").existsSync(p)) return false;
    shell.showItemInFolder(p);
    return true;
  });
  allowAudioDevices();
  buildMenu();
  viewer.setOnChange(() => buildMenu());
  screen.on("display-added", () => buildMenu());
  screen.on("display-removed", () => buildMenu());
  ipcMain.handle("settings:opening", (_e, on) => splash.setOpening(app.getPath("userData"), Boolean(on)).openingClip);
  if (process.platform === "darwin") app.setAboutPanelOptions({ applicationName: "AndromedaVideoCut", applicationVersion: versionLabel(), copyright: "© 2026 Andromeda Music Inc" });
  if (process.env.AVC_SMOKE) {
    // Prueba de humo (CI): la app arranca, carga el editor y se cierra sola.
    setTimeout(() => { console.log("AVC_SMOKE timeout"); app.exit(2); }, 60000);
    app.on("browser-window-created", (_e, w) => w.webContents.once("did-finish-load", () => { console.log("AVC_SMOKE OK", app.getVersion(), process.platform, process.arch, "ffmpeg:", media.hasFfmpeg ? media.hasFfmpeg() : "?"); setTimeout(() => app.exit(0), 1500); }));
  }
  createWindow(); // primero la principal: es la "primera ventana" para las pruebas y el resto del código
  if (splash.shouldShowSplash({ settings: splash.readSettings(app.getPath("userData")), reducedMotion: splash.prefersReducedMotion(systemPreferences) })) {
    // Tras empezar a cargar la principal: así la principal es siempre la "primera ventana".
    // Se abre cuando la principal ya navegó (sigue cargando): así la principal es siempre la "primera ventana".
    afterMainCommit = () => {
      if (mainWindow()?.isVisible()) return; // ya cargó: no hace falta
      splashRef = splash.createSplash(BrowserWindow, "app://andromeda/splash.html", appTitle());
      splashRef.win.on("closed", () => { splashRef = null; });
    };
    if (mainCommitted) afterMainCommit();
  }
  initUpdates();
  if (process.env.AVC_SMOKE) {
    // Prueba de humo: captura la ventana y sale.
    const win = mainWindow();
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
