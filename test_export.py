import asyncio,os
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg=await b.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
    errs=[];pg.on('pageerror',lambda e: errs.append(str(e)));pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto('http://localhost:8099/AndromedaVideoCut/'); await pg.wait_for_timeout(2500)
    await pg.locator('header button',has_text='Exportar').click(); await pg.wait_for_timeout(800)
    await pg.get_by_role('button',name='720p',exact=True).click()
    await pg.get_by_role('button',name='Exportar',exact=True).last.click()
    await pg.wait_for_timeout(4000); await pg.screenshot(path='preview-shots/exportar-2-progreso.png')
    print('texto:', (await pg.locator('h2').all_inner_texts()))
    await pg.get_by_role('button',name='Descargar').wait_for(timeout=120000)
    async with pg.expect_download(timeout=30000) as d:
      await pg.get_by_role('button',name='Descargar').click()
    dl=await d.value; fp='preview-shots/'+dl.suggested_filename; await dl.save_as(fp); print('descarga',fp,os.path.getsize(fp))
    await pg.screenshot(path='preview-shots/exportar-3-final.png'); print('h2:',await pg.locator('h2').all_inner_texts()); print('errores',errs)
    await b.close()
asyncio.run(main())
