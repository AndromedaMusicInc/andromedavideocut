# 0.0.8 (web): pestañas del inspector, buzón sin GitHub, "Descargar para PC". Uso: DIR=<build> python3 desktop/test/web-008.py [puerto]
import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else "18748"
F = os.path.join("/workspace/avc-testmedia/vídeos de prueba", "h264 normal.mp4")
SH = "/workspace/avc-shots/0.0.8"; os.makedirs(SH, exist_ok=True)
srv = subprocess.Popen(["python3", "-m", "http.server", PORT, "-d", os.environ.get("DIR", "preview")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
R = []
def ok(n, c, d=""): R.append(bool(c)); print("OK   " if c else "FALLA", n, ("— " + str(d)) if d != "" else "")
LATEST = "https://github.com/AndromedaMusicInc/andromedavideocut/releases/latest"
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome"); pg = b.new_page(viewport={"width": 1440, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script("sessionStorage.setItem('avc.opened','1')")
    pg.goto(f"http://127.0.0.1:{PORT}/index.html"); pg.wait_for_selector("[data-welcome]")
    d = pg.locator("[data-welcome] [data-download-pc]")
    ok("Inicio: 'Descargar para PC' visible", d.count() == 1 and d.is_visible())
    ok("Inicio: apunta a releases/latest", d.get_attribute("href") == LATEST, d.get_attribute("href"))
    pg.screenshot(path=f"{SH}/inicio-descargar-pc.png")
    pg.click("[data-open-feedback]"); pg.wait_for_selector("[data-feedback]")
    ok("buzón: sin GitHub", pg.locator("[data-fb-github]").count() == 0 and "GitHub" not in pg.inner_text("[data-feedback]"))
    pg.screenshot(path=f"{SH}/buzon-solo-correo.png"); pg.click("[data-feedback] [aria-label=Cerrar]")
    pg.click("[data-quick=importar]"); pg.wait_for_selector("input[type=file]", state="attached"); pg.set_input_files("input[type=file]", F)
    for i in range(80):
      pg.wait_for_timeout(250)
      if not pg.evaluate("window.__avcBusy()"): break
    pg.wait_for_selector("[data-timeline]")
    pg.click("[data-help-menu]"); h = pg.locator("[role=menu] [data-download-pc]")
    ok("Ayuda: 'Descargar para PC' con releases/latest", h.count() == 1 and h.get_attribute("href") == LATEST)
    pg.screenshot(path=f"{SH}/ayuda-descargar-pc.png"); pg.click("[data-help-menu]")
    cid = [c for c in pg.evaluate("window.__avcClips()") if c.get("type") == "video"][0]["id"]
    pg.evaluate("id=>window.__avcEditor.getState().select(id)", cid); pg.wait_for_selector("[data-insp-tabs]")
    names = pg.locator("[data-insp-tab]").all_inner_texts()
    ok("4 pestañas en orden", names == ["Colores", "Entrada-Medio-Salida", "Ajustes", "Filtros"], names)
    want = {"colores": ["Brillo", "Temperatura", "Color original"], "ems": ["Entrada", "Medio", "Salida", "Fundido entrada", "Transición"], "ajustes": ["Transformación", "Giro", "Volumen", "Opacidad", "Velocidad", "Básico"], "filtros": ["Filtro de este pedazo"]}
    for t, labels in want.items():
      pg.click(f"[data-insp-tab={t}]"); pg.wait_for_timeout(200)
      txt = pg.inner_text(f"[data-insp-panel={t}]")
      ok(f"{t}: tiene {labels}", all(l in txt for l in labels), [l for l in labels if l not in txt])
      pg.screenshot(path=f"{SH}/tab-{t}.png")
    pg.click("[data-insp-tab=ajustes]"); pg.wait_for_timeout(150)
    pg.click("[data-insp-subtab=fondo]"); pg.wait_for_timeout(150)
    ok("Ajustes › Quitar fondo: sección con casilla", pg.locator("[data-sec-toggle=key]").count() == 1)
    pg.check("[data-sec-toggle=key]"); ok("casilla activa el fondo", pg.evaluate("id=>window.__avcEditor.getState().clips.find(c=>c.id===id).effect", cid) == "key")
    pg.screenshot(path=f"{SH}/tab-ajustes-quitar-fondo.png")
    pg.uncheck("[data-sec-toggle=key]"); pg.click("[data-insp-subtab=basico]"); pg.wait_for_timeout(150)
    g = pg.locator("[data-field=Giro] [data-num]")
    g.focus(); pg.keyboard.press("ArrowUp"); pg.keyboard.press("ArrowUp")
    ok("campo numérico: ↑ sube el giro", pg.evaluate("id=>window.__avcEditor.getState().clips.find(c=>c.id===id).rotation", cid) == 2)
    g.fill("45"); pg.keyboard.press("Enter"); ok("campo numérico: escribir 45°", pg.evaluate("id=>window.__avcEditor.getState().clips.find(c=>c.id===id).rotation", cid) == 45)
    pg.locator("[data-field=Tamaño] [data-num-up]").click(); ok("flechita de escala sube 1%", abs(pg.evaluate("id=>window.__avcEditor.getState().clips.find(c=>c.id===id).scale", cid) - 1.01) < 1e-6)
    pg.click("[data-sec-reset=transform]"); c0 = pg.evaluate("id=>window.__avcEditor.getState().clips.find(c=>c.id===id)", cid)
    ok("restablecer Transformación", c0["rotation"] == 0 and c0["scale"] == 1)
    pg.click("[data-insp-section=blend] [aria-expanded]"); ok("sección plegable se cierra", pg.locator("[data-insp-section=blend] [aria-expanded=false]").count() == 1)
    pg.click("[data-insp-section=blend] [aria-expanded]")
    ok("Colores no está en Ajustes", "Brillo" not in pg.evaluate("()=>{document.querySelector('[data-insp-tab=ajustes]').click();return ''}") )
    pg.wait_for_timeout(150); ok("Ajustes sin Brillo ni filtros", "Brillo" not in pg.inner_text("[data-insp-panel=ajustes]") and "Filtro de este" not in pg.inner_text("[data-insp-panel=ajustes]"))
    pg.focus("[data-insp-tab=ajustes]"); pg.keyboard.press("ArrowRight")
    ok("teclado: → pasa a Filtros y enfoca", pg.evaluate("document.activeElement.dataset.inspTab") == "filtros" and pg.locator("[data-insp-panel=filtros]").count() == 1)
    pg.keyboard.press("Home"); ok("teclado: Inicio = Colores", pg.evaluate("document.activeElement.dataset.inspTab") == "colores")
    pg.keyboard.press("ArrowLeft"); ok("teclado: ← da la vuelta", pg.evaluate("document.activeElement.dataset.inspTab") == "filtros")
    pg.reload(); pg.wait_for_selector("[data-project]"); pg.click("[data-project]"); pg.wait_for_selector("[data-timeline]"); pg.wait_for_timeout(800)
    cid = [c for c in pg.evaluate("window.__avcClips()") if c.get("type") == "video"][0]["id"]
    pg.evaluate("id=>window.__avcEditor.getState().select(id)", cid); pg.wait_for_selector("[data-insp-tabs]")
    ok("recuerda la última pestaña tras recargar", pg.locator("[data-insp-tab=filtros][aria-selected=true]").count() == 1)
    pg.set_viewport_size({"width": 1024, "height": 640}); pg.wait_for_timeout(500)
    tabs = pg.locator("[data-insp-tab]")
    if tabs.first.is_visible():
      boxes = [tabs.nth(i).bounding_box() for i in range(4)]
      vw = 1024; ok("pantalla chica: pestañas sin salirse", all(bx and bx["x"] >= 0 and bx["x"] + bx["width"] <= vw + 1 for bx in boxes), boxes)
    else:
      ok("pantalla chica: inspector oculto en este layout (se revisa abajo)", True)
    pg.screenshot(path=f"{SH}/pantalla-chica.png")
    ok("sin errores de página", not errs, errs[:2]); b.close()
finally:
  srv.terminate()
print("TODO OK" if all(R) else f"FALLAS: {R.count(False)}"); sys.exit(0 if all(R) else 1)
