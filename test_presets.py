import asyncio,subprocess,json,os
from playwright.async_api import async_playwright
S='preview-shots/presets/'
def probe(fp):
  o=json.loads(subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',fp],capture_output=True,text=True).stdout)
  v=[s for s in o['streams'] if s['codec_type']=='video'][0]; a=[s for s in o['streams'] if s['codec_type']=='audio']
  n=subprocess.run(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','csv=p=0',fp],capture_output=True,text=True).stdout.strip()
  return f"{v['codec_name']} {v['width']}x{v['height']} r_frame_rate={v['r_frame_rate']} avg={v['avg_frame_rate']} frames={n} dur={float(o['format']['duration']):.2f}s audio={a[0]['codec_name']+' '+a[0].get('profile','') if a else 'NINGUNO'}"
async def run(pg,preset,fps=None,tag=None):
  await pg.locator('header button',has_text='Exportar').click(); await pg.wait_for_timeout(400)
  await pg.locator(f'[data-preset={preset}]').click()
  if fps: await pg.locator(f'[data-fps="{fps}"]').click()
  summ=await pg.locator('[data-export-summary]').inner_text()
  await pg.screenshot(path=S+f'dialogo-{tag}.png')
  await pg.locator('[role=dialog]').get_by_role('button',name='Exportar',exact=True).click()
  await pg.get_by_role('button',name='Descargar').wait_for(timeout=240000)
  async with pg.expect_download() as d: await pg.get_by_role('button',name='Descargar').click()
  dl=await d.value; fp=S+f'{tag}.'+dl.suggested_filename.split('.')[-1]; await dl.save_as(fp)
  print(f'{tag}: [{summ}] ->',probe(fp),flush=True)
  await pg.get_by_role('button',name='Cerrar').click(); await pg.wait_for_timeout(300)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg=await b.new_page(viewport={'width':1366,'height':800},accept_downloads=True); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto('http://localhost:8099/AndromedaVideoCut/'); await pg.wait_for_timeout(2500)
    await run(pg,'draft',tag='borrador-24fps')
    await run(pg,'reel',tag='reel-30fps')
    await run(pg,'shorts',tag='shorts-60fps')
    await run(pg,'custom',fps=25,tag='personalizado-25fps')
    await pg.reload(); await pg.wait_for_timeout(2000)
    await pg.locator('header button',has_text='Exportar').click(); await pg.wait_for_timeout(400)
    print('tras recargar, preset activo:',await pg.locator('[data-preset][aria-pressed=true]').get_attribute('data-preset'),'|',await pg.locator('[data-export-summary]').inner_text(),'| localStorage:',await pg.evaluate("localStorage.getItem('avc-export-preset')"))
    await pg.screenshot(path=S+'dialogo-recordado.png')
    await pg.locator('[data-preset=yt60]').click(); await pg.screenshot(path=S+'dialogo-youtube60.png'); print('yt60:',await pg.locator('[data-export-summary]').inner_text())
    print('errores:',errs); await b.close()
asyncio.run(main())
