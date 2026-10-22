import asyncio,os,subprocess,json,sys
from playwright.async_api import async_playwright
U='http://localhost:8099/AndromedaVideoCut/'; S='preview-shots/qa-fix/'
async def export(b,tag):
  pg=await b.new_page(viewport={'width':1366,'height':800},accept_downloads=True)
  await pg.goto(U); await pg.wait_for_timeout(2500)
  await pg.locator('header button',has_text='Exportar').click()
  print(tag,'role=dialog:',await pg.locator('[role=dialog]').count())
  await pg.get_by_role('button',name='720p',exact=True).click()
  await pg.locator('[role=dialog]').get_by_role('button',name='Exportar',exact=True).click()
  await pg.get_by_role('button',name='Descargar').wait_for(timeout=150000)
  note=await pg.locator('[role=dialog] p').first.inner_text(); print(tag,'aviso:',note)
  await pg.screenshot(path=S+f'export-{tag}.png')
  async with pg.expect_download() as d: await pg.get_by_role('button',name='Descargar').click()
  dl=await d.value; fp=S+tag+'-'+dl.suggested_filename; await dl.save_as(fp)
  out=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,profile,codec_tag_string','-show_entries','format=format_name,duration','-of','compact',fp],capture_output=True,text=True).stdout
  print(tag,'archivo',fp,os.path.getsize(fp)); print(out)
  await pg.close()
async def main():
  async with async_playwright() as p:
    chrome=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
    await export(chrome,'chrome')
    shell=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    await export(shell,'chromium-sin-aac')
    b=chrome
    pg=await b.new_page(viewport={'width':1366,'height':800}); errs=[]
    pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(U); await pg.wait_for_timeout(2500)
    print('cabezal inicial:',await pg.locator('section[data-viewer] .tabular-nums').first.inner_text())
    tb=await pg.evaluate("(()=>{const t=document.querySelector('[data-toolbar]');return [...t.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height).reduce((a,b)=>Math.max(a,b),0)+' alto máx, scrollW '+t.scrollWidth+' clientW '+t.clientWidth})()")
    print('toolbar:',tb); await pg.screenshot(path=S+'01-inicio-1366.png')
    # 16:9 coach
    await pg.locator('header button',has_text='16:9').first.click(); await pg.wait_for_timeout(800)
    ov=await pg.evaluate("""(()=>{const c=document.querySelector('[data-coach]');const cv=[...document.querySelectorAll('section[data-viewer] canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0].getBoundingClientRect();if(!c)return 'sin tarjeta abierta';const r=c.getBoundingClientRect();const x=Math.max(0,Math.min(r.right,cv.right)-Math.max(r.left,cv.left)),y=Math.max(0,Math.min(r.bottom,cv.bottom)-Math.max(r.top,cv.top));return 'solape px²='+Math.round(x*y)})()""")
    print('16:9 ayuda:',ov); await pg.screenshot(path=S+'fmt-16x9-ayuda.png')
    await pg.locator('header button',has_text='9:16').first.click(); await pg.wait_for_timeout(500)
    # end of playback
    await pg.locator('button[aria-label="Reproducir"]').click(); await pg.wait_for_timeout(11500)
    br=await pg.evaluate("(()=>{const c=[...document.querySelectorAll('section[data-viewer] canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];const x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=4)s+=(d[i]+d[i+1]+d[i+2])/3;return Math.round(s/(d.length/4))})()")
    print('brillo al final:',br,'| cabezal:',await pg.locator('section[data-viewer] .tabular-nums').first.inner_text()); await pg.screenshot(path=S+'final-reproduccion.png')
    await pg.locator('[data-viewer-fullscreen]').click(); await pg.wait_for_timeout(1000)
    print('fullscreen visor:',await pg.evaluate("document.fullscreenElement&&document.fullscreenElement.dataset.viewer!==undefined")); await pg.screenshot(path=S+'visor-pantalla-completa.png')
    await pg.locator('[data-viewer-fullscreen]').click(); await pg.wait_for_timeout(600)
    await pg.locator('[data-fullscreen-toggle]').click(); await pg.wait_for_timeout(800)
    print('fullscreen app:',await pg.evaluate("document.fullscreenElement===document.documentElement"))
    await pg.locator('[data-fullscreen-toggle]').click(); await pg.wait_for_timeout(500)
    print('errores consola:',errs)
    # iframe de otro origen sin allow
    open('/tmp/gh/x-noallow.html','w').write('<!doctype html><body style="margin:0"><iframe src="http://localhost:8099/AndromedaVideoCut/" style="width:1200px;height:700px;border:0"></iframe></body>')
    pg=await b.new_page(viewport={'width':1200,'height':700}); await pg.goto('http://127.0.0.1:8099/x-noallow.html'); await pg.wait_for_timeout(3000)
    fr=pg.frames[1]; print('iframe fullscreenEnabled:',await fr.evaluate('document.fullscreenEnabled'))
    async with pg.context.expect_page(timeout=5000) as np:
      await pg.frame_locator('iframe').locator('[data-viewer-fullscreen]').click()
    nw=await np.value; await nw.wait_for_load_state(); print('pestaña nueva:',nw.url); await pg.wait_for_timeout(500); await pg.screenshot(path=S+'iframe-sin-permiso-aviso.png')
    for w in (1200,1024):
      open(f'/tmp/gh/x-{w}.html','w').write(f'<!doctype html><body style="margin:0"><iframe src="http://localhost:8099/AndromedaVideoCut/" style="width:{w}px;height:700px;border:0" allow="fullscreen; autoplay; clipboard-write"></iframe></body>')
      pg=await b.new_page(viewport={'width':w,'height':700}); await pg.goto(f'http://127.0.0.1:8099/x-{w}.html'); await pg.wait_for_timeout(3000)
      await pg.screenshot(path=S+f'iframe-{w}x700.png')
      await pg.frame_locator('iframe').locator('header button',has_text='16:9').first.click(); await pg.wait_for_timeout(700); await pg.screenshot(path=S+f'iframe-{w}x700-16x9.png')
    await b.close(); await shell.close()
asyncio.run(main())
