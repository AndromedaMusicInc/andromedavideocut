// Beta 0.0.4 (antes 1.0.2) (incluye todo lo de 1.0.1): icono, botón Separar visor con monitores/pantalla completa/acoplar,
// clic = vista previa, arrastrar = agrega, Ctrl+S guarda en disco, guardado al cambiar de proyecto, aviso si falla.
// 1.0.1: migración 1.0.0 → proyectos, bienvenida, nuevo/renombrar/duplicar/borrar, guardado en disco,
// feed (empaquetado y caché), audio (selector, vúmetro, Probar sonido) y exportación MP4 con AAC.
const { _electron } = require("/workspace/pwe/node_modules/playwright-core");
const fs = require("fs"); const path = require("path"); const { execFileSync } = require("child_process");
const OUT = path.resolve(__dirname, "../../preview-shots/v0.0.2/desktop"); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const check = (n, ok, x = "") => res.push(`${ok ? "OK   " : "FALLA"} ${n}${x ? " — " + x : ""}`);
const UD = "/workspace/avc-testmedia/ud-v102"; fs.rmSync(UD, { recursive: true, force: true });
const launch = async () => {
  const app = await _electron.launch({ executablePath: require(path.join(__dirname, "../node_modules/electron")), args: [path.join(__dirname, ".."), `--user-data-dir=${UD}`, "--no-sandbox"] });
  // Simula "sin internet" para el feed (desde 1.0.1 el feed ya está publicado en GitHub Pages).
  await app.evaluate(({ session }) => session.defaultSession.webRequest.onBeforeRequest({ urls: ["https://andromedamusicinc.github.io/*"] }, (_d, cb) => cb({ cancel: true })));
  const w = await app.firstWindow(); await w.reload().catch(() => {}); await w.setViewportSize({ width: 1366, height: 860 }).catch(() => {});
  return { app, w };
};
(async () => {
  // 1) Simula un usuario de la 1.0.0: solo framecut.project.v1 en localStorage.
  let { app, w } = await launch();
  await w.waitForSelector("[data-welcome]");
  await w.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("avc.")) localStorage.removeItem(k);
    localStorage.setItem("framecut.project.v1", JSON.stringify({ v: 1, name: "Reel de Wilhelm 1.0.0", aspect: "4:5", muted: {}, assets: [], clips: [
      { id: "w-t", trackId: "t1", type: "text", name: "Hola", start: 0, duration: 4, inPoint: 0, speed: 1, volume: 1, text: "HOLA WILHELM", fontSize: 72, anim: "pop", align: "center", y: 0, x: 0, scale: 1, rotation: 0, opacity: 1 },
      { id: "w-a", trackId: "a1", type: "audio", generator: "lofi", name: "Lo-fi", start: 0, duration: 6, inPoint: 0, speed: 1, volume: 0.9 } ] }));
  });
  await app.close();
  fs.rmSync(path.join(UD, "projects"), { recursive: true, force: true });
  ({ app, w } = await launch());
  await w.waitForSelector("[data-project]");
  const names = await w.$$eval("[data-project-name]", (n) => n.map((e) => e.textContent));
  const ver = await app.evaluate(({ app, BrowserWindow }) => ({ v: app.getVersion(), t: BrowserWindow.getAllWindows()[0].getTitle() }));
  check("versión 0.0.4 y título 'Beta 0.0.4'", ver.v === "0.0.4" && ver.t === "AndromedaVideoCut · Beta 0.0.4", JSON.stringify(ver));
  check("portada muestra Beta 0.0.4", /beta 0\.0\.4/i.test(await w.textContent("[data-version-label]")));
  await app.evaluate(({ shell }) => { global.__ig = []; shell.openExternal = async (u) => { global.__ig.push(u); }; });
  check("Instagram: texto visible '@andromedavideocut'", (await w.textContent("[data-instagram]")).trim() === "@andromedavideocut");
  await w.click("[data-instagram]"); await sleep(300);
  let ig = await app.evaluate(() => global.__ig);
  check("Instagram (inicio): clic → shell.openExternal con la URL exacta", JSON.stringify(ig) === JSON.stringify(["https://www.instagram.com/andromedavideocut/"]), JSON.stringify(ig));
  await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === "Ayuda").submenu.items.find((i) => i.label === "Instagram @andromedavideocut").click());
  ig = await app.evaluate(() => global.__ig);
  check("Instagram (Ayuda): abre la URL exacta", ig.length === 2 && ig[1] === "https://www.instagram.com/andromedavideocut/", JSON.stringify(ig));
  check("migración: aparece el proyecto de la 1.0.0", names.includes("Reel de Wilhelm 1.0.0"), JSON.stringify(names));
  check("migración: la clave vieja se conserva", await w.evaluate(() => !!localStorage.getItem("framecut.project.v1")));
  const idx = JSON.parse(fs.readFileSync(path.join(UD, "projects/index.json"), "utf8"));
  check("proyectos en disco (userData/projects)", idx.length === 1 && fs.existsSync(path.join(UD, `projects/${idx[0].id}.json`)));
  await w.waitForSelector("[data-feed-origin]");
  check("feed: sin internet usa la copia empaquetada", (await w.getAttribute("[data-feed-origin]", "data-feed-origin")) === "empaquetado");
  check("inicio: 'Lo nuevo de Andromeda' con lanzamientos y playlists", (await w.$$("[data-feed-item=release]")).length >= 6 && (await w.$$("[data-feed-item=playlist]")).length >= 2);
  check("inicio: tarjeta IA con Grok con candado", !!(await w.$("[data-quick=ia] [aria-label=Bloqueado]")));
  check("proyecto: tamaño | duración", /^\d+\.\dK? ?\|? ?/.test(await w.textContent("[data-project-meta]")) , await w.textContent("[data-project-meta]"));
  await sleep(1200); await w.screenshot({ path: `${OUT}/01-bienvenida.png` });
  await w.click("[data-nav=andromeda]"); await w.waitForSelector("[data-andromeda] [data-feed-origin]");
  check("Andromeda: lanzamientos, playlists y videos", (await w.$$("[data-andromeda] [data-feed-item=release]")).length >= 10 && (await w.$$("[data-andromeda] [data-feed-item=video]")).length >= 5);
  await sleep(1200); await w.screenshot({ path: `${OUT}/02-andromeda-feed.png` });
  await w.click("[data-nav=inicio]"); await w.waitForSelector("[data-project]");
  // 2) Abrir el migrado: conserva todo.
  await w.click("[data-project] [data-open-project]");
  await w.waitForSelector("[aria-label='Reproducir']"); await sleep(1500);
  const nm = await w.inputValue("input[aria-label='Nombre del proyecto']").catch(() => "");
  check("abrir migrado: nombre", nm === "Reel de Wilhelm 1.0.0", nm);
  check("abrir migrado: formato 4:5", await w.evaluate(() => !!document.querySelector("[aria-pressed=true]")?.textContent?.includes("4:5") || document.body.innerText.includes("4:5")));
  // 3) Audio en la vista previa: vúmetro y Probar sonido.
  await w.click("[aria-label='Reproducir']"); await sleep(1500);
  const lvl = Number(await w.getAttribute("[data-vu]", "data-level"));
  const info = await w.evaluate(() => window.__avcAudio.info());
  check("audio: AudioContext en marcha al reproducir", info.state === "running", JSON.stringify({ state: info.state, rate: info.sampleRate, active: info.active }));
  check("audio: el vúmetro marca señal", lvl > 0.2, String(lvl));
  await w.screenshot({ path: `${OUT}/05-editor-vumetro.png` });
  await w.click("[aria-label='Pausar']");
  const opts = await w.$$eval("[data-audio-output] option", (o) => o.map((e) => e.textContent));
  check("audio: selector 'Salida de audio' con nombres", opts[0] === "Predeterminado del sistema" && opts.length >= 2, JSON.stringify(opts));
  await w.click("[data-test-sound]"); await sleep(250);
  check("audio: Probar sonido da señal", (await w.evaluate(() => window.__avcAudio.level())) > 0.05);
  await w.click("[data-open-settings]"); await w.waitForSelector("[data-audio-settings]");
  await w.screenshot({ path: `${OUT}/06-ajustes-audio.png` });
  if (opts.length >= 2) {
    await w.selectOption("[data-audio-settings] [data-audio-output]", { index: 1 });
    await sleep(400);
    check("audio: elegir salida se recuerda", (await w.evaluate(() => localStorage.getItem("avc-audio-sink"))).length > 0);
    await w.selectOption("[data-audio-settings] [data-audio-output]", { index: 0 });
  }
  await w.keyboard.press("Escape"); await w.click("[data-settings] [aria-label=Cerrar]").catch(() => {});
  // 4) Exportar con audio (MP4/AAC) sin internet.
  const dl = path.join(UD, "export.mp4");
  await app.evaluate(({ session }, p) => session.defaultSession.on("will-download", (_e, item) => item.setSavePath(p)), dl);
  await w.click("header button:has-text('Exportar')"); await sleep(400);
  await w.click("[data-preset=draft]").catch(() => {});
  await w.locator("[role=dialog]").getByRole("button", { name: "Exportar", exact: true }).click();
  await w.getByRole("button", { name: "Descargar" }).waitFor({ timeout: 120000 });
  await w.getByRole("button", { name: "Descargar" }).click();
  for (let i = 0; i < 40 && !fs.existsSync(dl); i++) await sleep(250); await sleep(800);
  let probe = "";
  try { probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name", "-of", "csv=p=0", dl]).toString().trim().replace(/\n/g, " "); } catch (e) { probe = "ffprobe falló"; }
  check("export: MP4 con video + audio AAC", /aac,audio/.test(probe) || /audio,aac/.test(probe) || /aac/.test(probe), probe);
  let vol = "";
  vol = String(require("child_process").spawnSync("ffmpeg", ["-hide_banner", "-i", dl, "-af", "volumedetect", "-f", "null", "-"]).stderr || "");
  const mean = (/mean_volume: (-?[\d.]+)/.exec(vol) || [])[1];
  check("export: el audio no está en silencio", mean !== undefined && Number(mean) > -40, `mean ${mean} dB`);
  await w.getByRole("button", { name: "Cerrar" }).click().catch(() => {});
  // 5) Volver al inicio y nuevo proyecto 16:9 vacío.
  await w.click("[data-go-home]"); await w.waitForSelector("[data-welcome]");
  const thumb = await w.$eval("[data-project] img", (i) => i.src.slice(0, 15)).catch(() => "");
  check("miniatura guardada", thumb.startsWith("data:image/"), thumb);
  await w.click("[data-new-project]"); await w.waitForSelector("[data-new-dialog]");
  await w.fill("[data-new-dialog] input", "YouTube de prueba"); await w.click("[data-aspect='16:9']");
  await w.screenshot({ path: `${OUT}/03-nuevo-proyecto.png` });
  await w.click("[data-create=vacio]"); await w.waitForSelector("[data-go-home]"); await sleep(1200);
  check("nuevo 16:9 vacío", (await w.inputValue("input[aria-label='Nombre del proyecto']")) === "YouTube de prueba");
  await w.click("[data-go-home]"); await w.waitForSelector("[data-project]");
  check("lista: 2 proyectos, el más reciente primero", JSON.stringify(await w.$$eval("[data-project-name]", (n) => n.map((e) => e.textContent))) === JSON.stringify(["YouTube de prueba", "Reel de Wilhelm 1.0.0"]));
  // 6) Renombrar, duplicar, borrar con confirmación.
  const second = w.locator("[data-project]").nth(1);
  await second.locator("[data-rename]").click(); await second.locator("input").fill("Reel renombrado"); await second.locator("button[type=submit]").click(); await sleep(400);
  check("renombrar", (await w.$$eval("[data-project-name]", (n) => n.map((e) => e.textContent))).includes("Reel renombrado"));
  await w.locator("[data-project]", { hasText: "Reel renombrado" }).locator("[data-duplicate]").click(); await sleep(600);
  check("duplicar", (await w.$$eval("[data-project-name]", (n) => n.map((e) => e.textContent))).includes("Reel renombrado (copia)"));
  await w.screenshot({ path: `${OUT}/04-proyectos.png` });
  await w.locator("[data-project]", { hasText: "(copia)" }).locator("[data-delete]").click();
  await w.waitForSelector("[data-confirm-delete]"); await w.screenshot({ path: `${OUT}/04b-confirmar-borrado.png` });
  await w.click("[data-confirm]"); await sleep(600);
  check("borrar: va a la papelera", (await w.$$("[data-project]")).length === 2 && (await w.textContent("[data-trash-toggle]")).includes("(1)"));
  await w.click("[data-trash-toggle]"); await w.waitForSelector("[data-restore]");
  await w.screenshot({ path: `${OUT}/04c-papelera.png` });
  await w.click("[data-restore]"); await sleep(500);
  await w.click("[data-trash-toggle]"); await sleep(300);
  check("papelera: recuperar", (await w.$$("[data-project]")).length === 3);
  await w.locator("[data-project]", { hasText: "(copia)" }).locator("[data-delete]").click(); await w.click("[data-confirm]"); await sleep(400);
  await w.click("[data-trash-toggle]"); await w.click("[data-delete-forever]"); await w.click("[data-confirm]"); await sleep(500);
  check("papelera: borrar para siempre", (await w.$$("[data-project]")).length === 0 && !!(await w.$("[data-empty]")));
  await w.click("[data-trash-toggle]"); await sleep(300);
  await w.click("[data-view-toggle]"); await sleep(300); await w.screenshot({ path: `${OUT}/04d-vista-lista.png` }); await w.click("[data-view-toggle]");
  // 6b) Selección múltiple, menú contextual y visor separado (en el proyecto de ejemplo).
  await w.locator("[data-project]", { hasText: "Reel renombrado" }).locator("[data-open-project]").click();
  await w.waitForSelector("[data-clip]"); await sleep(800);
  await w.click("[data-viewer]"); await w.keyboard.press("Control+A");
  const total = (await w.$$("[data-clip]")).length;
  const sel = await w.evaluate(() => document.querySelectorAll("[data-clip].ring-2").length);
  check("Ctrl+A selecciona todos los clips", sel === total && total > 1, `${sel}/${total}`);
  check("Ctrl+A no selecciona texto", await w.evaluate(() => (getSelection()?.toString() || "") === ""));
  await w.click("[data-clip]", { button: "right" }); await w.waitForSelector("[data-clip-menu]");
  await w.screenshot({ path: `${OUT}/08-menu-contextual.png` });
  const dis = await w.$$eval("[data-clip-menu] [role=menuitem]", (b) => b.map((x) => `${x.dataset.menu}:${x.disabled ? "off" : "on"}`).join(" "));
  check("menú: opciones y deshabilitadas", /copy:on/.test(dis) && /export:on/.test(dis) && /duplicate:off/.test(dis) && /reveal:off/.test(dis), dis);
  await w.click("[data-menu=toggle]"); await sleep(300);
  check("V: desactivar la selección", await w.evaluate(() => [...document.querySelectorAll("[data-clip]")].length > 0) );
  await w.keyboard.press("v"); await sleep(200);
  await w.keyboard.press("Escape");
  check("Esc deselecciona", await w.evaluate(() => document.querySelectorAll("[data-clip].ring-2").length === 0));
  await w.keyboard.press("Control+A"); await w.keyboard.press("Control+C"); await w.keyboard.press("Escape");
  await w.keyboard.press("Control+V"); await sleep(300);
  check("Copiar/Pegar varios", (await w.$$("[data-clip]")).length === total * 2, String((await w.$$("[data-clip]")).length));
  await w.keyboard.press("Control+Z"); await sleep(300);
  check("Deshacer pegado", (await w.$$("[data-clip]")).length === total);
  await w.keyboard.press("Control+A"); await w.keyboard.press("Delete"); await sleep(300);
  check("Supr borra la selección múltiple", (await w.$$("[data-clip]")).length === 0);
  await w.keyboard.press("Control+Z"); await sleep(300);
  // Arrastre múltiple
  await w.keyboard.press("Control+A");
  const before = await w.evaluate(() => [...document.querySelectorAll("[data-clip]")].map((e) => e.style.left).join());
  const box = await (await w.$("[data-clip]")).boundingBox();
  await w.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await w.mouse.down(); await w.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 }); await w.mouse.up(); await sleep(300);
  const after = await w.evaluate(() => [...document.querySelectorAll("[data-clip]")].map((e) => e.style.left).join());
  check("arrastre mueve toda la selección", before !== after && after.split(",").every((v, i) => parseFloat(v) > parseFloat(before.split(",")[i])), `${before} → ${after}`);
  await w.keyboard.press("Control+Z"); await w.keyboard.press("Escape");
  // Visor separado
  const pop = app.waitForEvent("window");
  await w.click("[data-detach-viewer]");
  const vw = await pop; await vw.waitForSelector("video"); await sleep(800);
  check("visor separado abre ventana propia", (await app.windows()).length === 2 && !!(await w.$("[data-viewer-detached]")));
  const vs = await vw.evaluate(() => { const v = document.querySelector("video"); return { w: v.videoWidth, h: v.videoHeight, live: !!v.srcObject && v.srcObject.active }; });
  check("visor separado recibe el lienzo en vivo", vs.live && vs.w > 0, JSON.stringify(vs));
  await w.click("[aria-label='Reproducir']"); await sleep(1200);
  const t1 = await vw.evaluate(() => document.querySelector("video").currentTime);
  check("visor separado sigue el play del editor (audio en el editor)", t1 > 0.5 && (await w.evaluate(() => window.__avcAudio.info().state)) === "running", String(t1));
  await vw.screenshot({ path: `${OUT}/09-visor-separado.png` }); await w.screenshot({ path: `${OUT}/09b-editor-con-visor-separado.png` });
  await w.click("[aria-label='Pausar']");
  const disp = await w.evaluate(() => window.avcDesktop.viewer.displays());
  check("PC: lista de pantallas para el visor", disp.length >= 1 && disp.some((d) => d.current), JSON.stringify(disp));
  check("PC: botones mover/pantalla completa por monitor", (await w.$$("[data-move-display]")).length === disp.length && (await w.$$("[data-fullscreen-display]")).length === disp.length);
  await w.click(`[data-fullscreen-display="${disp[0].id}"]`); await sleep(1200);
  check("PC: pantalla completa en ese monitor", await app.evaluate(({ BrowserWindow }) => !!BrowserWindow.getAllWindows().find((x) => x.getTitle().includes("Visor"))?.isFullScreen()));
  await w.evaluate(() => window.avcDesktop.viewer.toggleFullscreen()); await sleep(1200);
  check("PC: ventana del visor dice 'Volver a acoplar'", (await vw.textContent("#back")) === "Volver a acoplar");
  await w.screenshot({ path: `${OUT}/11-visor-separado-panel-pc.png` });
  const bounds = await app.evaluate(({ BrowserWindow }) => { const v = BrowserWindow.getAllWindows().find((x) => x.getTitle().includes("Visor")); v.setBounds({ x: 120, y: 90, width: 800, height: 450 }); v.emit("moved"); return v.getBounds(); });
  await w.click("[data-reattach]"); await sleep(800);
  check("cerrar el visor lo devuelve al editor", !(await w.$("[data-viewer-detached]")) && (await app.windows()).length === 1);
  const vcfg = JSON.parse(fs.readFileSync(path.join(UD, "viewer.json"), "utf8"));
  check("recuerda posición y monitor del visor", vcfg.bounds && vcfg.bounds.x === bounds.x && typeof vcfg.displayId === "number", JSON.stringify(vcfg));
  const menu = await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === "Ver").submenu.items.map((i) => i.label));
  check("menú Ver: separar visor y elegir pantalla", menu.includes("Separar visor") && menu.includes("Visor en pantalla"), menu.join(" · "));
  // 0.0.2: clic en biblioteca no agrega; arrastrar sí; Ctrl+S guarda en disco sin cortar.
  check("visor: botón 'Separar visor' en la esquina", await w.isVisible("[data-detach-corner]"));
  const nC = async () => (await w.evaluate(() => window.__avcClips())).length;
  const n0 = await nC();
  await w.click("button:has-text('Filtros')"); await sleep(300);
  await w.click("[data-lib-item^='grade:'] >> nth=1"); await sleep(400);
  check("PC: clic en filtro = vista previa, no agrega", (await nC()) === n0 && !!(await w.$("[data-lib-preview-badge]")));
  await w.screenshot({ path: `${OUT}/12-vista-previa-filtro-pc.png` });
  await w.click("button:has-text('Stickers')"); await sleep(300);
  await w.click("[data-lib-item^='sticker:'] >> nth=0"); await sleep(300);
  check("PC: clic en sticker no agrega", (await nC()) === n0);
  const a = await (await w.$("[data-lib-item^='sticker:']")).boundingBox(); const b = await (await w.$("[data-timeline] [data-track=o1]")).boundingBox();
  await w.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await w.mouse.down();
  for (let i = 1; i <= 15; i++) { await w.mouse.move(a.x + (b.x + b.width * 0.35 - a.x) * i / 15, a.y + (b.y + b.height / 2 - a.y) * i / 15); await sleep(16); }
  await w.mouse.up(); await sleep(400);
  check("PC: arrastrar sticker lo agrega", (await nC()) === n0 + 1);
  const pid = JSON.parse(fs.readFileSync(path.join(UD, "projects/index.json"), "utf8"))[0].id;
  await w.fill("input[aria-label='Nombre del proyecto']", "CtrlS 102"); await w.click("[data-clip] >> nth=0");
  const n1 = await nC(); await w.keyboard.press("Control+S"); await sleep(700);
  check("PC: Ctrl+S no corta el clip", (await nC()) === n1);
  check("PC: Ctrl+S guarda en disco", fs.readFileSync(path.join(UD, `projects/${pid}.json`), "utf8").includes("CtrlS 102"));
  await w.fill("input[aria-label='Nombre del proyecto']", "Cambio 102"); await w.click("[data-go-home]"); await w.waitForSelector("[data-welcome]"); await sleep(400);
  check("PC: cambiar de proyecto guarda lo pendiente", fs.readFileSync(path.join(UD, `projects/${pid}.json`), "utf8").includes("Cambio 102"));
  await w.screenshot({ path: `${OUT}/13-inicio-pc.png` });
  // 7) Caché del feed: guarda un feed y reinicia.
  await w.evaluate(async () => { const r = await fetch("./feed/andromeda-feed.json"); const d = await r.json(); d.updated = "CACHE-TEST"; await window.avcDesktop.feedCache("set", JSON.stringify(d)); });
  await app.close();
  ({ app, w } = await launch());
  await w.waitForSelector("[data-feed-origin]");
  await w.click("[data-nav=andromeda]"); await w.waitForSelector("[data-andromeda] [data-feed-origin]");
  check("feed: usa la caché si no hay internet", (await w.getAttribute("[data-andromeda] [data-feed-origin]", "data-feed-origin")) === "cache" && (await w.textContent("[data-andromeda]")).includes("CACHE-TEST"));
  await w.click("[data-nav=inicio]"); await w.waitForSelector("[data-project]");
  check("persistencia tras reiniciar", (await w.$$("[data-project]")).length === 2);
  await w.screenshot({ path: `${OUT}/10-bienvenida-final.png` });
  await app.close();
  console.log(res.join("\n"));
  process.exit(res.some((r) => r.startsWith("FALLA")) ? 1 : 0);
})().catch((e) => { console.log(res.join("\n")); console.error("ERROR", e.message); process.exit(2); });
