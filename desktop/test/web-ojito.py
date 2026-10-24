# 0.0.5 (web): ojito por pista (oculta = fuera del visor, deshacer) y línea fina de inserción al arrastrar entre canales.
from playwright.sync_api import sync_playwright
import subprocess,time,hashlib
srv=subprocess.Popen(["python3","-m","http.server","18733","-d","preview"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
R=[]
def ok(n,c,d=""): R.append(bool(c)); print("OK   " if c else "FALLA",n,("— "+str(d)) if d!="" else "")
def canvas(pg): pg.wait_for_timeout(400); return hashlib.md5(pg.evaluate("document.querySelector('[data-preview-canvas]').toDataURL()").encode()).hexdigest()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--autoplay-policy=no-user-gesture-required"]); pg=b.new_page(viewport={"width":1440,"height":900})
  errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
  pg.goto("http://127.0.0.1:18733/index.html"); pg.wait_for_selector("[data-project]"); pg.click("[data-open-project]"); pg.wait_for_selector("[data-timeline]"); pg.wait_for_timeout(800)
  pg.evaluate("window.__avcEditor.getState().loadDemo()"); pg.wait_for_timeout(500)
  pg.evaluate("window.__avcSeek && window.__avcSeek(1.5)")
  vt=pg.evaluate("[...new Set(window.__avcClips().filter(c=>c.type==='video'||c.type==='image'||c.type==='generator').map(c=>c.trackId))]")
  ok("hay pistas visuales en la demo",len(vt)>0,vt)
  ok("cada pista tiene ojito",pg.locator("[data-eye]").count()>=3,pg.locator("[data-eye]").count())
  before=canvas(pg)
  for t in vt: pg.click(f"[data-eye='{t}']")
  hid=canvas(pg)
  ok("ocultar pistas cambia el visor",hid!=before)
  ok("pista marcada como oculta",pg.locator(f".lanes [data-track='{vt[0]}'][data-hidden]").count()==1 and pg.get_attribute(f"[data-eye='{vt[0]}']","aria-pressed")=="true")
  ok("queda en el estado del proyecto",pg.evaluate(f"window.__avcEditor.getState().hidden['{vt[0]}']")==True)
  for _ in vt: pg.evaluate("window.__avcEditor.getState().undo()")
  ok("deshacer la vuelve a mostrar",canvas(pg)==before and not pg.evaluate(f"!!window.__avcEditor.getState().hidden['{vt[0]}']"))
  pg.evaluate("window.__avcEditor.getState().redo()")
  ok("rehacer la oculta otra vez",pg.evaluate(f"window.__avcEditor.getState().hidden['{vt[0]}']")==True)
  pg.evaluate("window.__avcEditor.getState().undo()")
  # arrastre: llevar un clip al borde entre dos canales
  rows=pg.evaluate("[...document.querySelectorAll('.lanes [data-track]')].map(e=>{const r=e.getBoundingClientRect();return [e.dataset.track,r.top,r.bottom]})")
  clip=pg.locator("[data-clip]").first; bb=clip.bounding_box(); n0=len(rows)
  sx,sy=bb["x"]+bb["width"]/2,bb["y"]+bb["height"]/2; ty=rows[1][2]  # borde inferior del 2º canal
  pg.mouse.move(sx,sy); pg.mouse.down()
  for i in range(1,21): pg.mouse.move(sx+30*i/20, sy+(ty-sy)*i/20); pg.wait_for_timeout(16)
  pg.wait_for_timeout(300)
  ins=pg.locator(".lanes [data-insert]")
  h=ins.bounding_box()["height"] if ins.count() else None
  rows2=pg.evaluate("[...document.querySelectorAll('.lanes [data-track]')].map(e=>e.getBoundingClientRect().top)")
  ok("aparece la línea de inserción",ins.count()==1)
  ok("la línea es fina (no abre un canal)",h is not None and h<6,h)
  ok("los canales de abajo no se desplazan",abs(rows2[2]-rows[2][1])<2,(rows2[2],rows[2][1]))
  pg.mouse.up(); pg.wait_for_timeout(500)
  n1=pg.locator(".lanes [data-track]").count()
  ok("soltar sobre la línea crea canal nuevo",n1==n0+1,(n0,n1))
  ok("sin errores de página",not errs,errs[:2])
  b.close()
finally: srv.kill()
print(f"{sum(R)}/{len(R)}")
