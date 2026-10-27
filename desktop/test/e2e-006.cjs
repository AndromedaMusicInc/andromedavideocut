// 0.0.6 en la app de PC: buzón (shell.openExternal), atajos, guardado a prueba de fallas. Uso: xvfb-run node test/e2e-006.cjs
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const UD = "/workspace/avc-testmedia/ud-006"; fs.rmSync(UD, { recursive: true, force: true });
let fails = 0; const check = (n, ok, d = "") => { console.log(`${ok ? "OK  " : "FALLA"} ${n} ${d}`); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const launch = (env = {}) => _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--no-sandbox"], env: { ...process.env, AVC_NO_SPLASH: "1", ...env } });
const only = (process.argv[2] || "feedback,shortcuts,autosave").split(",");
(async () => {
  let app = await launch(); let w = await app.firstWindow(); await w.waitForSelector("[data-open-feedback]");
  const VER = require("../package.json").version;
  if (only.includes("feedback")) {
    await app.evaluate(({ shell }) => { global.__opened = []; shell.openExternal = async (u) => { global.__opened.push(u); }; });
    // Menú Ayuda → Buzón de sugerencias…
    await app.evaluate(({ Menu }) => { const help = Menu.getApplicationMenu().items.find((i) => i.label === "Ayuda"); help.submenu.items.find((i) => /Buzón/.test(i.label)).click(); });
    await w.waitForSelector("[data-feedback]", { timeout: 3000 }).then(() => check("PC: Ayuda → Buzón de sugerencias abre el formulario", true), () => check("PC: Ayuda → Buzón de sugerencias abre el formulario", false));
    await w.fill("[data-fb-text]", "Idea desde la PC"); 
    const meta = await w.innerText("[data-fb-meta]"); check("PC: adjunta versión y plataforma PC", meta.includes(VER) && /PC \(/.test(meta), meta);
    await w.click("[data-fb-send]"); await sleep(300);
    await w.click("[data-fb-github]"); await sleep(300);
    const op = await app.evaluate(() => global.__opened);
    check("PC: Enviar usa shell.openExternal con mailto a info@", op[0]?.startsWith("mailto:info@andromedamusicinc.com?subject=") && decodeURIComponent(op[0]).includes(`[AndromedaVideoCut ${VER}] Sugerencia`), (op[0] || "").slice(0, 80));
    check("PC: 'Abrir en GitHub' usa shell.openExternal con el issue", op[1]?.startsWith("https://github.com/AndromedaMusicInc/andromedavideocut/issues/new?"), (op[1] || "").slice(0, 80));
    const blocked = await w.evaluate(() => window.avcDesktop.openExternal("mailto:otro@x.com?subject=x").then(() => "ok"));
    const op2 = await app.evaluate(() => global.__opened.length);
    check("PC: no abre mailto a otros correos", op2 === 2, `${blocked} ${op2}`);
    await w.click("[data-feedback] [aria-label=Cerrar]");
    await w.click("[data-open-feedback]"); check("PC: botón Sugerencias en Inicio", (await w.locator("[data-feedback]").count()) === 1);
    await w.click("[data-feedback] [aria-label=Cerrar]");
  }
  if (global.__extra) await global.__extra({ app, w, check, sleep, launch, UD });
  await app.close();
  console.log(fails ? `FALLAS: ${fails}` : "TODO OK"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
