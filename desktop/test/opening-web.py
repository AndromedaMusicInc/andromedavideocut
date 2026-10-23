# B17 pantalla de inicio (web): splash.png centrado sobre fondo oscuro. Uso: python3 desktop/test/opening-web.py [url]
import sys, time
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8123/"
fails = 0
def ok(n, c, d=""):
    global fails
    print(("OK   " if c else "FALLA"), n, d); fails += 0 if c else 1
SEL = "[data-opening-clip]"
with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1280, "height": 800}); pg = c.new_page()
    t0 = time.time(); pg.goto(U); pg.wait_for_selector(SEL, timeout=5000)
    ok("aparece al abrir", pg.locator(SEL).count() == 1)
    ok("splash.png (480x540) carga", pg.evaluate("(async()=>{const i=document.querySelector('#avc-open img');if(!i.complete)await new Promise(r=>i.onload=r);return i.naturalWidth===480&&i.naturalHeight===540&&i.getAttribute('src')==='./brand/splash.png'})()"))
    ok("centrado sobre fondo oscuro", pg.evaluate("(()=>{const r=document.querySelector('#avc-open img').getBoundingClientRect();const bg=getComputedStyle(document.getElementById('avc-open')).backgroundColor;return Math.abs(r.left+r.width/2-innerWidth/2)<2&&Math.abs(r.top+r.height/2-innerHeight/2)<2&&bg==='rgb(11, 11, 18)'})()"))
    pg.wait_for_selector(SEL, state="detached", timeout=4000); dt = time.time() - t0
    ok("se va solo en ≤ ~1.7 s", dt < 3.5, f"{dt:.2f}s desde goto")
    ok("deja ver el Inicio", pg.locator("[data-open-settings]").first.is_visible())
    pg.reload(); pg.wait_for_timeout(600)
    ok("una vez por sesión (recargar no lo repite)", pg.locator(SEL).count() == 0)
    c.close()
    # clic salta
    c = b.new_context(); pg = c.new_page(); pg.goto(U); pg.wait_for_selector(SEL)
    pg.mouse.click(400, 300); pg.wait_for_timeout(150); ok("clic lo salta", pg.locator(SEL).count() == 0); c.close()
    # tecla salta
    c = b.new_context(); pg = c.new_page(); pg.goto(U); pg.wait_for_selector(SEL)
    pg.keyboard.press("Space"); pg.wait_for_timeout(150); ok("tecla lo salta", pg.locator(SEL).count() == 0)
    # Ajustes: interruptor
    pg.locator("[data-open-settings]").first.click(); pg.wait_for_selector("[data-opening-toggle]")
    sw = pg.locator("[data-opening-toggle] input")
    ok("interruptor en Ajustes, encendido por defecto", sw.is_checked())
    sw.click(); ok("apagar guarda avc.openingClip='off'", pg.evaluate("localStorage.getItem('avc.openingClip')") == "off")
    pg.evaluate("sessionStorage.clear()"); pg.reload(); pg.wait_for_timeout(600)
    ok("apagado: no aparece en sesión nueva", pg.locator(SEL).count() == 0)
    pg.locator("[data-open-settings]").first.click(); sw = pg.locator("[data-opening-toggle] input")
    ok("el interruptor recuerda 'apagado'", not sw.is_checked())
    sw.click(); ok("encender borra la clave", pg.evaluate("localStorage.getItem('avc.openingClip')") is None)
    pg.evaluate("sessionStorage.clear()"); pg.reload()
    ok("encendido otra vez: aparece", pg.wait_for_selector(SEL, timeout=3000) is not None); c.close()
    # movimiento reducido
    c = b.new_context(reduced_motion="reduce"); pg = c.new_page(); pg.goto(U); pg.wait_for_timeout(700)
    ok("prefers-reduced-motion: no aparece", pg.locator(SEL).count() == 0); c.close()
    b.close()
print("TODO OK" if not fails else f"FALLAS: {fails}"); sys.exit(1 if fails else 0)
