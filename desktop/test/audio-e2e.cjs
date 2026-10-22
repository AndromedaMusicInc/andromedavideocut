// Comprueba que la vista previa SUENA en Electron: graba el monitor de un sink nulo de PulseAudio
// mientras se pulsa Reproducir y mide el nivel RMS. Uso: xvfb-run -a node test/audio-e2e.cjs [--dist <dir-unpacked>]
const { _electron } = require("/tmp/pwe/node_modules/playwright-core");
const { spawn } = require("child_process"); const path = require("path"); const fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function record(sec) {
  return new Promise((res) => {
    const p = spawn("parec", ["-d", "avc.monitor", "--format=s16le", "--rate=44100", "--channels=1", "--raw"]);
    const chunks = []; p.stdout.on("data", (c) => chunks.push(c));
    setTimeout(() => { p.kill(); const b = Buffer.concat(chunks); let s = 0, peak = 0; const n = b.length / 2;
      for (let i = 0; i < n; i++) { const v = b.readInt16LE(i * 2) / 32768; s += v * v; peak = Math.max(peak, Math.abs(v)); }
      res({ rms: n ? Math.sqrt(s / n) : 0, peak, seconds: n / 44100 }); }, sec * 1000);
  });
}
(async () => {
  const ud = fs.mkdtempSync("/tmp/avc-audio-");
  const app = await _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${ud}`, "--no-sandbox"], env: { ...process.env } });
  const w = await app.firstWindow();
  await w.waitForSelector("[aria-label='Reproducir'], [data-welcome]", { timeout: 30000 });
  await sleep(1500);
  // Si existe la bienvenida (1.0.1), abre el proyecto de ejemplo.
  if (await w.$("[data-welcome]")) { await w.waitForSelector("[data-open-project]"); await w.click("[data-open-project]"); await w.waitForSelector("[aria-label='Reproducir']"); await sleep(800); }
  const silent = await record(1.5);
  await w.click("[aria-label='Reproducir']");
  const played = await record(3);
  const info = await w.evaluate(() => (window).__avcAudio?.info?.() ?? null);
  console.log(JSON.stringify({ silencioAntes: silent, reproduciendo: played, mixer: info }));
  const ok = played.rms > 0.01 && played.rms > silent.rms * 5;
  console.log(ok ? "OK la vista previa suena" : "FALLA la vista previa NO suena");
  if (process.argv.includes("--shot")) await w.screenshot({ path: process.argv[process.argv.indexOf("--shot") + 1] });
  await app.close(); process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("ERROR", e.message); process.exit(2); });
