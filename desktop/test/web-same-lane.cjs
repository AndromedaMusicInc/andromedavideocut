// Web: corre same-lane.mjs con Chrome. Uso: node test/web-same-lane.cjs (sirve ../preview)
const { chromium } = require("/workspace/pwe/node_modules/playwright-core");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../../preview");
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith("/")) f += "index.html"; fs.readFile(f, (e, d) => { if (e) { s.statusCode = 404; return s.end(); } s.setHeader("content-type", f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".html") ? "text/html" : "application/octet-stream"); s.end(d); }); }).listen(18741);
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "OK  " : "FALLA"} ${n} ${d}`); if (!c) fails++; };
(async () => {
  const { run } = await import("./same-lane.mjs");
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" }); const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pg.addInitScript(() => sessionStorage.setItem("avc.opened", "1"));
  await pg.goto("http://127.0.0.1:18741/"); await pg.click("[data-open-project]"); await pg.waitForSelector("[data-timeline]"); await pg.waitForTimeout(800);
  await pg.evaluate(() => window.__avcEditor.getState().setAssets?.([]));
  // un video importado para el caso "videos"
  await pg.evaluate(() => window.__avcEditor.getState().setTool("media")); await pg.waitForTimeout(300);
  await pg.locator("input[type=file]").first().setInputFiles(["/workspace/avc-repro/red.mp4", "/workspace/avc-repro/blue.mp4"]); await pg.waitForTimeout(4000);
  await run(pg, ok, { tag: "web " });
  await b.close(); srv.close();
  console.log(fails ? `FALLAS: ${fails}` : "TODO OK"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
