# 0.0.6 (web): buzón de sugerencias, atajos, logo de la biblioteca, guardado a prueba de fallas. Uso: python3 desktop/test/web-006.py [puerto]
import sys, subprocess, time, json
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else "18740"
srv = subprocess.Popen(["python3", "-m", "http.server", PORT, "-d", "."], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
U = f"http://127.0.0.1:{PORT}/preview/"  # subruta, como en GitHub Pages
R = []
def ok(n, c, d=""): R.append(bool(c)); print("OK   " if c else "FALLA", n, ("— " + str(d)) if d != "" else "")
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome"); c = b.new_context(viewport={"width": 1440, "height": 900}); pg = c.new_page()
    errs = []; bad = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("response", lambda r: r.status >= 400 and bad.append(f"{r.status} {r.url}"))
    pg.add_init_script("sessionStorage.setItem('avc.opened','1'); window.__opened=[]; window.__avcOpenLinkSpy=(u)=>window.__opened.push(u);")
    pg.goto(U); pg.wait_for_selector("[data-open-feedback]")
    # --- 1) Buzón ---
    pg.click("[data-open-feedback]"); pg.wait_for_selector("[data-feedback]")
    ok("buzón: se abre desde Inicio", True)
    ok("buzón: Enviar desactivado sin texto", pg.is_disabled("[data-fb-send]"))
    pg.click("[data-fb-kind=bug]"); pg.fill("[data-fb-text]", "El imán no pega & falla?"); pg.fill("[data-fb-email]", "yo@correo.com")
    meta = pg.inner_text("[data-fb-meta]"); ok("buzón: adjunta versión y plataforma", "0.0.6" in meta and "Web (" in meta, meta)
    pg.click("[data-fb-send]"); u = pg.evaluate("window.__opened[0]")
    q = parse_qs(urlparse(u).query) if u else {}
    ok("buzón: Enviar abre mailto a info@", bool(u) and u.startswith("mailto:info@andromedamusicinc.com?"), (u or "")[:70])
    ok("buzón: asunto '[AndromedaVideoCut 0.0.6] Bug'", q.get("subject", [""])[0] == "[AndromedaVideoCut 0.0.6] Bug", q.get("subject"))
    body = q.get("body", [""])[0]; ok("buzón: cuerpo prellenado", "El imán no pega & falla?" in body and "Contacto: yo@correo.com" in body and "Versión: 0.0.6" in body)
    pg.click("[data-fb-github]"); g = pg.evaluate("window.__opened[1]")
    ok("buzón: 'Abrir en GitHub' = issue nuevo prellenado", g.startswith("https://github.com/AndromedaMusicInc/andromedavideocut/issues/new?") and "yo%40correo.com" not in g, g[:90])
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200); ok("buzón: Esc cierra", pg.locator("[data-feedback]").count() == 0)
    # Ayuda en el editor
    pg.click("[data-open-project]"); pg.wait_for_selector("[data-timeline]"); pg.wait_for_timeout(600)
    pg.click("[data-help-menu]"); pg.click("[data-help-feedback]"); ok("Ayuda (editor) → Buzón", pg.locator("[data-feedback]").count() == 1)
    pg.click("[data-feedback] [aria-label=Cerrar]")
    pg.evaluate("window.__avcEditor.getState().setTool('media')"); pg.wait_for_timeout(500)
    lw = pg.evaluate("(()=>{const i=document.querySelector('img[alt=\"Andromeda Video\"]');return i?[i.getAttribute('src'),i.naturalWidth]:null})()")
    ok("logo de la biblioteca carga en /preview/ (ruta relativa)", lw and lw[1] > 0 and not lw[0].startswith("/"), lw)
    ok("sin errores de página", not errs, errs[:2])
    ok("sin 404 (logo de la biblioteca incluido)", not [x for x in bad if "brand/" in x], [x for x in bad if "brand/" in x])
    b.close()
finally:
  srv.terminate()
print("TODO OK" if all(R) else f"FALLAS: {R.count(False)}"); sys.exit(0 if all(R) else 1)
