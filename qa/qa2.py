import asyncio, json, time
from playwright.async_api import async_playwright
URL="https://andromedamusicinc.github.io/andromedavideocut/preview/"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={'width':1366,'height':800},accept_downloads=True)
    pg=await ctx.new_page(); logs=[]
    pg.on('console',lambda m: logs.append(f'{m.type}: {m.text}') if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: logs.append(f'PAGEERROR: {e}'))
    await pg.goto(URL,wait_until='networkidle'); await pg.wait_for_timeout(1500)
    # frame negro al final? pixeles del canvas
    px="""()=>{const c=[...document.querySelectorAll('canvas')].find(c=>c.getBoundingClientRect().width>100);const x=document.createElement('canvas');x.width=c.width;x.height=c.height;const g=x.getContext('2d');g.drawImage(c,0,0);const d=g.getImageData(0,0,x.width,x.height).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return Math.round(s/(d.length/4))}"""
    print('brillo inicio',await pg.evaluate(px))
    # mover al final con End o click en timeline
    await pg.locator('button[aria-label="Reproducir o pausar"]').click(); await pg.wait_for_timeout(11000)
    print('tiempo',await pg.locator('text=/^\\d+:\\d\\d\\.\\d$/').first.inner_text(),'brillo final',await pg.evaluate(px))
    # fullscreen toggle de nuevo
    fs=pg.locator('button[aria-label*="antalla completa"]')
    await fs.click(); await pg.wait_for_timeout(600); a=await pg.evaluate("()=>document.fullscreenElement&&document.fullscreenElement.tagName")
    print('label en fs',await fs.first.get_attribute('aria-label'))
    await fs.first.click(); await pg.wait_for_timeout(600); bb=await pg.evaluate("()=>document.fullscreenElement&&document.fullscreenElement.tagName")
    print('fs on',a,'fs segundo click',bb)
    # exportar 720p
    await pg.locator('button',has_text='Exportar').first.click(); await pg.wait_for_timeout(800)
    dlg=pg.locator('[role=dialog]').first
    print('role dialog?',await pg.locator('[role=dialog]').count())
    await pg.get_by_role('button',name='720p').click()
    await pg.screenshot(path='capturas/exportar-720.png')
    t=time.time()
    async with pg.expect_download(timeout=240000) as di:
      await pg.locator('button',has_text='Exportar').last.click()
      for i in range(6):
        await pg.wait_for_timeout(3000); await pg.screenshot(path=f'capturas/exportando-{i}.png')
    d=await di.value
    path='exports/'+d.suggested_filename; await d.save_as(path)
    print('descarga',path,round(time.time()-t,1),'s')
    print('\n'.join(logs[:40]))
    await b.close()
import os; os.makedirs('exports',exist_ok=True)
asyncio.run(main())
