// PC: corre same-lane.mjs en Electron. Uso: xvfb-run node test/pc-same-lane.cjs
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const UD = "/workspace/avc-testmedia/ud-samelane"; fs.rmSync(UD, { recursive: true, force: true });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "OK  " : "FALLA"} ${n} ${d}`); if (!c) fails++; };
(async () => {
  const { run } = await import("./same-lane.mjs");
  const app = await _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--no-sandbox"], env: { ...process.env, AVC_NO_SPLASH: "1" } });
  const w = await app.firstWindow(); await w.setViewportSize({ width: 1440, height: 900 });
  await w.click("[data-open-project]"); await w.waitForSelector("[data-timeline]"); await w.waitForTimeout(800);
  await w.evaluate(() => window.__avcEditor.getState().setTool("media")); await w.waitForTimeout(300);
  await w.locator("input[type=file]").first().setInputFiles(["/workspace/avc-repro/red.mp4", "/workspace/avc-repro/blue.mp4"]); await w.waitForTimeout(6000);
  await run(w, ok, { tag: "PC " });
  await app.close();
  console.log(fails ? `FALLAS: ${fails}` : "TODO OK"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
