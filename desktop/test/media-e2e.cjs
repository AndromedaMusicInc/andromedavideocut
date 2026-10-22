// 0.0.3: importa archivos reales de muchos formatos (ruta con espacios y acentos) y comprueba: aparece en Medios,
// miniatura, clip en la línea de tiempo, el visor tiene cuadros, y mensajes claros para lo no compatible.
// MEDIA_DIR con los archivos (los genera test/make-media.sh). Salida: tabla en consola + preview-shots/v0.0.3/.
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"); const path = require("path");
const DIR = process.env.MEDIA_DIR || "/workspace/avc-testmedia/vídeos de prueba";
const OUT = path.resolve(__dirname, "../../preview-shots/v0.0.3"); fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UD = "/workspace/avc-testmedia/ud-media"; fs.rmSync(UD, { recursive: true, force: true });
(async () => {
  const app = await _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--no-sandbox"], env: { ...process.env } });
  const w = await app.firstWindow(); await w.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  const logs = []; w.on("console", (m) => { if (/\[medios\]/.test(m.text())) logs.push(m.text()); });
  await w.waitForSelector("[data-welcome]"); await w.click("[data-quick=importar]"); await w.waitForSelector("input[type=file]", { state: "attached" });
  const files = fs.readdirSync(DIR).filter((f) => !ONLY || ONLY.test(f)).sort();
  const rows = [];
  for (const f of files) {
    const t0 = Date.now();
    const before = (await w.evaluate(() => window.__avcAssets())).length;
    const clipsBefore = (await w.evaluate(() => window.__avcClips())).length;
    await w.setInputFiles("input[type=file]", path.join(DIR, f));
    // espera a que termine (importar + proxy si hace falta)
    let a = null;
    for (let i = 0; i < 600; i++) {
      await sleep(500);
      const list = await w.evaluate(() => window.__avcAssets());
      const busy = await w.evaluate(() => !!window.__avcBusy());
      a = list.length > before ? list[list.length - 1] : null;
      const err = await w.evaluate(() => document.querySelector("[data-import-error]")?.textContent || "");
      if (err && !a) { a = { error: err }; break; }
      if (a && a.status !== "convirtiendo" && !busy) { if (a.status === "error") a.error = a.error || "error"; break; }
    }
    const clips = await w.evaluate(() => window.__avcClips());
    let frames = false;
    if (a && a.id) {
      const clip = clips.find((c) => c.assetId === a.id) || clips[clips.length - 1];
      await w.evaluate((t) => window.__avcSeek && window.__avcSeek(t), (clip?.start ?? 0) + 0.5); await sleep(1200);
      const p = (await w.evaluate(() => window.__avcPool())).find((x) => x.id === a.id);
      frames = !!p && p.ready >= 2 && p.w > 0;
      a.pool = p;
    }
    const errText = await w.evaluate(() => document.querySelector("[data-import-error]")?.textContent || "");
    rows.push({ f, ms: Date.now() - t0, inBin: !!(a && a.id), thumb: !!(a && a.thumb), clip: clips.length > clipsBefore, frames, status: a?.status || "", msg: (a?.error || errText || "").slice(0, 140), pool: a?.pool });
    if (/hevc 10bit|prores|R3D|NEV/.test(f)) await w.screenshot({ path: `${OUT}/medios-${f.replace(/[^a-z0-9]+/gi, "-")}.png` });
    await w.evaluate(() => document.querySelector("[data-import-error-close]")?.click());
  }
  await w.screenshot({ path: `${OUT}/medios-final.png` });
  // Exportar: quita el clip de 1 GB (muy largo) y comprueba en el MP4 exportado que cada clip tiene imagen (no negro).
  const { execFileSync, spawnSync } = require("child_process");
  await w.evaluate(() => { const st = window.__avcEditor.getState(); const big = st.assets.find((a) => /1GB/.test(a.name)); window.__avcEditor.setState({ clips: st.clips.filter((c) => !big || c.assetId !== big.id) }); });
  const vclips = (await w.evaluate(() => window.__avcClips())).filter((c) => c.assetId);
  const names = await w.evaluate(() => Object.fromEntries(window.__avcEditor.getState().assets.map((a) => [a.id, a.name])));
  const dl = path.join(UD, "export.mp4");
  await app.evaluate(({ session }, p) => session.defaultSession.on("will-download", (_e, item) => item.setSavePath(p)), dl);
  await w.click("header button:has-text('Exportar')"); await sleep(400);
  await w.click("[data-preset=draft]").catch(() => {});
  await w.locator("[role=dialog]").getByRole("button", { name: "Exportar", exact: true }).click();
  await w.getByRole("button", { name: "Descargar" }).waitFor({ timeout: 300000 });
  await w.getByRole("button", { name: "Descargar" }).click();
  for (let i = 0; i < 80 && !fs.existsSync(dl); i++) await sleep(250); await sleep(1000);
  const exp = {};
  for (const c of vclips) {
    const t = c.start + Math.min(1, c.duration / 2);
    const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(t), "-i", dl, "-frames:v", "1", "-vf", "signalstats,metadata=print", "-f", "null", "-"]);
    const sat = Number((/lavfi.signalstats.SATAVG=([\d.]+)/.exec(String(r.stderr)) || [])[1] || 0);
    exp[names[c.assetId]] = sat > 10; // testsrc2 es muy colorido; negro/gris = 0
  }
  for (const r of rows) r.exported = exp[r.f.replace(/\.[^.]+$/, "").slice(0, 42)];
  console.log(JSON.stringify(rows, null, 1));
  for (const r of rows) console.log(`${r.inBin && r.frames ? "OK   " : r.msg ? "MSG  " : "FALLA"} ${r.f.padEnd(26)} bin=${r.inBin} thumb=${r.thumb} clip=${r.clip} cuadros=${r.frames} export=${r.exported} ${r.status} ${r.msg} (${r.ms} ms)`);
  const mlog = fs.readFileSync(path.join(UD, "logs", "medios.log"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l.slice(l.indexOf(" ") + 1)));
  const proxies = mlog.filter((e) => e.evento === "proxy" && e.ok).length, masters = mlog.filter((e) => e.evento === "master-export" && e.ok).length;
  console.log(`EXPORT DESDE ORIGINAL: ${masters} copias maestras para ${proxies} proxies ${masters >= proxies && proxies > 0 ? "OK" : "FALLA"}`);
  console.log(`EXPORT con imagen en cada clip: ${rows.filter((r) => r.inBin).every((r) => r.exported !== false) ? "OK" : "FALLA"}`);
  console.log("LOGS\n" + logs.join("\n"));
  await app.close();
})().catch((e) => { console.error("ERROR", e); process.exit(2); });
