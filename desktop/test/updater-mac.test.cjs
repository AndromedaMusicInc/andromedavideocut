// Versión Mac: sin firma no se autoinstala; avisa y abre la descarga del .dmg. node --test test/updater-mac.test.cjs
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");
const EventEmitter = require("events");
const orig = Module._load;
Module._load = function (req, ...a) {
  if (req === "electron") return { app: { getVersion: () => "0.0.8" }, dialog: {}, BrowserWindow: { getAllWindows: () => [] }, shell: {} };
  return orig.call(this, req, ...a);
};
const u = require("../updater.cjs");
Module._load = orig;

function fake() {
  const e = new EventEmitter();
  e.downloads = 0;
  e.downloadUpdate = async () => { e.downloads++; };
  e.checkForUpdates = async () => {};
  return e;
}
const tick = () => new Promise((r) => setImmediate(r));

describe("actualizaciones en Mac", () => {
  it("URL fija por arquitectura", () => {
    assert.match(u.macDownloadUrl("arm64"), /releases\/latest\/download\/AndromedaVideoCut-Mac-arm64\.dmg$/);
    assert.match(u.macDownloadUrl("x64"), /AndromedaVideoCut-Mac-x64\.dmg$/);
  });
  it("solo Mac no se autoinstala", () => {
    assert.equal(u.canSelfInstall("darwin"), false);
    assert.equal(u.canSelfInstall("win32"), true);
  });
  it("Mac: 'Descargar' abre el .dmg y no descarga con el actualizador", async () => {
    const up = fake(); const opened = []; let msg;
    u.setupUpdater(up, { platform: "darwin", arch: "arm64", log() {}, ask: async (o) => { msg = o; return 0; }, openUrl: (x) => opened.push(x) });
    up.emit("update-available", { version: "0.0.9" }); await tick();
    assert.deepEqual(msg.buttons, ["Descargar", "Más tarde"]);
    assert.equal(opened.length, 1); assert.match(opened[0], /Mac-arm64\.dmg$/);
    assert.equal(up.downloads, 0);
  });
  it("Mac: 'Más tarde' no abre nada", async () => {
    const up = fake(); const opened = [];
    u.setupUpdater(up, { platform: "darwin", arch: "x64", log() {}, ask: async () => 1, openUrl: (x) => opened.push(x) });
    up.emit("update-available", { version: "0.0.9" }); await tick();
    assert.equal(opened.length, 0); assert.equal(up.downloads, 0);
  });
  it("Windows sigue descargando con el actualizador", async () => {
    const up = fake(); const opened = [];
    u.setupUpdater(up, { platform: "win32", log() {}, ask: async () => 0, openUrl: (x) => opened.push(x) });
    up.emit("update-available", { version: "0.0.9" }); await tick();
    assert.equal(up.downloads, 1); assert.equal(opened.length, 0);
  });
});
