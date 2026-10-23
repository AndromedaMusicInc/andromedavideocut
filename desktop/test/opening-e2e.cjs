// B17 · pantalla de inicio en la app de PC (ventana splash nativa). Uso: xvfb-run node test/opening-e2e.cjs
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const UD = "/workspace/avc-testmedia/ud-opening"; fs.rmSync(UD, { recursive: true, force: true });
let fails = 0; const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FALLA"} ${n} ${d}`); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const launch = (env = {}) => _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--no-sandbox"], env: { ...process.env, ...env } });
const info = (app) => app.evaluate(({ BrowserWindow, screen }) => BrowserWindow.getAllWindows().map((w) => { const url = w.webContents.getURL(); const b = w.getBounds(); const wa = screen.getPrimaryDisplay().workArea; return { url, visible: w.isVisible(), top: w.isAlwaysOnTop(), b, wa }; }));
async function waitSplash(app, ms = 6000) { const t = Date.now(); while (Date.now() - t < ms) { const s = (await info(app)).find((x) => x.url.includes("splash.html")); if (s) return s; await sleep(50); } return null; }
async function waitGone(app, ms = 12000) { const t = Date.now(); while (Date.now() - t < ms) { if (!(await info(app)).some((x) => x.url.includes("splash.html"))) return Date.now() - t; await sleep(50); } return -1; }
(async () => {
  // 1) aparece, propiedades, se cierra cuando la principal está lista
  let app = await launch(); let w = await app.firstWindow();
  const sp = await waitSplash(app);
  check("PC: aparece la ventana splash", !!sp, sp?.url);
  if (sp) {
    check("PC: 480x540, siempre encima", sp.b.width === 480 && sp.b.height === 540 && sp.top, JSON.stringify(sp.b));
    const cx = sp.b.x + sp.b.width / 2 - (sp.wa.x + sp.wa.width / 2), cy = sp.b.y + sp.b.height / 2 - (sp.wa.y + sp.wa.height / 2);
    check("PC: centrada", Math.abs(cx) <= 2 && Math.abs(cy) <= 2, `dx=${cx} dy=${cy}`);
  }
  check("PC: la primera ventana es la principal (no la splash)", /index\.html/.test(w.url()), w.url());
  const gone = await waitGone(app);
  const main = (await info(app)).find((x) => x.url.includes("index.html"));
  check("PC: splash se cierra (fundido) al estar lista la principal", gone >= 0 && main?.visible, `${gone} ms, principal visible=${main?.visible}`);
  check("PC: no se dibuja además el overlay web", (await w.locator("[data-opening-clip]").count()) === 0);
  await app.close();
  // 2) clic y tecla la saltan (se mantiene 8 s solo para la prueba)
  for (const how of ["clic", "tecla"]) {
    app = await launch({ AVC_SPLASH_MIN_MS: "8000" }); await app.firstWindow();
    await waitSplash(app); await sleep(400);
    const page = app.windows().find((p) => p.url().includes("splash.html"));
    if (how === "clic") await page.mouse.click(240, 270); else await page.keyboard.press("Space");
    const g = await waitGone(app, 2000);
    check(`PC: ${how} la salta`, g >= 0, `${g} ms`);
    await app.close();
  }
  // 3) interruptor en Ajustes -> userData/settings.json -> no aparece al reiniciar
  app = await launch(); w = await app.firstWindow(); await waitGone(app);
  await w.locator("[data-open-settings]").first().click(); const sw = w.locator("[data-opening-toggle] input");
  check("PC: interruptor en Ajustes encendido", await sw.isChecked());
  await sw.click(); await sleep(300);
  const st = JSON.parse(fs.readFileSync(path.join(UD, "settings.json"), "utf8"));
  check("PC: apagar escribe settings.json openingClip='off'", st.openingClip === "off", JSON.stringify(st));
  await app.close();
  app = await launch(); w = await app.firstWindow(); await w.waitForSelector("[data-open-settings]"); await sleep(1200);
  check("PC: apagada no aparece al reiniciar", !(await waitSplash(app, 300)));
  await w.locator("[data-open-settings]").first().click(); await w.locator("[data-opening-toggle] input").click(); await sleep(300);
  check("PC: encender la vuelve a activar", JSON.parse(fs.readFileSync(path.join(UD, "settings.json"), "utf8")).openingClip === "on");
  await app.close();
  // 4) movimiento reducido
  app = await launch({ AVC_REDUCED_MOTION: "1" }); w = await app.firstWindow(); await w.waitForSelector("[data-open-settings]"); await sleep(1000);
  check("PC: movimiento reducido: no aparece", !(await waitSplash(app, 300)));
  await app.close();
  console.log(fails ? `FALLAS: ${fails}` : "TODO OK"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
