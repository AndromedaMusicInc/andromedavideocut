# 0.0.3 (web): audio en todos los formatos. Lo que Chrome decodifica: forma de onda + búfer en el mezclador;
# lo demás: aviso visible "Audio no compatible en la web … Más formatos en la versión de PC".
from playwright.sync_api import sync_playwright
import subprocess,time,os,sys
D=os.environ.get("MEDIA_DIR","/workspace/avc-testmedia/audios de prueba")
srv=subprocess.Popen(["python3","-m","http.server","18734","-d","preview"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
R=[]
def ok(n,c,d=""): R.append(bool(c)); print("OK   " if c else "FALLA",n,("— "+str(d)) if d!="" else "")
with sync_playwright() as p:
  b=p.chromium.launch(channel=os.environ.get("CH","chrome")); pg=b.new_page(viewport={"width":1440,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
  pg.goto("http://127.0.0.1:18734/index.html"); pg.wait_for_selector("[data-welcome]"); pg.click("[data-quick=importar]"); pg.wait_for_selector("input[type=file]",state="attached")
  for f in sorted(os.listdir(D)):
    n0=len(pg.evaluate("window.__avcAssets()")); pg.evaluate("document.querySelector('[data-import-error-close]')?.click()")
    pg.set_input_files("input[type=file]",os.path.join(D,f)); a=None
    for i in range(60):
      pg.wait_for_timeout(250); l=pg.evaluate("window.__avcAssets()")
      if len(l)>n0 and (l[-1].get("audioOk") or l[-1].get("audioError")) and not pg.evaluate("window.__avcBusy()"): a=l[-1]; break
    err=pg.evaluate("document.querySelector('[data-import-error]')?.textContent||''")
    if a and a.get("audioOk"): st="suena"; good=a["waveform"] and pg.evaluate("id=>window.__avcAudio.has(id)",a["id"])
    else: st="mensaje"; good=("versión de PC" in err) or ("incompleto" in err)
    print(f"      {f:28} {st:8} {err[:110]}"); ok(f"web audio {f}: suena con onda o mensaje claro",good)
  ok("sin errores de página",not errs,errs); b.close()
srv.kill(); print("RESULTADO",sum(R),"/",len(R)); sys.exit(0 if all(R) else 1)
