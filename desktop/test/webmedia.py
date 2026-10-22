# 0.0.3 (web): importar videos reales. Lo que el navegador decodifica entra con imagen; lo demás da un mensaje claro
# ("Formato no compatible en la web: … Más formatos en la versión de PC"), nunca un clip en blanco.
from playwright.sync_api import sync_playwright
import subprocess,time,os,sys
D=os.environ.get("MEDIA_DIR","/tmp/avc media/vídeos de prueba")
srv=subprocess.Popen(["python3","-m","http.server","18733","-d","preview"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
R=[]
def ok(n,c,d=""): R.append(bool(c)); print("OK   " if c else "FALLA",n,("— "+str(d)) if d!="" else "")
files=sorted(f for f in os.listdir(D) if "1GB" not in f)
with sync_playwright() as p:
  b=p.chromium.launch(channel=os.environ.get("CH") or None); pg=b.new_page(viewport={"width":1440,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
  pg.goto("http://127.0.0.1:18733/index.html"); pg.wait_for_selector("[data-welcome]"); pg.click("[data-quick=importar]"); pg.wait_for_selector("input[type=file]",state="attached")
  ok("web: aviso de formatos y 'más formatos en la versión de PC'","versión de PC" in pg.inner_text("[data-web-formats]"))
  acc=pg.get_attribute("input[type=file]","accept"); ok("selector acepta .mxf .mts .mkv .avi .r3d .nev",all(x in acc for x in [".mxf",".mts",".mkv",".avi",".r3d",".nev"]))
  for f in files:
    n0=len(pg.evaluate("window.__avcAssets()")); pg.evaluate("document.querySelector('[data-import-error-close]')?.click()")
    pg.set_input_files("input[type=file]",os.path.join(D,f))
    for i in range(80):
      pg.wait_for_timeout(250)
      if not pg.evaluate("window.__avcBusy()"): break
    a=pg.evaluate("window.__avcAssets()"); err=pg.evaluate("document.querySelector('[data-import-error]')?.textContent||''")
    added=len(a)>n0
    frames=False
    if added:
      aid=a[-1]["id"]; pg.evaluate("t=>window.__avcSeek(t)",[c for c in pg.evaluate("window.__avcClips()") if c.get("assetId")==aid][0]["start"]+0.5); pg.wait_for_timeout(900)
      pl=[x for x in pg.evaluate("window.__avcPool()") if x["id"]==aid]; frames=bool(pl and pl[0]["ready"]>=2 and pl[0]["w"]>0)
    state="se ve" if added and frames else ("mensaje" if err and not added else "EN BLANCO")
    print(f"      {f:26} {state:9} {err[:150]}")
    ok(f"web {f}: o se ve o hay mensaje claro (nunca en blanco)",state!="EN BLANCO")
    if not added: ok(f"web {f}: el mensaje dice qué formato es y 'versión de PC'","no compatible" in err and ("versión de PC" in err or "NX Studio" in err))
  pg.screenshot(path="preview-shots/v0.0.3/web-medios.png")
  ok("sin errores de página",not errs,errs); b.close()
srv.kill(); print("RESULTADO",sum(R),"/",len(R)); sys.exit(0 if all(R) else 1)
