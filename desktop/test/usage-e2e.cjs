// Beta 0.0.2 (antes 1.0.2): barra de uso semanal de Grok. Bloqueada sin cuenta; con cuenta cuenta los pedidos de IA hechos
// desde esta app (lunes→domingo) y muestra el límite por minuto solo si xAI lo manda en cabeceras.
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const { spawn } = require("child_process"); const fs = require("fs"); const path = require("path");
const OUT = path.resolve(__dirname, "../../preview-shots/v0.0.2"); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const check = (n, ok, x = "") => res.push(`${ok ? "OK   " : "FALLA"} ${n}${x ? " — " + x : ""}`);
const P = 18575; const UD = "/workspace/avc-testmedia/ud-usage"; fs.rmSync(UD, { recursive: true, force: true });
(async () => {
  const m = spawn("node", [path.join(__dirname, "mock-xai.cjs")], { env: { ...process.env, MODE: "ok", PORT: String(P) }, stdio: "pipe" }); await sleep(500);
  const app = await _electron.launch({ executablePath: require("electron"), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--password-store=basic", "--no-sandbox"],
    env: { ...process.env, AVC_TEST_BROWSER: "1", AVC_XAI_CLIENT_ID: "test-client", AVC_XAI_ISSUER: `http://127.0.0.1:${P}`, AVC_XAI_API_BASE: `http://127.0.0.1:${P}`, AVC_XAI_PORT: String(P + 1) } });
  const w = await app.firstWindow(); await w.setViewportSize?.({ width: 1280, height: 800 }).catch(() => {});
  await w.waitForSelector("[data-open-settings]"); await w.click("[data-open-settings]");
  await w.waitForSelector("[data-usage-bar]");
  check("sin cuenta: barra bloqueada", (await w.getAttribute("[data-usage-bar]", "data-usage-bar")) === "locked");
  await w.screenshot({ path: `${OUT}/07-uso-grok-bloqueado.png` });
  await w.click("[data-open-wizard]"); await w.click("[data-connect]"); await w.waitForSelector("[data-connected-as]", { timeout: 15000 });
  await w.keyboard.press("Escape"); await w.evaluate(() => document.querySelector("[aria-label=Cerrar]")?.click()); await sleep(300);
  if (!(await w.$("[data-settings]"))) await w.click("[data-open-settings]");
  await w.waitForSelector("[data-usage-bar=local]");
  const c0 = Number(await w.getAttribute("[data-usage-bar]", "data-usage-count"));
  await w.click("[data-test-connection]"); await sleep(800); await w.click("[data-test-connection]"); await sleep(800);
  const c1 = Number(await w.getAttribute("[data-usage-bar]", "data-usage-count"));
  check("con cuenta: cuenta los pedidos de esta app", c1 === c0 + 2, `${c0} → ${c1}`);
  const txt = await w.textContent("[data-usage-bar]");
  check("rotulado 'Uso desde esta app' con fecha de reinicio", /Uso desde esta app · se reinicia el/.test(txt));
  check("sin límite semanal inventado", !/ de \d+ pedidos esta semana|límite semanal: \d/.test(txt));
  check("límite por minuto real de xAI (cabeceras)", /quedan 479 de 480/.test(await w.textContent("[data-usage-minute]")));
  await w.screenshot({ path: `${OUT}/08-uso-grok-semana.png` });
  const reset = await w.evaluate(() => { const u = JSON.parse(localStorage.getItem("avc.ai.usage.v1")); u.weekStart -= 7 * 864e5; localStorage.setItem("avc.ai.usage.v1", JSON.stringify(u)); });
  await w.reload(); await w.waitForSelector("[data-open-settings]"); await w.click("[data-open-settings]"); await w.waitForSelector("[data-usage-bar=local]");
  check("semana nueva: el contador vuelve a 0", (await w.getAttribute("[data-usage-bar]", "data-usage-count")) === "0");
  await app.close(); m.kill();
  console.log(res.join("\n")); process.exit(res.some((r) => r.startsWith("FALLA")) ? 1 : 0);
})().catch((e) => { console.log(res.join("\n")); console.error("ERROR", e.message); process.exit(2); });
