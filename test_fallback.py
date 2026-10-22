import asyncio,subprocess
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1366,'height':800},accept_downloads=True)
    await pg.route('**/mediabunny-aac-encoder-*.js', lambda r: r.abort())
    await pg.goto('http://localhost:8099/AndromedaVideoCut/'); await pg.wait_for_timeout(2500)
    await pg.locator('header button',has_text='Exportar').click(); await pg.get_by_role('button',name='720p',exact=True).click()
    await pg.locator('[role=dialog]').get_by_role('button',name='Exportar',exact=True).click()
    await pg.get_by_role('button',name='Descargar').wait_for(timeout=150000)
    print('aviso:',await pg.locator('[role=dialog] p').first.inner_text()); await pg.screenshot(path='preview-shots/qa-fix/export-respaldo-webm.png')
    async with pg.expect_download() as d: await pg.get_by_role('button',name='Descargar').click()
    dl=await d.value; fp='preview-shots/qa-fix/respaldo-'+dl.suggested_filename; await dl.save_as(fp)
    print(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name','-of','compact',fp],capture_output=True,text=True).stdout)
    await b.close()
asyncio.run(main())
