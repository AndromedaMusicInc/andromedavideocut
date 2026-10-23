// 0.0.4: imán y transiciones en la app de PC (mismos casos que en web). Uso: xvfb-run node test/snap-trans-e2e.cjs <dir con red.mp4 y blue.mp4>
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const DIR = process.argv[2]; const UD = "/workspace/avc-testmedia/ud-snaptrans";
let fails = 0; const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FALLA"} ${n} ${d}`); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const box = (w, id) => w.evaluate((id) => { const e = document.querySelector(`[data-clip^="${id}"]`); const r = e.getBoundingClientRect(); return [r.left, r.right, r.top]; }, id);
const px = (w, xs) => w.evaluate((xs) => { const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0]; const g = c.getContext("2d"); return xs.map((x) => [...g.getImageData(Math.floor(c.width * x), Math.floor(c.height / 2), 1, 1).data].slice(0, 3).join(",")); }, xs);
async function drag(w, sx, sy, x, y) { await w.mouse.move(sx, sy); await w.mouse.down(); for (let i = 1; i <= 20; i++) await w.mouse.move(sx + (x - sx) * i / 20, sy + (y - sy) * i / 20); await sleep(200); await w.mouse.up(); await sleep(800); }
async function dragLoc(w, loc, x, y) { const b = await loc.boundingBox(); await drag(w, b.x + b.width / 2, b.y + b.height / 2, x, y); }
(async () => {
  fs.rmSync(UD, { recursive: true, force: true });
  const app = await _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--no-sandbox"] });
  const w = await app.firstWindow(); await w.setViewportSize({ width: 1440, height: 900 }); await sleep(3000);
  check("versión 0.0.4", /0\.0\.4/.test(await w.title()), await w.title());
  // --- Imán (proyecto demo) ---
  await w.getByText("Mi primer reel").first().waitFor(); await w.mouse.click(300, 250); await sleep(3000);
  const cut = (await box(w, "d-tide"))[0]; const st = await box(w, "d-spar");
  const y = st[2] + 10, x0 = (st[0] + st[1]) / 2, dx = cut + 4 - st[0];
  await drag(w, x0, y, x0 + dx, y);
  const after = (await box(w, "d-spar"))[0];
  check("imán: sticker soltado a 4 px del corte se pega", Math.abs(after - cut) < 1, `corte=${cut.toFixed(1)} sticker=${after.toFixed(1)}`);
  // --- Transiciones con videos importados ---
  await w.locator(`[aria-label="Volver al inicio"]`).first().click(); await sleep(1500);
  await w.getByText("Nuevo proyecto").first().click(); await sleep(800);
  await w.getByText("Proyecto vacío").click(); await sleep(2500);
  await w.getByText("Medios").first().click(); await sleep(500);
  await w.locator("input[type=file]").first().setInputFiles([path.join(DIR, "red.mp4"), path.join(DIR, "blue.mp4")]); await sleep(8000);
  const tl = await w.locator("[data-timeline]").boundingBox();
  const assets = w.locator('[data-lib-item^="asset:"]:visible');
  await dragLoc(w, assets.nth(0), 200, tl.y + 150);
  let clips = await w.evaluate(() => [...document.querySelectorAll("[data-clip]")].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.clipType, e.closest("[data-track]")?.dataset.track, r.left, r.right, r.top]; }));
  if (clips.length < 2) { await dragLoc(w, assets.nth(1), clips[0][3] + 60, clips[0][4] + 15); clips = await w.evaluate(() => [...document.querySelectorAll("[data-clip]")].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.clipType, e.closest("[data-track]")?.dataset.track, r.left, r.right, r.top]; })); }
  check("dos videos seguidos en v1", clips.length === 2 && clips.every((c) => c[1] === "v1"), JSON.stringify(clips.map((c) => [c[1], Math.round(c[2]), Math.round(c[3])])));
  const join = clips[0][3], ty = clips[0][4] + 10;
  await w.getByText("Fundidos").first().click(); await sleep(400);
  // vista previa por clic con el cabezal lejos del corte
  await w.mouse.click(150, tl.y + 45); await sleep(300);
  await w.locator('[data-lib-item="transition:slide"]:visible').first().click();
  const seq = new Set(); for (let i = 0; i < 10; i++) { await sleep(180); seq.add((await px(w, [0.5]))[0]); }
  check("clic = vista previa en bucle en el corte", seq.has("254,0,0") && seq.has("0,0,253"), [...seq].join(" | "));
  await w.keyboard.press("Escape"); await sleep(300);
  // soltar a mitad del 2º clip (lejos del corte)
  await dragLoc(w, w.locator('[data-lib-item="transition:wipe"]:visible').first(), join + (clips[1][3] - join) * 0.6, ty);
  const titles = await w.evaluate(() => [...document.querySelectorAll("[data-timeline] button[title]")].map((e) => e.title));
  check("soltar encima del clip la pone en el corte", titles.includes("Barrido"), titles.slice(-2).join(","));
  const pps = (clips[0][3] - clips[0][2]) / 3;
  const states = [];
  for (const t of [-0.2, 0.06, 0.2, 0.35, 0.7]) { await w.mouse.click(join + t * pps, tl.y + 45); await sleep(700); states.push((await px(w, [0.1, 0.5, 0.9])).join("/")); }
  check("barrido se dibuja en pausa (rojo → mezcla → azul)", states[0].split("/").every((p) => p === "254,0,0") && states.some((s) => s.includes("0,0,253") && s.includes("254,0,0")) && states[4].split("/").every((p) => p === "0,0,253"), states.join(" ; "));
  // reproducción
  await w.mouse.click(join - 0.6 * pps, tl.y + 45); await sleep(600);
  await w.evaluate(() => { window.__s = []; (function loop() { const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0]; const g = c.getContext("2d"); const f = (x) => [...g.getImageData(Math.floor(c.width * x), Math.floor(c.height / 2), 1, 1).data].slice(0, 3).join(","); window.__s.push(f(0.1) + "/" + f(0.5) + "/" + f(0.9)); if (window.__s.length < 150) requestAnimationFrame(loop); })(); });
  await w.locator('button[aria-label="Reproducir"]').first().click(); await sleep(2200);
  const u = [...new Set(await w.evaluate(() => window.__s))];
  check("barrido se ve al reproducir", u.some((s) => s.includes("0,0,253") && s.includes("254,0,0")), u.join(" ; "));
  await w.screenshot({ path: path.resolve(__dirname, "../../preview-shots/v0.0.4-snap-trans.png") }).catch(() => {});
  await app.close();
  console.log(fails ? `FALLAS: ${fails}` : "TODO OK"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
