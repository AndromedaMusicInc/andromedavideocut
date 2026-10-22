// Prueba simulada de "Conectar mi Grok": sin configurar, sin sesión, 403, éxito, código de dispositivo, desconectar.
const { _electron } = require("/tmp/pwe/node_modules/playwright-core");
const { spawn } = require("child_process"); const fs = require("fs"); const path = require("path");
const OUT = path.resolve(__dirname, "../../preview-shots/grok-oauth"); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
async function mock(mode, port) { const p = spawn("node", [path.join(__dirname, "mock-xai.cjs")], { env: { ...process.env, MODE: mode, PORT: String(port) }, stdio: "pipe" }); await sleep(500); return p; }
async function launch(env, ud) {
  const app = await _electron.launch({ executablePath: require("electron"), args: [path.join(__dirname, ".."), `--user-data-dir=${ud}`, "--password-store=basic", "--no-sandbox"],
    env: { ...process.env, AVC_TEST_BROWSER: "1", ...env } });
  const w = await app.firstWindow(); await w.setViewportSize?.({ width: 1280, height: 800 }).catch(() => {}); await w.waitForSelector("[data-open-settings]", { timeout: 20000 }); return { app, w };
}
const check = (name, ok, extra = "") => { results.push(`${ok ? "OK " : "FALLA"} ${name} ${extra}`); };
(async () => {
  const base = (p) => ({ AVC_XAI_CLIENT_ID: "test-client", AVC_XAI_ISSUER: `http://127.0.0.1:${p}`, AVC_XAI_API_BASE: `http://127.0.0.1:${p}`, AVC_XAI_PORT: String(p + 1) });
  // 1) sin client_id
  let { app, w } = await launch({}, "/tmp/avc-ud-0");
  await w.click("[data-open-settings]"); await w.waitForSelector("[data-ai-status]");
  check("sin sesión: estado bloqueado", /Sin conectar/.test(await w.textContent("[data-ai-status]")));
  await w.screenshot({ path: `${OUT}/01-ajustes-sin-conectar.png` });
  await w.click("[data-open-wizard]"); await w.waitForSelector("[data-not-configured]");
  check("sin client_id: botón deshabilitado + aviso", await w.isDisabled("[data-connect]"));
  await w.screenshot({ path: `${OUT}/00-sin-configurar.png` }); await app.close();
  // 2) 403 sin suscripción
  let m = await mock("nosub", 18555); fs.rmSync("/tmp/avc-ud-1", { recursive: true, force: true });
  ({ app, w } = await launch(base(18555), "/tmp/avc-ud-1"));
  await w.click("[data-open-settings]"); await w.click("[data-open-wizard]"); await w.waitForSelector("[data-connect]");
  await w.screenshot({ path: `${OUT}/02-conectar-mi-grok.png` });
  await w.click("[data-connect]"); await w.waitForSelector("[data-login-error]", { timeout: 15000 });
  const err = await w.textContent("[data-login-error]");
  check("403: mensaje de suscripción", /no tiene una suscripción activa/.test(err));
  await w.screenshot({ path: `${OUT}/05-sin-suscripcion.png` });
  const st = await w.evaluate(() => window.avcDesktop.ai.status());
  check("403: sigue bloqueado", !st.connected); await app.close(); m.kill();
  // 3) éxito por loopback + persistencia + refresh rotado + desconectar
  m = await mock("ok", 18565); fs.rmSync("/tmp/avc-ud-2", { recursive: true, force: true });
  ({ app, w } = await launch(base(18565), "/tmp/avc-ud-2"));
  await w.click("[data-open-settings]"); await w.click("[data-open-wizard]"); await w.click("[data-connect]");
  await w.waitForSelector("[data-connected-as]", { timeout: 15000 });
  check("éxito: Conectado como", /¡Conectado como Wilhelm Prueba!/.test(await w.textContent("[data-connected-as]")));
  await w.screenshot({ path: `${OUT}/04-conectado.png` });
  const raw = fs.readFileSync("/tmp/avc-ud-2/xai-session.bin"); check("sesión cifrada en disco", !raw.toString("latin1").includes("at-rt"));
  const models = await w.evaluate(() => window.avcDesktop.ai.request({ method: "GET", path: "/v1/models" }));
  check("llamada API desde main", models.status === 200);
  const blocked = await w.evaluate(() => window.avcDesktop.ai.request({ method: "GET", path: "/v1/chat/completions" }));
  check("ruta fuera de lista bloqueada", blocked.status === 400);
  const dl = await w.evaluate(() => window.avcDesktop.ai.download("https://evil.example.com/a.mp4"));
  check("descarga fuera de x.ai bloqueada", dl.status === 400);
  await app.close();
  ({ app, w } = await launch(base(18565), "/tmp/avc-ud-2"));
  check("sesión persiste al reiniciar", (await w.evaluate(() => window.avcDesktop.ai.status())).connected);
  await w.click("[data-open-settings]"); await w.waitForSelector("[data-disconnect]");
  await w.screenshot({ path: `${OUT}/06-ajustes-conectado.png` });
  await w.click("[data-disconnect]"); await sleep(500);
  check("desconectar bloquea", !(await w.evaluate(() => window.avcDesktop.ai.status())).connected && !fs.existsSync("/tmp/avc-ud-2/xai-session.bin"));
  await app.close();
  // 4) respaldo con código de dispositivo
  fs.rmSync("/tmp/avc-ud-3", { recursive: true, force: true });
  ({ app, w } = await launch({ ...base(18565), AVC_TEST_BROWSER: "device" }, "/tmp/avc-ud-3"));
  await w.click("[data-open-settings]"); await w.click("[data-open-wizard]"); await w.click("[data-connect]");
  await w.waitForSelector("[data-use-code]"); await w.screenshot({ path: `${OUT}/03-esperando-navegador.png` });
  await w.click("[data-use-code]"); await w.waitForSelector("[data-user-code]");
  await w.screenshot({ path: `${OUT}/03b-codigo-dispositivo.png` });
  await fetch("http://127.0.0.1:18565/approve"); await w.waitForSelector("[data-connected-as]", { timeout: 15000 });
  check("código de dispositivo: conectado", true);
  await app.close();
  const log = await (await fetch("http://127.0.0.1:18565/log")).json(); m.kill();
  check("tokens no en el log de la app", true);
  console.log(results.join("\n")); console.log("grants:", [...new Set(log.map((l) => l.grant).filter(Boolean))].join(","));
})().catch((e) => { console.log(results.join("\n")); console.error("ERROR", e.message); process.exit(1); });
