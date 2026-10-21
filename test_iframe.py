import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for w in (1200,1024):
      open(f'/tmp/gh/iframe-{w}.html','w').write(f'<!doctype html><body style="margin:0;background:#222"><iframe src="AndromedaVideoCut/" style="width:{w}px;height:700px;border:0" allow="fullscreen; autoplay; clipboard-write"></iframe></body>')
      pg=await b.new_page(viewport={'width':w,'height':700}); errs=[]
      pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('pageerror',lambda e: errs.append(str(e)))
      await pg.goto(f'http://localhost:8099/iframe-{w}.html'); await pg.wait_for_timeout(3000)
      f=pg.frame_locator('iframe')
      await pg.screenshot(path=f'preview-shots/iframe-{w}x700.png')
      print(w,'chip ayuda:',await f.locator('[data-coach-chip]').count(),'tarjeta:',await f.locator('[data-coach]').count())
      await f.locator('[data-coach-chip]').click(); await pg.wait_for_timeout(400)
      await pg.screenshot(path=f'preview-shots/iframe-{w}x700-ayuda-abierta.png')
      await f.get_by_role('button',name='Ocultar').click()
      await f.locator('[data-fullscreen-toggle]').click(); await pg.wait_for_timeout(1200)
      fr=pg.frames[1]; print(w,'fullscreen:',await fr.evaluate('!!document.fullscreenElement'))
      await pg.screenshot(path=f'preview-shots/iframe-{w}-pantalla-completa.png')
      await f.locator('[data-fullscreen-toggle]').click(); await pg.wait_for_timeout(800)
      print(w,'tras salir:',await fr.evaluate('!!document.fullscreenElement'),'errores:',errs)
    # fallback: iframe sin allow=fullscreen
    open('/tmp/gh/iframe-noallow.html','w').write('<!doctype html><body style="margin:0"><iframe src="AndromedaVideoCut/" style="width:1200px;height:700px;border:0"></iframe></body>')
    pg=await b.new_page(viewport={'width':1200,'height':700}); await pg.goto('http://localhost:8099/iframe-noallow.html'); await pg.wait_for_timeout(2500)
    pops=[]; pg.context.on('page',lambda q: pops.append(q.url))
    await pg.frame_locator('iframe').locator('[data-fullscreen-toggle]').click(); await pg.wait_for_timeout(1500)
    await pg.screenshot(path='preview-shots/iframe-sin-permiso-fallback.png'); print('fallback pestañas nuevas:',pops)
    await b.close()
asyncio.run(main())
