// 0.0.3: audio en todos los formatos. Por archivo: importa, forma de onda, búfer en el mezclador, suena por la
// salida (graba el sink nulo "avc" de PulseAudio), y al final exporta con huecos de 1 s entre clips para comprobar
// sincronía (sonido dentro de cada clip, silencio en los huecos) y que el audio exportado es AAC.
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"); const path = require("path"); const { spawn, spawnSync } = require("child_process");
const DIR = process.env.MEDIA_DIR || "/workspace/avc-testmedia/audios de prueba";
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const SKIP = /1GB|R3D|NEV/;
const HAS_PAREC = spawnSync("sh", ["-c", "command -v parec"]).status === 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function record(sec) {
  return new Promise((res) => {
    const p = spawn("parec", ["-d", "avc.monitor", "--format=s16le", "--rate=44100", "--channels=1", "--raw"]);
    const chunks = []; p.stdout.on("data", (c) => chunks.push(c));
    setTimeout(() => { p.kill(); const b = Buffer.concat(chunks); let s = 0; const n = b.length / 2;
      for (let i = 0; i < n; i++) { const v = b.readInt16LE(i * 2) / 32768; s += v * v; } res(n ? Math.sqrt(s / n) : 0); }, sec * 1000);
  });
}
function rmsAt(file, t, d) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(t), "-t", String(d), "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"]);
  return Number((/mean_volume: (-?[\d.]+) dB/.exec(String(r.stderr)) || [])[1] ?? -99);
}
const UD = "/workspace/avc-testmedia/ud-audiomedia"; fs.rmSync(UD, { recursive: true, force: true });
(async () => {
  const app = await _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--no-sandbox"], env: { ...process.env } });
  const w = await app.firstWindow(); await w.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  const logs = []; w.on("console", (m) => { if (/\[medios\]/.test(m.text())) logs.push(m.text()); });
  await w.waitForSelector("[data-welcome]"); await w.click("[data-quick=importar]"); await w.waitForSelector("input[type=file]", { state: "attached" });
  const files = fs.readdirSync(DIR).filter((f) => !SKIP.test(f) && (!ONLY || ONLY.test(f))).sort();
  const rows = [];
  for (const f of files) {
    const t0 = Date.now();
    const before = (await w.evaluate(() => window.__avcAssets())).length;
    await w.setInputFiles("input[type=file]", path.join(DIR, f));
    let a = null;
    for (let i = 0; i < 1200; i++) {
      await sleep(300);
      const list = await w.evaluate(() => window.__avcAssets());
      a = list.length > before ? list[list.length - 1] : null;
      const err = await w.evaluate(() => document.querySelector("[data-import-error]")?.textContent || "");
      if (err && !a) { a = { error: err }; break; }
      if (a && a.status !== "convirtiendo" && (a.audioOk || a.audioError || a.status === "error")) break;
    }
    const row = { f, ms: 0, bin: !!a?.id, wave: !!a?.waveform, via: a?.audioOk || "", err: (a?.audioError || a?.error || "").slice(0, 120), buffer: false, rms: 0 };
    if (a?.id) {
      row.buffer = await w.evaluate((id) => window.__avcAudio.has(id), a.id);
      const clip = (await w.evaluate(() => window.__avcClips())).find((c) => c.assetId === a.id);
      if (clip && row.buffer) {
        await w.evaluate((t) => window.__avcSeek(t), clip.start + 0.3); await sleep(300);
        await w.click("[aria-label='Reproducir']"); await sleep(300);
        // Con PulseAudio se graba la salida real; sin él, el nivel (analizador) del bus maestro que va a la tarjeta elegida.
        if (HAS_PAREC) row.rms = Math.round((await record(1.2)) * 1000) / 1000;
        else { let m = 0; for (let i = 0; i < 10; i++) { await sleep(100); m = Math.max(m, Number(await w.evaluate(() => window.__avcAudio.level())) || 0); } row.rms = Math.round(m * 1000) / 1000; row.how = "nivel"; }
        await w.click("[aria-label='Pausar']").catch(() => {});
      }
    }
    row.ms = Date.now() - t0;
    rows.push(row);
    await w.evaluate(() => document.querySelector("[data-import-error-close]")?.click());
  }
  await w.screenshot({ path: path.resolve(__dirname, `../../preview-shots/v0.0.3/audio-${path.basename(DIR).replace(/\W+/g, "-")}.png`) });
  // Sincronía: un clip por medio, en fila, con 1 s de silencio entre ellos (máx 4 s por clip).
  const plan = await w.evaluate(() => {
    const st = window.__avcEditor.getState();
    const ok = new Set(st.assets.filter((a) => a.audioOk).map((a) => a.id));
    let t = 0.5; const out = [];
    const clips = st.clips.filter((c) => c.assetId && ok.has(c.assetId)).map((c) => { const d = Math.min(3, c.duration); const n = { ...c, start: t, duration: d }; out.push({ name: st.assets.find((a) => a.id === c.assetId).name, start: t, d }); t += d + 1; return n; });
    window.__avcEditor.setState({ clips });
    return out;
  });
  const dl = path.join(UD, "export.mp4");
  await app.evaluate(({ session }, p) => session.defaultSession.on("will-download", (_e, item) => item.setSavePath(p)), dl);
  await w.click("header button:has-text('Exportar')"); await sleep(400);
  await w.click("[data-preset=draft]").catch(() => {});
  await w.locator("[role=dialog]").getByRole("button", { name: "Exportar", exact: true }).click();
  await w.getByRole("button", { name: "Descargar" }).waitFor({ timeout: 600000 });
  await w.getByRole("button", { name: "Descargar" }).click();
  for (let i = 0; i < 80 && !fs.existsSync(dl); i++) await sleep(250); await sleep(1000);
  const acodec = String(spawnSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "csv=p=0", dl]).stdout).trim();
  const sync = {};
  for (const p of plan) sync[p.name] = { dentro: rmsAt(dl, p.start + 0.3, p.d - 0.6), hueco: rmsAt(dl, p.start + p.d + 0.25, 0.5) };
  for (const r of rows) { const s = sync[r.f.replace(/\.[^.]+$/, "").slice(0, 42)]; r.sync = s ? s.dentro > -40 && s.hueco < -60 : null; r.syncDb = s; }
  console.log(`EXPORT audio=${acodec}`);
  let fails = 0;
  for (const r of rows) {
    const good = r.bin && r.wave && r.buffer && r.rms > 0.01 && r.sync && acodec === "aac";
    if (!good && !r.err) fails++;
    console.log(`${good ? "OK   " : r.err ? "MSG  " : "FALLA"} ${r.f.padEnd(28)} onda=${r.wave} mezclador=${r.buffer} suena=${r.rms} sync=${r.sync} ${r.syncDb ? `(${r.syncDb.dentro}/${r.syncDb.hueco} dB)` : ""} via=${r.via} ${r.err} (${r.ms} ms)`);
  }
  console.log("LOGS\n" + logs.join("\n"));
  await app.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(2); });
