// 0.0.7: en la PC, abrir un proyecto guardado debe verse y reproducir (bug "sale en negro y nada da play").
// Uso: xvfb-run node test/pc-reopen.cjs   (FILES="a.mp4,b.mxf" para elegir medios)
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const DIR = "/workspace/avc-testmedia/vídeos de prueba";
const FILES = (process.env.FILES || "h264 normal.mp4,dnxhd.mxf").split(",");
const UD = "/workspace/avc-testmedia/ud-reopen"; if (!process.env.OPEN_ONLY) fs.rmSync(UD, { recursive: true, force: true });
const APPDIR = process.env.APPDIR || path.join(__dirname, "..");
let fails = 0; const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FALLA"} ${n} ${d}`); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const launch = () => _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [APPDIR, `--user-data-dir=${UD}`, "--no-sandbox"], env: { ...process.env, ...(process.env.SPLASH ? {} : { AVC_NO_SPLASH: "1" }) } });
async function seen(w, aid) {
  const st = await w.evaluate((id) => window.__avcClips().find((c) => c.assetId === id)?.start ?? 0, aid);
  await w.evaluate((t) => window.__avcSeek(t), st + 0.5); await sleep(1500);
  const pl = (await w.evaluate(() => window.__avcPool())).find((x) => x.id === aid);
  return [Boolean(pl && pl.ready >= 2 && pl.w > 0), pl];
}
(async () => {
  let app = await launch(); let w = await app.firstWindow();
  if (process.env.OPEN_ONLY) {
    const ids = JSON.parse(fs.readFileSync(path.join(UD, "ids.json"), "utf8")); await w.waitForSelector("[data-project]");
    return openAll(app, w, ids);
  }
  w.on("pageerror", (e) => console.log("  pageerror:", String(e).slice(0, 300))); w.on("console", (m) => m.type() === "error" && console.log("  console:", m.text().slice(0, 200)));
  await w.waitForSelector("[data-welcome]"); await w.click("[data-quick=importar]"); await w.waitForSelector("input[type=file]", { state: "attached" });
  const ids = [];
  for (const f of FILES) {
    const n0 = (await w.evaluate(() => window.__avcAssets())).length;
    await w.setInputFiles("input[type=file]", path.join(DIR, f));
    for (let i = 0; i < 240; i++) { await sleep(250); const a = await w.evaluate(() => window.__avcAssets()); if (a.length > n0 && !(await w.evaluate(() => window.__avcBusy())) && !a.some((x) => x.status === "convirtiendo")) break; }
    const a = await w.evaluate(() => window.__avcAssets()); ids.push([f, a[a.length - 1].id]);
    const [ok, pl] = await seen(w, a[a.length - 1].id); check(`${f} recién importado: se ve`, ok, JSON.stringify(pl));
  }
  // Cada video en su propio canal nuevo (como al soltar en la línea entre canales): el caso que salía en negro.
  const lanes = await w.evaluate(() => { const E = window.__avcEditor; for (const c of E.getState().clips.filter((c) => c.type === "video")) { E.getState().addFxTrack(); const lane = E.getState().trackOrder.find((t) => /^lane/.test(t) && !E.getState().clips.some((x) => x.trackId === t)); E.getState().patchClip(c.id, { trackId: lane }, true); } return E.getState().clips.map((c) => c.trackId); });
  console.log("  canales:", lanes.join(","));
  if (process.env.RICH) {
    const r = await w.evaluate(async () => { const E = window.__avcEditor, g = () => E.getState(); const out = [];
      const tryit = async (n, f) => { try { out.push([n, String(await f())]); } catch (e) { out.push([n, "ERR " + e]); } };
      const v = g().clips.find((c) => c.type === "video");
      await tryit("split", () => { E.setState({ selectedId: v.id }); return g().splitAt(v.start + v.duration / 2); });
      await tryit("transition", () => { const cl = g().clips.filter((c) => c.type === "video").sort((a, b) => a.start - b.start)[1]; E.setState({ selectedId: cl.id }); g().setTransition("fade"); });
      await tryit("filter", () => { E.setState({ selectedId: v.id }); g().setFilter("warm"); });
      await tryit("text", () => g().addText({ text: "Hola", preset: "title" }));
      await tryit("adjust", () => g().placeAdjust("filter", "cool", "Frío", 0.2, true));
      await tryit("speed", () => g().patchClip(v.id, { speed: 1.5 }, true));
      await tryit("hide", () => { const t = g().clips.find((c) => c.type === "text")?.trackId; if (t) { g().toggleHidden(t); g().toggleHidden(t); } });
      return out; });
    console.log("  rico:", JSON.stringify(r)); await sleep(1500);
  }
  await w.keyboard.press("Control+s"); await sleep(1000); fs.writeFileSync(path.join(UD, "ids.json"), JSON.stringify(ids));
  if (process.env.CREATE_ONLY) { await app.close(); process.exit(fails ? 1 : 0); }
  await w.click("[aria-label='Volver al inicio']"); await w.waitForSelector("[data-project]"); await sleep(800);
  return openAll(app, w, ids);
})().catch((e) => { console.error(e); process.exit(2); });
async function openAll(app, w, ids) {
  const reopen = async (label) => {
    await w.click("[data-project]"); await w.waitForSelector("[data-timeline]"); await sleep(2500);
    for (const [f, id] of ids) {
      const a = await w.evaluate((id) => window.__avcEditor.getState().assets.filter((a) => a.id === id).map((a) => ({ status: a.status, url: a.url || null, error: a.error || null, proxy: a.proxy })), id);
      const [ok, pl] = await seen(w, id);
      const lit = await w.evaluate(() => { const c = document.querySelector("[data-preview-canvas]"); const x = document.createElement("canvas"); x.width = 32; x.height = 18; const g = x.getContext("2d"); g.drawImage(c, 0, 0, 32, 18); const d = g.getImageData(0, 0, 32, 18).data; let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, d[i] + d[i + 1] + d[i + 2]); return m; });
      check(`${label} · ${f}: se ve (pool y visor no negro)`, ok && lit > 30, JSON.stringify({ a, pl, lit }));
    }
    await w.evaluate(() => window.__avcSeek(0)); await w.mouse.click(5, 300); await w.keyboard.press("Space"); await sleep(1500);
    const st = await w.evaluate(() => { const s = window.__avcEditor.getState(); return { playing: s.playing }; });
    const t = await w.evaluate(() => window.__avcEditor.getState().time);
    await w.keyboard.press("Space"); const t2 = await w.evaluate(() => window.__avcEditor.getState().time);
    const pe = await w.evaluate(() => window.__errs || []); check(`${label}: play avanza`, t2 > 0.5, JSON.stringify({ st, t, t2 }));
    await w.click("[aria-label='Volver al inicio']"); await w.waitForSelector("[data-project]"); await sleep(600);
  };
  await reopen("reabrir sin cerrar");
  await app.close(); app = await launch(); w = await app.firstWindow(); await w.waitForSelector("[data-project]");
  await reopen("reabrir tras cerrar la app");
  await app.close(); console.log(fails ? `FALLAS: ${fails}` : "TODO OK"); process.exit(fails ? 1 : 0);
}
