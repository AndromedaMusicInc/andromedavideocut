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
  if (only.includes("shortcuts")) {
    await app.evaluate(({ Menu }) => { const help = Menu.getApplicationMenu().items.find((i) => i.label === "Ayuda"); help.submenu.items.find((i) => /Atajos/.test(i.label)).click(); });
    await w.waitForSelector("[data-shortcuts]", { timeout: 3000 }).then(() => check("PC: Ayuda → Atajos de teclado abre la hoja", true), () => check("PC: Ayuda → Atajos de teclado abre la hoja", false));
    await w.keyboard.press("Escape"); await sleep(200); check("PC: Esc cierra la hoja", (await w.locator("[data-shortcuts]").count()) === 0);
    await w.keyboard.press("Shift+Slash"); await sleep(200); check("PC: ? abre la hoja", (await w.locator("[data-shortcuts]").count()) === 1);
    await w.keyboard.press("Escape");
  }
  if (only.includes("autosave")) {
    const PD = path.join(UD, "projects"), N = "window.__avcEditor.getState().clips.length";
    await w.click("[data-open-project]"); await w.waitForSelector("[data-timeline]"); await sleep(1500);
    const id = JSON.parse(fs.readFileSync(path.join(PD, "index.json"), "utf8"))[0].id;
    const n0 = await w.evaluate(N);
    await w.keyboard.press("Control+s"); await sleep(800);
    const hidx = JSON.parse(fs.readFileSync(path.join(PD, "history", id, "index.json"), "utf8"));
    check("PC: versiones en userData/projects/history/<id>", hidx.some((v) => v.reason === "manual") && hidx.some((v) => v.reason === "abrir"), hidx.map((v) => v.reason).join(","));
    check("PC: sin .tmp sueltos (escritura atómica)", !fs.readdirSync(PD).some((f) => f.endsWith(".tmp")));
    await w.evaluate(() => { const s = window.__avcEditor.getState(); window.__avcEditor.setState({ clips: s.clips.slice(1) }); }); await sleep(900);
    check("PC: .bak = guardado anterior", JSON.parse(fs.readFileSync(path.join(PD, `${id}.json.bak`), "utf8")).clips.length === n0);
    // Crash: matar el proceso sin cerrar.
    app.process().kill("SIGKILL"); await sleep(500);
    app = await launch(); w = await app.firstWindow(); await w.waitForSelector("[data-open-project]");
    await w.click("[data-open-project]"); await w.waitForSelector("[data-timeline]"); await sleep(1200);
    check("PC: tras kill detecta el cierre de golpe", (await w.evaluate(() => window.__avcCrashRecovered)) === true);
    check("PC: recupera el último autoguardado", (await w.evaluate(N)) === n0 - 1, await w.evaluate(N));
    await app.close();
    // Archivo principal dañado → se lee la copia .bak.
    fs.writeFileSync(path.join(PD, `${id}.json`), "{roto");
    app = await launch(); w = await app.firstWindow(); await w.waitForSelector("[data-open-project]");
    await w.click("[data-open-project]"); await w.waitForSelector("[data-timeline]"); await sleep(1200);
    check("PC: proyecto dañado → abre desde .bak", (await w.evaluate(N)) > 0, await w.evaluate(N));
    check("PC: cierre normal no marca crash", (await w.evaluate(() => window.__avcCrashRecovered)) === false);
    await w.click("[data-help-menu]"); await w.click("[data-help-versions]"); await w.waitForSelector("[data-version]");
    check("PC: Historial lista las versiones", (await w.locator("[data-version]").count()) >= 2);
    await w.keyboard.press("Escape");
  }
  if (global.__extra) await global.__extra({ app, w, check, sleep, launch, UD });
  await app.close();
  console.log(fails ? `FALLAS: ${fails}` : "TODO OK"); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
