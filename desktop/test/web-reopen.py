# 0.0.7: abrir un proyecto guardado debe mostrar imagen y reproducir (bug "sale en negro y nada da play").
import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else "18741"
F = os.path.join("/workspace/avc-testmedia/vídeos de prueba", "h264 normal.mp4")
srv = subprocess.Popen(["python3", "-m", "http.server", PORT, "-d", os.environ.get("DIR","preview")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
R = []
def ok(n, c, d=""): R.append(bool(c)); print("OK   " if c else "FALLA", n, ("— " + str(d)) if d != "" else "")
def frames(pg, aid):
  c = [c for c in pg.evaluate("window.__avcClips()") if c.get("assetId") == aid][0]
  pg.evaluate("t=>window.__avcSeek(t)", c["start"] + 0.5); pg.wait_for_timeout(1200)
  pl = [x for x in pg.evaluate("window.__avcPool()") if x["id"] == aid]
  return bool(pl and pl[0]["ready"] >= 2 and pl[0]["w"] > 0), pl
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome"); pg = b.new_page(viewport={"width": 1440, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script("sessionStorage.setItem('avc.opened','1')")
    pg.goto(f"http://127.0.0.1:{PORT}/index.html"); pg.wait_for_selector("[data-welcome]"); pg.click("[data-quick=importar]"); pg.wait_for_selector("input[type=file]", state="attached")
    pg.set_input_files("input[type=file]", F)
    for i in range(80):
      pg.wait_for_timeout(250)
      if not pg.evaluate("window.__avcBusy()"): break
    aid = pg.evaluate("window.__avcAssets()")[-1]["id"]
    f0, _ = frames(pg, aid); ok("recién importado: se ve", f0)
    pg.keyboard.press("Control+s"); pg.wait_for_timeout(800)
    pg.click("[aria-label='Volver al inicio']"); pg.wait_for_selector("[data-project]"); pg.wait_for_timeout(800)
    for paso in ["volver a abrir (sin recargar)", "abrir tras recargar"]:
      if "recargar" in paso: pg.reload(); pg.wait_for_selector("[data-project]")
      pg.click("[data-project]"); pg.wait_for_selector("[data-timeline]"); pg.wait_for_timeout(1500)
      a = pg.evaluate("id=>window.__avcEditor.getState().assets.filter(a=>a.id===id).map(a=>({status:a.status,url:a.url||null,error:a.error||null}))", aid)
      ok(f"{paso}: el recurso tiene url", a and a[0].get("url"), a and {k: a[0].get(k) for k in ("status", "url", "error")})
      f1, pl = frames(pg, aid); ok(f"{paso}: se ve", f1, pl)
      pg.evaluate("window.__avcSeek(0)"); pg.keyboard.press("Space"); pg.wait_for_timeout(1500); pg.keyboard.press("Space")
      t = pg.evaluate("window.__avcTime ? window.__avcTime() : null"); ok(f"{paso}: play avanza", t is None or t > 0.3, t)
      pg.click("[aria-label='Volver al inicio']"); pg.wait_for_selector("[data-project]"); pg.wait_for_timeout(600)
    ok("sin errores de página", not errs, errs[:2]); b.close()
finally:
  srv.terminate()
print("TODO OK" if all(R) else f"FALLAS: {R.count(False)}"); sys.exit(0 if all(R) else 1)
