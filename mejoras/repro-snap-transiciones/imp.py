import asyncio,json
from playwright.async_api import async_playwright
CL="""[...document.querySelectorAll('[data-clip]')].map(e=>{const r=e.getBoundingClientRect();return [e.dataset.clip.slice(0,6),e.dataset.clipType,e.closest('[data-track]')?.dataset.track,Math.round(r.left),Math.round(r.right),Math.round(r.top)]})"""
async def dragto(pg,loc,x,y):
  bb=await loc.bounding_box(); sx,sy=bb['x']+bb['width']/2,bb['y']+bb['height']/2
  await pg.mouse.move(sx,sy); await pg.mouse.down()
  for i in range(1,21): await pg.mouse.move(sx+(x-sx)*i/20, sy+(y-sy)*i/20)
  await pg.wait_for_timeout(200); await pg.mouse.up(); await pg.wait_for_timeout(800)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900})
    await pg.goto('http://localhost:8123/'); await pg.wait_for_timeout(2000)
    await pg.get_by_text('Nuevo proyecto').first.click(); await pg.wait_for_timeout(2500)
    await pg.get_by_text("Proyecto vacío").click(); await pg.wait_for_timeout(2500); await pg.get_by_text("Medios").first.click(); await pg.wait_for_timeout(500)
    await pg.locator('input[type=file]').first.set_input_files(['red.mp4','blue.mp4']); await pg.wait_for_timeout(5000)
    await pg.screenshot(path='imp1.png')
    print(await pg.evaluate("[...document.querySelectorAll('[draggable],[data-asset],[data-lib-item]')].slice(0,8).map(e=>e.outerHTML.slice(0,160))"))
    items=pg.locator('[data-lib-item^="asset"]:visible, [data-asset]:visible')
    print('items',await items.count(), await pg.evaluate("[...document.querySelectorAll('[data-lib-item]')].map(e=>e.dataset.libItem).slice(0,5)"))
    tl=await pg.locator('[data-timeline]').bounding_box()
    a=pg.locator('[data-lib-item^="asset:"]:visible')
    await dragto(pg,a.nth(0),200,tl['y']+150); print('1',json.dumps(await pg.evaluate(CL)))
    c=await pg.evaluate(CL); right=c[0][4]
    await dragto(pg,a.nth(1),right+60,c[0][5]+15); print('2',json.dumps(await pg.evaluate(CL)))
    await pg.get_by_text('Fundidos').first.click(); await pg.wait_for_timeout(400)
    await dragto(pg,pg.locator('[data-lib-item="transition:wipe"]:visible').first,440,834)
    await pg.mouse.click(150, tl['y']+45); await pg.wait_for_timeout(300)
    await pg.locator('[data-lib-item="transition:slide"]:visible').first.click()
    seq=[]
    for k in range(8):
      await pg.wait_for_timeout(180)
      seq.append(await pg.evaluate("""(()=>{const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];const g=c.getContext('2d');return [...g.getImageData(Math.floor(c.width*.5),Math.floor(c.height/2),1,1).data].slice(0,3).join(',')})()"""))
    print('preview clic (playhead en 0.5s, lejos del corte):', seq)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    print('joins', await pg.evaluate("[...document.querySelectorAll('[data-timeline] button[title]')].map(e=>e.title)"))
    for x in [300,320,330,340,360]:
      await pg.mouse.click(x, tl['y']+45); await pg.wait_for_timeout(700)
      s=await pg.evaluate("""(()=>{const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];const g=c.getContext('2d');const f=(x)=>[...g.getImageData(Math.floor(c.width*x),Math.floor(c.height/2),1,1).data].slice(0,3).join(',');return [f(.1),f(.5),f(.9)]})()""")
      print(x,s)
    await pg.mouse.click(280, tl['y']+45); await pg.wait_for_timeout(700)
    await pg.evaluate("""window.__s=[];(function loop(){const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];const g=c.getContext('2d');const f=(x)=>[...g.getImageData(Math.floor(c.width*x),Math.floor(c.height/2),1,1).data].slice(0,3).join(',');window.__s.push([performance.now()|0,f(.1),f(.5),f(.9)]);if(window.__s.length<200)requestAnimationFrame(loop)})()""")
    await pg.locator('button[aria-label="Reproducir"]').first.click(); await pg.wait_for_timeout(2500)
    s=await pg.evaluate("window.__s"); seen=[]
    for r in s:
      k=tuple(r[1:])
      if not seen or tuple(seen[-1][1:])!=k: seen.append(r)
    print('playback', seen[:12])
    await b.close()
asyncio.run(main())
