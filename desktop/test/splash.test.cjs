// B17 · splash de PC: lógica y opciones de la ventana (sin Electron). node --test test/splash.test.cjs
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const s = require("../splash.cjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "avc-splash-"));

describe("settings.json en userData", () => {
  it("sin archivo = encendida", () => assert.equal(s.shouldShowSplash({ settings: s.readSettings(tmp()), reducedMotion: false, env: {} }), true));
  it("apagar escribe openingClip:'off' y se respeta", () => {
    const d = tmp(); s.setOpening(d, false);
    assert.equal(JSON.parse(fs.readFileSync(s.settingsPath(d), "utf8")).openingClip, "off");
    assert.equal(s.shouldShowSplash({ settings: s.readSettings(d), reducedMotion: false, env: {} }), false);
    s.setOpening(d, true);
    assert.equal(s.shouldShowSplash({ settings: s.readSettings(d), reducedMotion: false, env: {} }), true);
  });
  it("conserva otras claves", () => { const d = tmp(); s.writeSettings(d, { x: 1 }); s.setOpening(d, false); assert.equal(s.readSettings(d).x, 1); });
  it("archivo corrupto = encendida, no rompe", () => { const d = tmp(); fs.writeFileSync(s.settingsPath(d), "{no"); assert.deepEqual(s.readSettings(d), {}); });
});
describe("movimiento reducido", () => {
  it("no aparece", () => assert.equal(s.shouldShowSplash({ settings: {}, reducedMotion: true, env: {} }), false));
  it("lee getAnimationSettings del sistema", () => {
    assert.equal(s.prefersReducedMotion({ getAnimationSettings: () => ({ prefersReducedMotion: true }) }), true);
    assert.equal(s.prefersReducedMotion({ getAnimationSettings: () => ({ prefersReducedMotion: false, shouldRenderRichAnimation: true }) }), false);
    assert.equal(s.prefersReducedMotion({}), false);
  });
  it("AVC_NO_SPLASH=1 la omite", () => assert.equal(s.shouldShowSplash({ settings: {}, reducedMotion: false, env: { AVC_NO_SPLASH: "1" } }), false));
});
describe("ventana splash", () => {
  class FakeWin {
    constructor(o) { this.o = o; this.h = {}; this.destroyed = false; this.js = []; FakeWin.last = this; this.webContents = { executeJavaScript: (c) => { this.js.push(c); return Promise.resolve(); } }; }
    on(e, f) { this.h[e] = f; } once(e, f) { this.h[e] = f; } loadURL(u) { this.url = u; } show() { this.shown = true; }
    isDestroyed() { return this.destroyed; } destroy() { this.destroyed = true; this.h.closed?.(); }
  }
  it("sin bordes, transparente, encima, centrada, sin barra de tareas, 480x540, oculta hasta cargar", () => {
    s.createSplash(FakeWin, "app://andromeda/splash.html"); const o = FakeWin.last.o;
    assert.deepEqual([o.frame, o.transparent, o.alwaysOnTop, o.center, o.skipTaskbar, o.width, o.height, o.show], [false, true, true, true, true, 480, 540, false]);
    assert.equal(FakeWin.last.url, "app://andromeda/splash.html");
    FakeWin.last.h["ready-to-show"](); assert.equal(FakeWin.last.shown, true);
  });
  it("close(fade) hace fundido y luego destruye", async () => {
    const r = s.createSplash(FakeWin, "x"); r.close(true);
    assert.match(FakeWin.last.js[0], /out/); assert.equal(r.isClosed(), false);
    await new Promise((ok) => setTimeout(ok, s.FADE_MS + 60)); assert.equal(r.isClosed(), true);
  });
});
