import asyncio, time, http.server, threading, functools, os
from playwright.async_api import async_playwright
URL="https://andromedamusicinc.github.io/andromedavideocut/preview/"
os.makedirs('iframe',exist_ok=True)
open('iframe/index.html','w').write(f'<!doctype html><body style="margin:0"><iframe id=f src="{URL}" style="width:1300px;height:780px;border:0" allow="fullscreen"></iframe></body>')
open('iframe/sin-allow.html','w').write(f'<!doctype html><body style="margin:0"><iframe id=f src="{URL}" style="width:1300px;height:780px;border:0"></iframe></body>')
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory='iframe'))
threading.Thread(target=srv.serve_forever,daemon=True).start()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={'width':1366,'height':800},accept_downloads=True)
    pg=await ctx.new_page(); logs=[]
    pg.on('pageerror',lambda e: logs.append(f'PAGEERROR: {e}'))
    await pg.goto(URL,wait_until='networkidle'); await pg.wait_for_timeout(1500)
    await pg.locator('button',has_text='Exportar').first.click(); await pg.wait_for_timeout(600)
    await pg.get_by_role('button',name='720p').click()
    t=time.time(); await pg.locator('button',has_text='Exportar').last.click()
    await pg.get_by_role('button',name='Descargar').wait_for(timeout=180000)
    print('export listo en',round(time.time()-t,1),'s')
    async with pg.expect_download(timeout=60000) as di:
      await pg.get_by_role('button',name='Descargar').click()
    d=await di.value; await d.save_as('exports/'+d.suggested_filename); print('archivo',d.suggested_filename)
    await pg.close()
    # iframe en otro dominio (127.0.0.1)
    for pagina in ['index.html','sin-allow.html']:
      p2=await ctx.new_page(); l2=[]
      p2.on('console',lambda m: l2.append(f'{m.type}: {m.text}') if m.type=='error' else None)
      await p2.goto('http://127.0.0.1:8765/'+pagina,wait_until='networkidle'); await p2.wait_for_timeout(3000)
      fr=p2.frame_locator('#f')
      try:
        await fr.locator('button[aria-label="Reproducir o pausar"]').wait_for(timeout=15000)
        carga='ok'
      except Exception as e: carga='NO CARGA '+str(e)[:100]
      res={'carga':carga}
      if carga=='ok':
        t0=await fr.locator('text=/^\\d+:\\d\\d\\.\\d$/').first.inner_text()
        await fr.locator('button[aria-label="Reproducir o pausar"]').click(); await p2.wait_for_timeout(1500)
        t1=await fr.locator('text=/^\\d+:\\d\\d\\.\\d$/').first.inner_text(); res['play']=[t0,t1]
        await fr.locator('button[aria-label="Reproducir o pausar"]').click()
        await fr.locator('button',has_text='16:9').first.click(); await p2.wait_for_timeout(500)
        await fr.locator('button[aria-label*="antalla completa"]').first.click(); await p2.wait_for_timeout(800)
        f=p2.frames[1]
        res['fs_dentro']=await f.evaluate("()=>document.fullscreenElement&&document.fullscreenElement.tagName")
        res['fs_enabled']=await f.evaluate("()=>document.fullscreenEnabled")
        await p2.screenshot(path=f'capturas/iframe-{pagina[:-5]}.png')
        # exportar dentro del iframe
        if pagina=='index.html':
          if res['fs_dentro']: await fr.locator('button[aria-label*="antalla completa"]').first.click()
          await fr.locator('button',has_text='Exportar').first.click(); await p2.wait_for_timeout(600)
          await fr.get_by_role('button',name='720p').click(); await fr.locator('button',has_text='Exportar').last.click()
          try:
            await fr.get_by_role('button',name='Descargar').wait_for(timeout=120000)
            async with p2.expect_download(timeout=30000) as di:
              await fr.get_by_role('button',name='Descargar').click()
            res['export_iframe']=(await di.value).suggested_filename
          except Exception as e:
            res['export_iframe']='FALLA '+str(e)[:150]; await p2.screenshot(path='capturas/iframe-export-falla.png')
      res['errores']=l2[:10]; print(pagina,res)
    print(logs)
    await b.close()
asyncio.run(main())
