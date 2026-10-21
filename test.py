import asyncio
from playwright.async_api import async_playwright
U='http://localhost:8099/AndromedaVideoCut/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg=await b.new_page(viewport={'width':1440,'height':900}, accept_downloads=True)
    errs=[];bad=[]
    pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.on('pageerror',lambda e: errs.append('pageerror '+str(e)))
    pg.on('response',lambda r: r.status>=400 and bad.append(f'{r.status} {r.url}'))
    await pg.goto(U); await pg.wait_for_timeout(2500)
    print('titulo:',await pg.title()); print('demo:', await pg.locator('input[aria-label="Nombre del proyecto"]').input_value())
    print('clips Ciudad neón:', await pg.get_by_text('Ciudad neón').count())
    for lab in ['16:9','1:1','4:5','9:16']:
      await pg.locator('header button',has_text=lab).first.click(); await pg.wait_for_timeout(700)
      c=await pg.evaluate("(()=>{const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];return c?[c.width,c.height]:null})()")
      await pg.screenshot(path=f'preview-shots/formato-{lab.replace(":","x")}.png'); print('formato',lab,'canvas',c)
    await pg.locator('button[aria-label="Reproducir"]').click(); await pg.wait_for_timeout(1500)
    print('reproduciendo:', await pg.locator('button[aria-label="Pausar"]').count()>0)
    await pg.screenshot(path='preview-shots/reproduciendo.png')
    await pg.locator('button[aria-label="Pausar"]').click()
    print('localStorage keys:', await pg.evaluate("Object.keys(localStorage)"))
    print('idb:', await pg.evaluate("indexedDB.databases ? indexedDB.databases().then(d=>d.map(x=>x.name)) : null"))
    await pg.locator('header button',has_text='Exportar').click(); await pg.wait_for_timeout(1500)
    await pg.screenshot(path='preview-shots/exportar-1.png')
    print('dialogo:', (await pg.locator('body').inner_text())[:0])
    try:
      async with pg.expect_download(timeout=120000) as d:
        for _ in range(3):
          btn=pg.locator('div[role=dialog] button, .fixed button',has_text='Exportar')
          if await btn.count(): await btn.last.click(); break
          await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(3000); await pg.screenshot(path='preview-shots/exportar-2-progreso.png')
      dl=await d.value; path='preview-shots/'+dl.suggested_filename; await dl.save_as(path); 
      import os; print('descarga:',dl.suggested_filename, os.path.getsize(path))
    except Exception as e: print('export err',e)
    await pg.screenshot(path='preview-shots/exportar-3-final.png')
    await pg.reload(); await pg.wait_for_timeout(2000); print('tras recargar, clips:', await pg.get_by_text('Ciudad neón').count())
    f=await b.new_page(viewport={'width':1100,'height':720}); f.on('pageerror',lambda e: errs.append('iframe '+str(e)))
    await f.goto('http://localhost:8099/iframe.html'); await f.wait_for_timeout(3000); await f.screenshot(path='preview-shots/iframe.png')
    print('errores consola:',errs); print('4xx/5xx:',bad)
    await b.close()
asyncio.run(main())
