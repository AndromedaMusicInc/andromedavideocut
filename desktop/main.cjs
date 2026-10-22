// AndromedaVideoCut para escritorio: ventana Electron que sirve el build estático
// por un protocolo propio (app://), porque los módulos ES no cargan desde file://.
const { app, BrowserWindow, shell, Menu, protocol, net } = require("electron");
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
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL("app://andromeda/index.html");
  // Enlaces externos van al navegador del sistema; nada abre ventanas nuevas.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT)) return new Response("Prohibido", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
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
