import asyncio, json, os, http.server, threading, functools
from playwright.async_api import async_playwright
URL="https://andromedamusicinc.github.io/andromedavideocut/preview/"
R={}
async def tiempo(pg):
  return (await pg.locator('text=/^\\d+:\\d\\d\\.\\d$/').first.inner_text())
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx=await b.new_context(viewport={'width':1366,'height':800},accept_downloads=True)
    pg=await ctx.new_page()
    logs=[]
    pg.on('console',lambda m: logs.append(f'{m.type}: {m.text}') if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.on('requestfailed',lambda r: logs.append(f'REQFAIL: {r.url} {r.failure}'))
    await pg.goto(URL,wait_until='networkidle'); await pg.wait_for_timeout(1500)
    R['tiempo_inicial']=await tiempo(pg)
    # formatos
    for f in ['16:9','1:1','4:5','9:16']:
      await pg.locator('header button, button').filter(has_text=f).first.click()
      await pg.wait_for_timeout(800)
      cv=await pg.evaluate("""()=>[...document.querySelectorAll('canvas,video')].map(c=>{const r=c.getBoundingClientRect();return {tag:c.tagName,w:c.width||c.videoWidth,h:c.height||c.videoHeight,cw:Math.round(r.width),ch:Math.round(r.height)}}).filter(x=>x.cw>50)""")
      sel=await pg.eval_on_selector('select[aria-label="Relación de aspecto"]','s=>s.value')
      R['fmt_'+f]={'canvas':cv,'select':sel}
      await pg.screenshot(path=f'capturas/fmt-{f.replace(":","x")}.png')
    # play/pausa
    play=pg.locator('button[aria-label="Reproducir o pausar"]')
    t0=await tiempo(pg); await play.click(); await pg.wait_for_timeout(2000); t1=await tiempo(pg)
    await play.click(); await pg.wait_for_timeout(1000); t2=await tiempo(pg); await pg.wait_for_timeout(1000); t3=await tiempo(pg)
    R['play_boton']=[t0,t1,t2,t3]
    await pg.locator('body').click(position={'x':5,'y':790}) if False else None
    # espacio
    await pg.locator('button[aria-label="Ir al inicio"]').click(); await pg.wait_for_timeout(300)
    s0=await tiempo(pg); await pg.keyboard.press('Space'); await pg.wait_for_timeout(1500); s1=await tiempo(pg); await pg.keyboard.press('Space'); await pg.wait_for_timeout(800); s2=await tiempo(pg); await pg.wait_for_timeout(800); s3=await tiempo(pg)
    R['play_espacio']=[s0,s1,s2,s3]
    # play hasta el final
    await pg.locator('button[aria-label="Ir al inicio"]').click(); await play.click(); await pg.wait_for_timeout(12000)
    R['al_final']=await tiempo(pg); await pg.screenshot(path='capturas/final-reproduccion.png')
    # pantalla completa
    await pg.locator('button[aria-label="Pantalla completa"]').click(); await pg.wait_for_timeout(1000)
    R['fullscreen_el']=await pg.evaluate("()=>document.fullscreenElement?document.fullscreenElement.tagName+'.'+document.fullscreenElement.className:null")
    await pg.screenshot(path='capturas/pantalla-completa.png')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(800)
    R['fullscreen_tras_esc']=await pg.evaluate("()=>!!document.fullscreenElement")
    # exportar
    await pg.locator('button',has_text='Exportar').first.click(); await pg.wait_for_timeout(1200)
    await pg.screenshot(path='capturas/exportar-dialogo.png')
    R['export_dialogo']=await pg.evaluate("()=>{const d=document.querySelector('[role=dialog]')||document.body;return d.innerText.slice(0,1500)}")
    print(json.dumps(R,ensure_ascii=False,indent=1)); print('\n'.join(logs[:40]))
    await ctx.storage_state(path='estado.json')
    await b.close()
asyncio.run(main())
